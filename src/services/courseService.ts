import { supabase, sb } from '../lib/supabase';
import { DEFAULT_COURSES, DEFAULT_COURSE_MODULES, isCourseId } from '../content/courseCatalog';
import {
  rejectPhysicianEnrollment,
  revokePhysicianEnrollment,
  verifyPhysicianEnrollment,
} from './editorialService';
import type {
  ModuleAccess,
  LiveWorkshop,
  WorkshopStatus,
  WorkshopRegistration,
  AccessTier,
  Course,
  CourseId,
  CourseModuleRow,
  CourseEnrollment,
  CourseEnrollmentStatus,
  CourseWaitlistRow,
  SyllabusTopicOverride,
} from '../types/database';

// ─── Module Access ──────────────────────────────────────────────────────────

export async function getModuleAccessMap(): Promise<Map<string, ModuleAccess>> {
  const { data, error } = await supabase
    .from('module_access')
    .select('*');
  if (error) throw error;
  const map = new Map<string, ModuleAccess>();
  for (const row of (data ?? []) as ModuleAccess[]) {
    map.set(row.module_id, row);
  }
  return map;
}

export async function setModuleAccess(
  moduleId: string,
  tier: AccessTier,
  previewTopicIds: string[] = []
) {
  const { error } = await supabase
    .from('module_access')
    .upsert(
      {
        module_id: moduleId,
        required_tier: tier,
        preview_topic_ids: previewTopicIds,
      },
      { onConflict: 'module_id' }
    );
  if (error) throw error;
}

// ─── Live Workshops ─────────────────────────────────────────────────────────

export async function getWorkshops(options?: {
  moduleId?: string;
  status?: WorkshopStatus[];
  limit?: number;
}): Promise<LiveWorkshop[]> {
  let query = supabase
    .from('live_workshops')
    .select('*')
    .order('scheduled_at', { ascending: false });

  if (options?.moduleId) {
    query = query.eq('module_id', options.moduleId);
  }
  if (options?.status?.length) {
    query = query.in('status', options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LiveWorkshop[];
}

export interface LiveSessionUrgency {
  isUrgent: boolean;
  isLiveNow: boolean;
  startsInMinutes: number | null;
  workshop: LiveWorkshop | null;
}

export function getLiveSessionUrgency(
  workshops: LiveWorkshop[],
  thresholdMinutes = 30,
  nowDate = new Date()
): LiveSessionUrgency {
  if (!Array.isArray(workshops) || workshops.length === 0) {
    return { isUrgent: false, isLiveNow: false, startsInMinutes: null, workshop: null };
  }

  const nowMs = nowDate.getTime();

  // 1. Revisar si hay alguna sesión con estado explícito 'live'
  const liveWorkshop = workshops.find((w) => w.status === 'live');
  if (liveWorkshop) {
    return {
      isUrgent: true,
      isLiveNow: true,
      startsInMinutes: 0,
      workshop: liveWorkshop,
    };
  }

  // 2. Revisar si hay alguna sesión programada en curso o que empiece dentro del umbral
  for (const w of workshops) {
    if (w.status !== 'scheduled') continue;
    const startMs = new Date(w.scheduled_at).getTime();
    if (Number.isNaN(startMs)) continue;

    const diffMinutes = Math.round((startMs - nowMs) / 60000);
    const durationMin = w.duration_minutes || 90;

    // Si empezó hace poco y aún está dentro de su ventana de duración
    if (diffMinutes <= 0 && diffMinutes >= -durationMin) {
      return {
        isUrgent: true,
        isLiveNow: true,
        startsInMinutes: diffMinutes,
        workshop: w,
      };
    }

    // Si empieza dentro de los próximos thresholdMinutes (ej. 30 min)
    if (diffMinutes > 0 && diffMinutes <= thresholdMinutes) {
      return {
        isUrgent: true,
        isLiveNow: false,
        startsInMinutes: diffMinutes,
        workshop: w,
      };
    }
  }

  return { isUrgent: false, isLiveNow: false, startsInMinutes: null, workshop: null };
}

export async function getUpcomingWorkshops(limit = 5): Promise<LiveWorkshop[]> {
  // Ventana de 3 horas hacia atrás para no excluir clases en curso iniciadas recientemente
  const windowStart = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('live_workshops')
    .select('*')
    .in('status', ['scheduled', 'live'])
    .gte('scheduled_at', windowStart)
    .order('scheduled_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LiveWorkshop[];
}

export async function getWorkshopById(id: string): Promise<LiveWorkshop | null> {
  const { data, error } = await supabase
    .from('live_workshops')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as LiveWorkshop | null) ?? null;
}

export async function createWorkshop(
  workshop: Omit<LiveWorkshop, 'id' | 'created_at' | 'updated_at'>
): Promise<LiveWorkshop> {
  if (!workshop.created_by) {
    throw new Error('Debes iniciar sesión para programar una clase.');
  }
  const { data, error } = await supabase
    .from('live_workshops')
    .insert(workshop as any)
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'No se pudo programar la clase en vivo.');
  return data as LiveWorkshop;
}

export async function updateWorkshop(
  id: string,
  updates: Partial<LiveWorkshop>
): Promise<LiveWorkshop> {
  const { data, error } = await supabase
    .from('live_workshops')
    .update(updates as any)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'No se pudo actualizar la clase.');
  return data as LiveWorkshop;
}

