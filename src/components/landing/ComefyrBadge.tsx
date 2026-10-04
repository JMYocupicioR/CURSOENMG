import { Award, ShieldCheck } from 'lucide-react';
import { BRAND } from '../../config/brand';

interface ComefyrBadgeProps {
  variant?: 'compact' | 'full' | 'banner';
  className?: string;
}

export function ComefyrBadge({ variant = 'full', className = '' }: ComefyrBadgeProps) {
  if (!BRAND.enableAccreditation) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200/80 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800/70 ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />
        <span>Avalado por COMEFYR</span>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white border border-blue-500/20 shadow-xl ${className}`}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-cyan-300">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-cyan-400">Reconocimiento Académico Oficial</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">Vigencia Vigente</span>
              </div>
              <h4 className="text-base font-bold text-white tracking-tight">Colegio Mexicano de Medicina de Rehabilitación A.C.</h4>
              <p className="text-xs text-slate-300">Programa formativo con valor curricular y créditos oficiales para recertificación de médicos especialistas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right sm:border-r border-slate-700 sm:pr-4">
              <div className="text-xs font-mono text-cyan-300 font-bold">VALOR CURRICULAR</div>
              <div className="text-[11px] text-slate-400">Acreditación COMEFYR</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xs ${className}`}>
      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-300">
        <Award className="w-3.5 h-3.5" />
      </div>
      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-white">Avalado por COMEFYR</span>
        <span className="hidden sm:inline text-slate-400">·</span>
        <span className="hidden sm:inline text-slate-500 dark:text-slate-400">Colegio Mexicano de Medicina de Rehabilitación A.C.</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 ml-1">
          Valor Curricular
        </span>
      </div>
    </div>
  );
}
