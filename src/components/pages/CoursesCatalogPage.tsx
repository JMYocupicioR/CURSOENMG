import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Lock,
  Check,
  ArrowRight,
  BookOpen,
  Clock,
  Sparkles,
  UserCheck,
  Calendar,
  FileText,
  Download,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { useSyllabusCatalog } from '../../hooks/useSyllabusCatalog';
import { previousSellableCourseId, recommendedNextCourse, sellableCourses } from '../../content/courseCatalog';
import CourseEnrollmentRequestModal from '../course/CourseEnrollmentRequestModal';
import type { Course } from '../../types/database';

export default function CoursesCatalogPage() {
  const { isEnrolledInCourse, isCoursePending, courseIds, user } = useAuth();
  const { grouped, courses, reload } = useSyllabusCatalog();
  const sellable = sellableCourses(courses);
  const nextSuggested = recommendedNextCourse(courseIds, courses);
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<Course | null>(null);

  return (
    <main id="contenido-principal" className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400 mb-2">
          Oferta académica
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
          {sellable.length === 1 ? 'Un curso independiente' : `${sellable.length} cursos independientes`}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Cada curso opera como una suscripción individual sujeta a revisión y admisión por el profesor titular.
          Al solicitar un curso ingresarás a la lista de espera oficial para ser admitido.
        </p>
      </div>

      {nextSuggested && user && (
        <div className="mb-8 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30 text-sm text-blue-900 dark:text-blue-100 flex items-center gap-3 shadow-2xs">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-cyan-400 shrink-0" />
          <div>
            Siguiente curso sugerido pedagógicamente:{' '}
            <strong>{grouped.find((g) => g.course.id === nextSuggested)?.course.title ?? nextSuggested}</strong>
          </div>
        </div>
      )}

      <div className={`grid gap-6 mb-12 ${sellable.length >= 3 ? 'md:grid-cols-3' : sellable.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-xl mx-auto'}`}>
        {grouped
          .filter((g) => g.course.is_sellable && g.course.is_active)
          .map(({ course, modules }) => {
            const owned = isEnrolledInCourse(course.id);
            const isPending = isCoursePending(course.id);
            const prevId = previousSellableCourseId(course.id, courses);

            return (
              <article
                key={course.id}
                className="flex flex-col p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <GraduationCap className="w-8 h-8 text-blue-600 dark:text-cyan-400" />
                  {owned ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Activo
                    </span>
                  ) : isPending ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full animate-pulse">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> En lista de espera
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                      <Lock className="w-3 h-3 text-slate-500" /> Requiere admisión
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">{course.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 flex-1">{course.description}</p>

                {/* Docente Titular */}
                {(course.instructor_name || course.instructor_title) && (
                  <div className="mb-3 py-2 px-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                    <UserCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white">{course.instructor_name || 'Profesor Titular'}</span>
                      {course.instructor_title && (
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px] truncate">{course.instructor_title}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Horario en vivo */}
                {course.live_schedule_notes && (
                  <div className="mb-3 py-2 px-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 flex items-center gap-2.5 text-xs text-purple-900 dark:text-purple-200">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold text-purple-900 dark:text-purple-200 block text-[11px]">Sesiones en vivo:</span>
                      <span className="text-slate-700 dark:text-slate-300 text-xs">{course.live_schedule_notes}</span>
                    </div>
                  </div>
                )}

                {/* Dynamic Price Display */}
                <div className="mb-3 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Inversión del curso:</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-cyan-300">
                    {course.price_display || 'Consultar'}
                  </span>
                </div>

                {/* Descarga Brochure Oficial si existe */}
                {course.syllabus_brochure_url && (
                  <a
                    href={course.syllabus_brochure_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-800 dark:text-rose-300 transition mb-3"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">Descargar Temario Oficial (PDF)</span>
                    <Download className="w-3 h-3 ml-auto opacity-70" />
                  </a>
                )}

                {/* Enlace rápido al temario filtrado */}
                <Link
                  to={`/temario?curso=${course.id}`}
                  className="text-xs font-medium text-blue-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 mb-4"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ver desglose de módulos ({modules.length})</span>
                </Link>

                {prevId && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Recomendación: cursar antes {grouped.find((g) => g.course.id === prevId)?.course.title}.
                  </p>
                )}

                <ul className="space-y-1.5 mb-6">
                  {modules.map((mod) => (
                    <li key={mod.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>
                        {mod.emoji} {mod.title}
                      </span>
                    </li>
                  ))}
                </ul>

                {owned ? (
                  <Link
                    to={`/portal/curso/${course.id}`}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                  >
                    <span>Ir al curso</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : isPending ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCourseForModal(course)}
                      className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition shadow-sm"
                    >
                      <Clock className="w-4 h-4" />
                      <span>En lista de espera (Ver estado)</span>
                    </button>
                    <p className="text-[11px] text-center text-amber-700 dark:text-amber-300">
                      Tu solicitud está registrada. El profesor te admitirá en breve.
                    </p>
                  </div>
                ) : user ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCourseForModal(course)}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md shadow-blue-600/20"
                  >
                    <span>Solicitar admisión / Entrar a lista de espera</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    to={`/auth/login?redirect=${encodeURIComponent('/cursos')}`}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md shadow-blue-600/20"
                  >
                    <span>Iniciar sesión para solicitar</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </article>
            );
          })}
      </div>

      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
        <h2 className="font-bold text-slate-900 dark:text-white mb-2 inline-flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600 dark:text-cyan-400" /> Referencia compartida
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Las tablas de referencia rápida y la bibliografía se desbloquean con cualquier curso activo.
        </p>
      </div>

      {/* Modal de Solicitud de Admisión */}
      {selectedCourseForModal && (
        <CourseEnrollmentRequestModal
          course={selectedCourseForModal}
          isOpen={Boolean(selectedCourseForModal)}
          onClose={() => setSelectedCourseForModal(null)}
          onSuccess={async () => {
            await reload();
          }}
        />
      )}
    </main>
  );
}