export async function setWorkshopAttendanceClosed(
  id: string,
  closed: boolean
): Promise<LiveWorkshop> {
  return updateWorkshop(id, { attendance_closed: closed });
}

export async function deleteWorkshop(id: string): Promise<void> {
  // 1. Intentar primero con la función RPC que limpia en cascada y garantiza permisos
  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('admin_delete_live_workshop', {
    p_workshop_id: id,
  });

  if (!rpcError && (rpcData as any)?.success) {
    return;
  }

  // 2. Si la RPC falló o no estaba disponible, intentar eliminación directa
  const { error } = await supabase
    .from('live_workshops')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message || rpcError?.message || 'No se pudo eliminar la clase.');
  }
}


// ─── Workshop Registrations ─────────────────────────────────────────────────

export async function registerForWorkshop(workshopId: string, userId: string) {
  const { error } = await supabase
    .from('workshop_registrations')
    .insert({ workshop_id: workshopId, user_id: userId } as any);
  if (error) throw error;
}

export async function getWorkshopRegistrations(workshopId: string): Promise<WorkshopRegistration[]> {
  const { data, error } = await supabase
    .from('workshop_registrations')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('registered_at');
  if (error) throw error;
  return (data ?? []) as WorkshopRegistration[];
}

export async function getMyRegistrations(userId: string): Promise<WorkshopRegistration[]> {
  const { data, error } = await supabase
    .from('workshop_registrations')
    .select('*')
    .eq('user_id', userId)
    .order('registered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkshopRegistration[];
}

export async function markAttendance(workshopId: string, userId: string, attended: boolean) {
  const { error } = await supabase
    .from('workshop_registrations')
    .update({ attended })
    .eq('workshop_id', workshopId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ─── Courses / syllabus ─────────────────────────────────────────────────────

export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.warn('[courseService] getCourses fallback:', error.message);
    return DEFAULT_COURSES;
  }
  return ((data ?? []) as Course[]).length ? (data as Course[]) : DEFAULT_COURSES;
}

export async function getCourseModules(): Promise<CourseModuleRow[]> {
  const { data, error } = await supabase
    .from('course_modules')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.warn('[courseService] getCourseModules fallback:', error.message);
    return DEFAULT_COURSE_MODULES;
  }
  return ((data ?? []) as CourseModuleRow[]).length ? (data as CourseModuleRow[]) : DEFAULT_COURSE_MODULES;
}

export async function getSyllabusTopicOverrides(): Promise<SyllabusTopicOverride[]> {
  const { data, error } = await supabase.from('syllabus_topic_overrides').select('*');
  if (error) {
    console.warn('[courseService] getSyllabusTopicOverrides:', error.message);
    return [];
  }
  return (data ?? []) as SyllabusTopicOverride[];
}

