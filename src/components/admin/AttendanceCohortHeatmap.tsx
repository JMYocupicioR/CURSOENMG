import { useState, useMemo } from 'react';
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
} from 'lucide-react';
import type { AdminProfileRow } from '../../types/admin';
import type { LiveWorkshop } from '../../types/database';
import type { ClassAttendanceRecord, AttendanceStatus } from '../../types/academicGradebook';

interface AttendanceCohortHeatmapProps {
  students: AdminProfileRow[];
  workshops: LiveWorkshop[];
  records: ClassAttendanceRecord[];
}

export default function AttendanceCohortHeatmap({
  students,
  workshops,
  records,
}: AttendanceCohortHeatmapProps) {
  const [search, setSearch] = useState('');
  const [onlyRisk, setOnlyRisk] = useState(false);

  // Ordenar talleres cronológicamente
  const sortedWorkshops = useMemo(() => {
    return [...workshops].sort((a, b) => {
      const dateA = a.scheduled_at || '';
      const dateB = b.scheduled_at || '';
      return dateA.localeCompare(dateB);
    });
  }, [workshops]);

  // Indexar registros por [student_id|workshop_id] o [student_id|title|date]
  const recordIndex = useMemo(() => {
    const map = new Map<string, ClassAttendanceRecord>();
    for (const r of records) {
      if (r.workshop_id) {
        map.set(`${r.student_id}|ws_${r.workshop_id}`, r);
      }
      const keyFallback = `${r.student_id}|${r.session_title}|${r.session_date}`;
      if (!map.has(keyFallback)) {
        map.set(keyFallback, r);
      }
    }
    return map;
  }, [records]);

  // Calcular métricas por estudiante
  const studentRows = useMemo(() => {
    const heldWorkshops = sortedWorkshops.filter(
      (w) =>
        (w.counts_for_kardex ?? true) &&
        (w.status === 'completed' ||
          w.attendance_closed ||
          (w.scheduled_at && new Date(w.scheduled_at) <= new Date()))
    );
    const denominator = heldWorkshops.length;

    return students.map((s) => {
      let points = 0;
      let evaluatedCount = 0;

      const sessionsMap: Record<string, ClassAttendanceRecord | null> = {};

      for (const w of sortedWorkshops) {
        let rec = recordIndex.get(`${s.id}|ws_${w.id}`);
        if (!rec) {
          const dateOnly = w.scheduled_at ? w.scheduled_at.split('T')[0] : '';
          rec = recordIndex.get(`${s.id}|${w.title}|${dateOnly}`);
        }

        sessionsMap[w.id] = rec || null;

        if (rec) {
          evaluatedCount++;
          if (rec.status === 'present') points += 1.0;
          else if (rec.status === 'late') points += 0.8;
          else if (rec.status === 'excused') points += 1.0;
          else points += 0;
        }
      }

      const effectiveDenominator = Math.max(evaluatedCount, denominator);
      const attendancePct =
        effectiveDenominator > 0 ? Math.round((points / effectiveDenominator) * 100) : 100;
      const isAtRisk = effectiveDenominator > 0 && attendancePct < 80;

      return {
        student: s,
        attendancePct,
        isAtRisk,
        evaluatedCount,
        sessionsMap,
      };
    });
  }, [students, sortedWorkshops, recordIndex]);

  // Filtrado
  const filteredRows = useMemo(() => {
    return studentRows.filter((r) => {
      if (onlyRisk && !r.isAtRisk) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.student.display_name.toLowerCase().includes(q) ||
        (r.student.email && r.student.email.toLowerCase().includes(q)) ||
        (r.student.institution && r.student.institution.toLowerCase().includes(q))
      );
    });
  }, [studentRows, search, onlyRisk]);

  // Exportar a CSV oficial
  const handleExportCSV = () => {
    const headers = [
      'Alumno',
      'Correo',
      'Sede Hospitalaria',
      'Año de Residencia',
      'Asistencia Ponderada (%)',
      'Riesgo Académico',
      ...sortedWorkshops.map((w) => `"${w.title.replace(/"/g, '""')}"`),
    ];

    const rows = studentRows.map((r) => {
      const workshopCells = sortedWorkshops.map((w) => {
        const rec = r.sessionsMap[w.id];
        if (!rec) return 'No registrado';
        if (rec.status === 'present') return 'Presente (1.0)';
        if (rec.status === 'late') return 'Retardo (0.8)';
        if (rec.status === 'excused') return `Justificada (${rec.excuse_reason || 'Con nota'})`;
        return 'Falta (0)';
      });

      return [
        `"${r.student.display_name.replace(/"/g, '""')}"`,
        `"${r.student.email || ''}"`,
        `"${(r.student.institution || 'Sede no especificada').replace(/"/g, '""')}"`,
        `"${r.student.residency_year || ''}"`,
        `${r.attendancePct}%`,
        r.isAtRisk ? 'EN RIESGO (<80%)' : 'REGULAR',
        ...workshopCells,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Matriz_Asistencia_ElectroDx_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatusBadge = (status: AttendanceStatus | undefined, notes?: string | null, reason?: string | null) => {
    if (!status) {
      return (
        <span
          title="Sin registro de pase de lista"
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold"
        >
          —
        </span>
      );
    }

    switch (status) {
      case 'present':
        return (
          <span
            title="Presente (100%)"
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black shadow-2xs"
          >
            P
          </span>
        );
      case 'late':
        return (
          <span
            title={`Retardo (80%)${notes ? `: ${notes}` : ''}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-black shadow-2xs"
          >
            R
          </span>
        );
      case 'excused':
        return (
          <span
            title={`Justificada: ${reason || notes || 'Con justificante'}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-black shadow-2xs"
          >
            J
          </span>
        );
      case 'absent':
        return (
          <span
            title={`Falta (0%)${notes ? `: ${notes}` : ''}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-black shadow-2xs"
          >
            F
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por médico o sede..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyRisk(!onlyRisk)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              onlyRisk
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>En riesgo (&lt;80%)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Leyenda rápida */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-semibold text-slate-500 border-r border-slate-200 dark:border-slate-700 pr-3 mr-1">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Presente
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Retardo (80%)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Justificada
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Falta
            </span>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Matriz Scrollable */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5 text-left sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-xs min-w-[200px]">
                  Médico Cursista
                </th>
                <th className="px-3 py-3.5 text-center min-w-[100px]">
                  Asistencia (%)
                </th>
                {sortedWorkshops.map((w, idx) => {
                  const dateFormatted = w.scheduled_at
                    ? new Date(w.scheduled_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                      })
                    : `S${idx + 1}`;
                  return (
                    <th
                      key={w.id}
                      className="px-2 py-3 text-center min-w-[70px]"
                      title={`${w.title} (${w.scheduled_at ? new Date(w.scheduled_at).toLocaleDateString('es-MX') : ''})`}
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[80px]">
                        T{idx + 1}
                      </div>
                      <div className="text-[9px] font-medium text-slate-400 lowercase">
                        {dateFormatted}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={sortedWorkshops.length + 2}
                    className="px-6 py-12 text-center text-slate-400 font-medium"
                  >
                    No se encontraron alumnos con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ student, attendancePct, isAtRisk, sessionsMap }) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* Columna fija de nombre */}
                    <td className="px-4 py-3 sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-xs">
                      <div className="flex items-center gap-2">
                        {isAtRisk ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {student.display_name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {student.institution || 'Sede no asignada'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Porcentaje ponderado */}
                    <td className="px-3 py-3 text-center font-bold">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black ${
                          attendancePct >= 85
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : attendancePct >= 80
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        {attendancePct}%
                      </span>
                    </td>

                    {/* Celdas de talleres */}
                    {sortedWorkshops.map((w) => {
                      const rec = sessionsMap[w.id];
                      return (
                        <td key={w.id} className="px-2 py-3 text-center">
                          {renderStatusBadge(rec?.status, rec?.notes, rec?.excuse_reason)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
