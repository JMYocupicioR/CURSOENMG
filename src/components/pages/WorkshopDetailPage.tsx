import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Video, Calendar, Clock, CheckCircle, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthProvider';
import { useCourseStore } from '../../stores/courseStore';
import { BackButton } from '../common/BackButton';
import type { LiveWorkshop } from '../../types/database';

export default function WorkshopDetailPage() {
  const { workshopId } = useParams();
  const { user, isEnrolledPhysician } = useAuth();
  const { upcomingWorkshops, load: loadCourse } = useCourseStore();
  const [workshop, setWorkshop] = useState<LiveWorkshop | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loadingReg, setLoadingReg] = useState(false);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    if (!workshopId) return;
    const found = upcomingWorkshops.find(w => w.id === workshopId);
    if (found) {
      setWorkshop(found);
    } else {
      // Fallback to fetch if not in upcoming
      const fetchWorkshop = async () => {
        try {
          const { data, error } = await supabase.from('live_workshops').select('*').eq('id', workshopId).single();
          if (error) throw error;
          if (data) setWorkshop(data as unknown as LiveWorkshop);
        } catch (e) {
          console.error(e);
        }
      };
      fetchWorkshop();
    }
  }, [workshopId, upcomingWorkshops]);

  useEffect(() => {
    if (!workshopId || !user) return;
    supabase.from('workshop_registrations')
      .select('id')
      .eq('workshop_id', workshopId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsRegistered(!!data));
  }, [workshopId, user]);

  if (!workshop) {
    return <div className="pt-32 text-center">Cargando taller...</div>;
  }

  const date = new Date(workshop.scheduled_at);
  const isPast = date < new Date();

  const handleRegister = async () => {
    if (!user || !workshopId) return;
    setLoadingReg(true);
    try {
      const { error } = await supabase.from('workshop_registrations').insert({
        workshop_id: workshopId,
        user_id: user.id
      } as any);
      if (error) throw error;
      setIsRegistered(true);
    } catch (err: any) {
      alert('Error al registrar: ' + err.message);
    } finally {
      setLoadingReg(false);
    }
  };

  return (
    <div className="pt-24 pb-20 px-4 max-w-4xl mx-auto">
      <BackButton
        fallback="/talleres"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-8 cursor-pointer"
      />

      <div className="p-8 md:p-10 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium border border-blue-200 dark:border-blue-800/50">
            <Calendar className="w-4 h-4" />
            {date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium">
            <Clock className="w-4 h-4" />
            {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} ({workshop.duration_minutes} min)
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
          {workshop.title}
        </h1>

        <div className="prose dark:prose-invert max-w-none mb-10 text-slate-600 dark:text-slate-400">
          <p>{workshop.description || 'Sin descripción detallada.'}</p>
        </div>

        {isEnrolledPhysician ? (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
            {isPast ? (
              <div className="text-center">
                <h3 className="text-lg font-bold mb-2">Este taller ya finalizó</h3>
                {workshop.recording_url ? (
                  <a href={workshop.recording_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500">
                    <Video className="w-5 h-5" /> Ver grabación
                  </a>
                ) : (
                  <p className="text-slate-500">La grabación aún no está disponible.</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold mb-1">Registro al taller</h3>
                  <p className="text-sm text-slate-500">
                    {isRegistered ? 'Ya estás registrado para asistir.' : 'Regístrate para recibir el acceso al stream.'}
                  </p>
                </div>
                {isRegistered ? (
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle className="w-5 h-5" /> Registrado
                  </div>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={loadingReg}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50"
                  >
                    <Users className="w-5 h-5" /> Registrarme
                  </button>
                )}
              </div>
            )}
            
            {isRegistered && !isPast && workshop.stream_url && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                <p className="text-sm text-slate-500 mb-3">El enlace de transmisión está disponible:</p>
                <a href={workshop.stream_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500">
                  <Video className="w-5 h-5" /> Entrar al Stream en Vivo
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-center">
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">Acceso Premium Requerido</h3>
            <p className="text-amber-800/80 dark:text-amber-200/80 text-sm mb-4">
              Debes tener acceso premium activo para registrarte o ver este taller.
            </p>
            <Link to="/auth/login" className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-500 text-sm">
              Inscribirme ahora
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