export async function getSyllabusCatalog(): Promise<{
  courses: Course[];
  assignments: CourseModuleRow[];
  overrides: SyllabusTopicOverride[];
}> {
  const [courses, assignments, overrides] = await Promise.all([
    getCourses(),
    getCourseModules(),
    getSyllabusTopicOverrides(),
  ]);
  return { courses, assignments, overrides };
}

export async function createCourse(input: {
  id: CourseId;
  title: string;
  description?: string;
  price_display?: string | null;
  is_active?: boolean;
  is_sellable?: boolean;
  sort_order?: number;
}): Promise<Course> {
  const id = input.id.trim().toLowerCase();
  const title = input.title.trim();
  if (!isCourseId(id)) {
    throw new Error('El identificador debe tener 2–64 caracteres: minúsculas, números y guiones.');
  }
  if (!title) throw new Error('El título del curso es obligatorio.');

  const row = {
    id,
    title,
    description: input.description?.trim() ?? '',
    price_display: input.is_sellable === false ? null : (input.price_display?.trim() || 'Consultar'),
    is_active: input.is_active ?? true,
    is_sellable: input.is_sellable ?? true,
    sort_order: input.sort_order ?? 0,
  };

  const { data, error } = await sb.from('courses').insert(row as any).select('*').single();
  if (error) {
    if (error.code === '23505') throw new Error('Ya existe un curso con ese identificador.');
    throw new Error(error.message || 'No se pudo crear el curso.');
  }
  return data as Course;
}

export async function updateCourseMetadata(
  courseId: CourseId,
  updates: Partial<Omit<Course, 'id' | 'updated_at' | 'updated_by'>>
): Promise<void> {
  const { error } = await sb.from('courses').update(updates as any).eq('id', courseId);
  if (error) throw error;
}

/**
 * Elimina un curso de forma segura desvinculando constancias y
 * liberando sus módulos a la sección 'Sin asignar'.
 */
export async function deleteCourse(courseId: CourseId): Promise<void> {
  // 1. Intentar llamar a la función RPC admin_delete_course si está desplegada
  try {
    const { error: rpcError } = await (sb.rpc as any)('admin_delete_course', {
      p_course_id: courseId,
    });
    if (!rpcError) return;
    console.warn('[courseService] admin_delete_course RPC fallo o no existe, usando fallback directo:', rpcError.message);
  } catch (err) {
    console.warn('[courseService] admin_delete_course RPC error:', err);
  }

  // 2. Fallback resiliente mediante operaciones directas en Supabase
  try {
    await (sb.from('academic_certificates') as any).update({ course_id: null }).eq('course_id', courseId);
  } catch {
    // Si no existen certificados asociados o no está la columna, continuar
  }

  // Desasignar módulos del curso para que pasen a "Sin asignar"
  const { error: modError } = await sb.from('course_modules').delete().eq('course_id', courseId);
  if (modError) {
    console.warn('[courseService] deleteCourse unassign modules warning:', modError.message);
  }

  // Eliminar inscripciones del curso
  const { error: enrError } = await sb.from('course_enrollments').delete().eq('course_id', courseId);
  if (enrError) {
    console.warn('[courseService] deleteCourse enrollments warning:', enrError.message);
  }

  // Eliminar el registro del curso de la tabla courses
  const { error } = await sb.from('courses').delete().eq('id', courseId);
  if (error) throw error;
}

export async function assignModuleToCourse(
  moduleId: string,
  courseId: CourseId | null,
  sortOrder = 0,
  isVisible = true
): Promise<void> {
  if (!courseId) {
    const { error } = await sb.from('course_modules').delete().eq('module_id', moduleId);
    if (error) throw error;
    return;
  }
  const { error } = await sb.from('course_modules').upsert(
    {
      module_id: moduleId,
      course_id: courseId,
      sort_order: sortOrder,
      is_visible: isVisible,
    },
    { onConflict: 'module_id' }
  );
  if (error) throw error;
}

