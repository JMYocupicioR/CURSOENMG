import { useMemo } from 'react';
import { Video, Clock, BookOpen } from 'lucide-react';
import type { LiveWorkshop } from '../../types/database';
import { allModules } from '../../content/modules';

interface WorkshopCardProps {
  workshop: LiveWorkshop;
}

export function WorkshopCard({ workshop }: WorkshopCardProps) {
  const date = new Date(workshop.scheduled_at);
  const now = new Date();
  const isPast = date < now;
  const isLive = Math.abs(date.getTime() - now.getTime()) < 2 * 60 * 60 * 1000; // within 2 hours

  const topicTitle = useMemo(() => {
    if (!workshop.topic_id) return null;
    for (const m of allModules) {
      for (const t of m.topics) {
        if (t.id === workshop.topic_id) return t.title;
        if (t.children) {
          const found = t.children.find((c) => c.id === workshop.topic_id);
          if (found) return found.title;
        }
      }
    }
    return workshop.topic_id;
  }, [workshop.topic_id]);

  return (
    <div className="group flex flex-col p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/40 shadow-sm hover:shadow-xl hover:shadow-blue-100/50 dark:hover:shadow-blue-900/20 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
          isLive 
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : isPast
              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        }`}>
          {isLive ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> EN VIVO</>
          ) : isPast ? (
            'FINALIZADO'
          ) : (
            'PRÓXIMO'
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-900 dark:text-white capitalize">
            {date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
          </p>
          <p className="text-[10px] text-slate-500">
            {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <h3 className="font-bold text-slate-900 dark:text-white mb-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {workshop.title}
      </h3>

      {topicTitle && (
        <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-medium w-fit max-w-full">
          <BookOpen className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span className="truncate">Tema: {topicTitle}</span>
        </div>
      )}
      
      {workshop.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
          {workshop.description}
        </p>
      )}

      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{workshop.duration_minutes} minutos</span>
        </div>
        
        {workshop.stream_url && !isPast && (
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
            <Video className="w-3.5 h-3.5 flex-shrink-0" />
            <a href={workshop.stream_url} target="_blank" rel="noreferrer" className="hover:underline" onClick={(e) => e.stopPropagation()}>
              Entrar a la sesión en vivo →
            </a>
          </div>
        )}

        {workshop.recording_url && (
          <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
            <Video className="w-3.5 h-3.5 flex-shrink-0" />
            <a href={workshop.recording_url} target="_blank" rel="noreferrer" className="hover:underline" onClick={(e) => e.stopPropagation()}>
              Ver clase grabada ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
