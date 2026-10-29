import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Video, Bell, X, Play } from 'lucide-react';
import { useCourseStore } from '../../stores/courseStore';
import { useAuth } from '../../contexts/AuthProvider';
import {
  getWorkshopAccessTiming,
  triggerLiveClassFiveMinuteAlert,
  type WorkshopAccessTiming,
} from '../../utils/liveSessionUtils';
import type { LiveWorkshop } from '../../types/database';

export function LiveClassGlobalAlert() {
  const { isEnrolledPhysician } = useAuth();
  const upcomingWorkshops = useCourseStore((s) => s.upcomingWorkshops);
  const location = useLocation();

  const [activeAlert, setActiveAlert] = useState<{
    workshop: LiveWorkshop;
    timing: WorkshopAccessTiming;
  } | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isEnrolledPhysician || !upcomingWorkshops || upcomingWorkshops.length === 0) {
      setActiveAlert(null);
      return;
    }

    const checkUrgentSessions = () => {
      const now = new Date();
      for (const w of upcomingWorkshops) {
        if (w.status === 'completed' || w.status === 'cancelled') continue;
        const timing = getWorkshopAccessTiming(w, now);

        // Si faltan <= 5 min para iniciar o está en curso (y no ha finalizado)
        if (timing.canAccess && !timing.isPast) {
          if (dismissedId !== w.id) {
            setActiveAlert({ workshop: w, timing });
            // Disparar audio + notificación de sistema si es oportuno
            triggerLiveClassFiveMinuteAlert(w);
          }
          return;
        }
      }
      setActiveAlert(null);
    };

    checkUrgentSessions();
    const interval = setInterval(checkUrgentSessions, 10000); // Chequeo cada 10 seg
    return () => clearInterval(interval);
  }, [isEnrolledPhysician, upcomingWorkshops, dismissedId]);

  // Si el usuario ya está en la página de este taller, no hace falta el toast flotante
  const isCurrentlyInThisWorkshop = useMemo(() => {
    if (!activeAlert) return false;
    return location.pathname === `/taller/${activeAlert.workshop.id}`;
  }, [activeAlert, location.pathname]);

  if (!activeAlert || isCurrentlyInThisWorkshop) {
    return null;
  }

  const { workshop, timing } = activeAlert;

  const handleDismiss = () => {
    setDismissedId(workshop.id);
    setActiveAlert(null);
  };

  return (
    <aside
      aria-label="Alerta de clase en vivo a punto de iniciar"
      className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] animate-slide-up"
    >
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 text-white shadow-2xl shadow-red-950/40 border border-white/20 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-rose-700 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
              {timing.isLiveNow
                ? '🔴 EN VIVO AHORA'
                : `🔴 COMIENZA EN ${Math.max(1, timing.startsInMinutes)} MIN`}
            </span>
            <span className="text-xs font-bold text-rose-100 flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 animate-bounce" /> Sala abierta
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
            aria-label="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h4 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-1 mb-1">
          {workshop.title}
        </h4>
        <p className="text-xs text-rose-100/90 line-clamp-2 mb-3">
          La sala de transmisión ya está disponible para el acceso anticipado. Ingresa para no perderte el inicio.
        </p>

        <div className="flex items-center gap-2">
          {workshop.stream_url ? (
            <a
              href={workshop.stream_url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs bg-white text-rose-700 hover:bg-rose-50 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Entrar al Stream Ahora</span>
              <Play className="w-3 h-3 fill-rose-600 text-rose-600" />
            </a>
          ) : (
            <Link
              to={`/taller/${workshop.id}`}
              onClick={handleDismiss}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs bg-white text-rose-700 hover:bg-rose-50 shadow-md transition active:scale-95"
            >
              <Video className="w-4 h-4" />
              <span>Ir a la Sala del Taller</span>
            </Link>
          )}

          <Link
            to={`/taller/${workshop.id}`}
            onClick={handleDismiss}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition"
          >
            Ver Ficha
          </Link>
        </div>
      </div>
    </aside>
  );
}