export async function setCourseModuleVisible(moduleId: string, isVisible: boolean): Promise<void> {
  const { error } = await sb.from('course_modules').update({ is_visible: isVisible }).eq('module_id', moduleId);
  if (error) throw error;
}

/** Reordena los módulos de un curso en una sola transacción (RPC atómica). */
export async function reorderCourseModules(courseId: CourseId, moduleIds: string[]): Promise<void> {
  const { error } = await sb.rpc('reorder_course_modules', {
    p_course_id: courseId,
    p_module_ids: moduleIds,
  });
  if (error) throw error;
}

export interface SyllabusTopicOverrideInput {
  topic_id: string;
  sort_order: number;
  is_visible: boolean;
}

/** Upsert atómico (una transacción) de los overrides de temas de un módulo. */
export async function setSyllabusTopicOverrides(
  moduleId: string,
  overrides: SyllabusTopicOverrideInput[]
): Promise<void> {
  if (!overrides.length) return;
  const { error } = await sb.rpc('set_syllabus_topic_overrides', {
    p_module_id: moduleId,
    p_overrides: overrides,
  });
  if (error) throw error;
}

export async function getMyCourseEnrollments(status?: CourseEnrollmentStatus | 'all'): Promise<CourseEnrollment[]> {
  let query = supabase
    .from('course_enrollments')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CourseEnrollment[];
}

export async function requestCourseEnrollment(
  courseId: CourseId,
  options?: { notes?: string; paymentReference?: string }
): Promise<CourseEnrollment> {
  const { data, error } = await (sb.rpc as any)('request_course_enrollment', {
    p_course_id: courseId,
    p_notes: options?.notes?.trim() || null,
    p_payment_reference: options?.paymentReference?.trim() || null,
  });
  if (error) throw error;
  return data as CourseEnrollment;
}

export async function cancelCourseEnrollmentRequest(courseId: CourseId): Promise<void> {
  const { error } = await (sb.rpc as any)('cancel_course_enrollment_request', {
    p_course_id: courseId,
  });
  if (error) throw error;
}

