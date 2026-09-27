import { supabase } from '../lib/supabase';
import {
  assignmentMaterialExtension,
  assignmentMaterialFileError,
  type AssignmentMaterial,
} from '../utils/assignmentMaterials';

export const ASSIGNMENT_MATERIALS_BUCKET = 'assignment-materials';

export async function uploadAssignmentMaterialFile(userId: string, file: File): Promise<AssignmentMaterial> {
  const validation = assignmentMaterialFileError(file);
  if (validation) throw new Error(validation);

  const ext = assignmentMaterialExtension(file.name) || 'bin';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const contentType = file.type || 'application/octet-stream';
  const { error } = await supabase.storage.from(ASSIGNMENT_MATERIALS_BUCKET).upload(path, file, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('bucket not found') || msg.includes('not found')) {
      throw new Error(
        'El almacenamiento de material de tareas aún no está activo. Aplica la migración 20260927053609_assignment_teacher_materials.'
      );
    }
    if (msg.includes('row-level security') || msg.includes('not authorized') || msg.includes('403')) {
      throw new Error('Solo el personal docente verificado puede adjuntar archivos a una tarea.');
    }
    if (msg.includes('payload too large') || msg.includes('exceeded') || msg.includes('file size')) {
      throw new Error(
        'El archivo supera el límite del proyecto. En el plan gratuito de Supabase el máximo es 50 MB por archivo.'
      );
    }
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(ASSIGNMENT_MATERIALS_BUCKET).getPublicUrl(path);
  return {
    kind: 'file',
    url: data.publicUrl,
    label: file.name,
    file_name: file.name,
    mime_type: contentType,
    byte_size: file.size,
    storage_path: path,
  };
}

export async function removeAssignmentMaterialFiles(paths: string[]): Promise<void> {
  const names = paths.filter((path) => path && !path.includes('..'));
  if (names.length === 0) return;
  await supabase.storage.from(ASSIGNMENT_MATERIALS_BUCKET).remove(names);
}