async function upsertActiveCourseEnrollment(
  userId: string,
  courseId: CourseId,
  options?: {
    method?: string;
    reference?: string | null;
    notes?: string | null;
    expiresAt?: string | null;
    reviewed?: boolean;
  }
): Promise<CourseEnrollment> {
  const { data: sessionData } = await supabase.auth.getUser();
  const adminId = sessionData.user?.id ?? null;
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    user_id: userId,
    course_id: courseId,
    status: 'active',
    granted_by: adminId,
    granted_at: now,
    payment_method: options?.method ?? 'manual',
    payment_reference: options?.reference?.trim() || null,
    notes: options?.notes?.trim() || null,
    expires_at: options?.expiresAt ?? null,
    updated_at: now,
  };
  if (options?.reviewed) {
    payload.reviewed_by = adminId;
    payload.reviewed_at = now;
  }

  const { data, error } = await sb
    .from('course_enrollments')
    .upsert(payload, { onConflict: 'user_id,course_id' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as CourseEnrollment;
}

function hasOpenCourseEnrollment(rows: CourseEnrollment[]): boolean {
  return rows.some(
    (row) => row.course_id !== 'referencia' && (row.status === 'active' || row.status === 'pending')
  );
}

/** Abre el curso y el candado del perfil. Las dos pantallas de admisión usan esta misma operación. */
export async function adminAdmitStudentAndApproveProfile(
  userId: string,
  courseId: CourseId,
  options?: { notes?: string; method?: string; reference?: string; expiresAt?: string | null }
): Promise<CourseEnrollment> {
  const enrollment = await adminAdmitStudentToCourse(userId, courseId, options);
  await verifyPhysicianEnrollment(userId);
  return enrollment;
}

/** Otorga un curso fuera de la cola y deja el perfil aprobado, igual que una admisión. */
export async function grantCourseAccessAndApproveProfile(
  userId: string,
  courseId: CourseId,
  options?: { method?: string; reference?: string; notes?: string; expiresAt?: string | null }
): Promise<void> {
  await grantCourseAccess(userId, courseId, options);
  await verifyPhysicianEnrollment(userId);
}

export async function adminRejectCourseRequestAndSyncProfile(
  userId: string,
  courseId: CourseId,
  reason?: string
): Promise<void> {
  await adminRejectCourseRequest(userId, courseId, reason);
  const rows = await getCourseEnrollmentsForUsers([userId]);
  if (!hasOpenCourseEnrollment(rows)) {
    await rejectPhysicianEnrollment(userId, reason);
  }
}

export async function revokeCourseAccessAndSyncProfile(userId: string, courseId: CourseId): Promise<void> {
  await revokeCourseAccess(userId, courseId);
  const rows = await getCourseEnrollmentsForUsers([userId]);
  if (!hasOpenCourseEnrollment(rows)) {
    await revokePhysicianEnrollment(userId);
  }
}

export async function adminAdmitStudentToCourse(
  userId: string,
  courseId: CourseId,
  options?: { notes?: string; method?: string; reference?: string; expiresAt?: string | null }
): Promise<CourseEnrollment> {
  const { data, error } = await (sb.rpc as any)('admin_admit_student_to_course', {
    p_user_id: userId,
    p_course_id: courseId,
    p_notes: options?.notes?.trim() || null,
    p_payment_method: options?.method ?? 'manual',
    p_payment_reference: options?.reference?.trim() || null,
    p_expires_at: options?.expiresAt ?? null,
  });
  if (!error) return data as CourseEnrollment;

  // grant/admit RPCs still insert the deleted 'referencia' course → FK 409.
  return upsertActiveCourseEnrollment(userId, courseId, {
    method: options?.method,
    reference: options?.reference,
    notes: options?.notes,
    expiresAt: options?.expiresAt,
    reviewed: true,
  });
}

export async function adminRejectCourseRequest(
  userId: string,
  courseId: CourseId,
  reason?: string
): Promise<void> {
  const { error } = await (sb.rpc as any)('admin_reject_course_request', {
    p_user_id: userId,
    p_course_id: courseId,
    p_reason: reason?.trim() || null,
  });
  if (error) throw error;
}

export async function getAdminCourseWaitlist(
  courseId?: CourseId | null,
  status?: CourseEnrollmentStatus | 'all'
): Promise<CourseWaitlistRow[]> {
  const { data, error } = await (sb.rpc as any)('admin_get_course_waitlist', {
    p_course_id: courseId ?? null,
    p_status: status ?? 'pending',
  });
  if (error) throw error;
  return (data ?? []) as CourseWaitlistRow[];
}

export async function adminUpdateCoursePrice(courseId: CourseId, priceDisplay: string): Promise<void> {
  const { error } = await (sb.rpc as any)('admin_update_course_price', {
    p_course_id: courseId,
    p_price_display: priceDisplay.trim(),
  });
  if (error) throw error;
}

export async function getCourseEnrollmentsForUsers(userIds: string[]): Promise<CourseEnrollment[]> {
  if (!userIds.length) return [];
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('*')
    .in('user_id', userIds);
  if (error) throw error;
  return (data ?? []) as CourseEnrollment[];
}

export async function grantCourseAccess(
  userId: string,
  courseId: CourseId,
  options?: { method?: string; reference?: string; notes?: string; expiresAt?: string | null }
): Promise<void> {
  const { error } = await sb.rpc('grant_course_access', {
    target_user_id: userId,
    p_course_id: courseId,
    p_method: options?.method ?? 'manual',
    p_reference: options?.reference ?? null,
    p_notes: options?.notes ?? null,
    p_expires_at: options?.expiresAt ?? null,
  });
  if (!error) return;

  await upsertActiveCourseEnrollment(userId, courseId, {
    method: options?.method,
    reference: options?.reference,
    notes: options?.notes,
    expiresAt: options?.expiresAt,
  });
}

export async function revokeCourseAccess(userId: string, courseId: CourseId): Promise<void> {
  const { error } = await sb.rpc('revoke_course_access', {
    target_user_id: userId,
    p_course_id: courseId,
  });
  if (error) throw error;
}
