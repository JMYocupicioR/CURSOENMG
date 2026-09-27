import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  BookOpen,
  Wrench,
  GraduationCap,
  Shield,
  Moon,
  Sun,
  X,
  FileText,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { useCommandPaletteStore } from '../../stores/commandPaletteStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuth } from '../../contexts/AuthProvider';
import { allModules } from '../../content/modules';
import {
  lessonHrefWithQuery,
  mergeSearchHits,
  searchCommandItems,
  searchLabel,
  searchStaticCourse,
} from '../../search/courseSearch';
import { HighlightedSearchText } from '../../search/HighlightedSearchText';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Curso' | 'Simuladores' | 'Exámenes' | 'Admin' | 'Acciones';
  icon: typeof BookOpen;
  to?: string;
  action?: () => void;
  badge?: string;
  breadcrumb?: string;
  snippet?: string;
  resultLabel?: string;
}

export function GlobalCommandPalette() {
  const { isOpen, close, toggle } = useCommandPaletteStore();
  const { isDarkMode, toggleDarkMode } = useSettingsStore();
  const { isAdmin, isEditor } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggle, close]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // All indexed items
  const allItems: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      // Simuladores & Herramientas
      {
        id: 'sim-ejercicios',
        title: 'Simulador de Casos y Ejercicios EMG',
        subtitle: 'Resolución de casos clínicos interactivos con electromiografía',
        category: 'Simuladores',
        icon: Wrench,
        to: '/ejercicios',
        badge: 'Práctica',
      },
      {
        id: 'sim-plexo',
        title: 'Calculadora Diagnóstica de Plexo Braquial',
        subtitle: 'Algoritmo de localización por troncos, cordones y raíces',
        category: 'Simuladores',
        icon: Sparkles,
        to: '/herramientas/plexo-braquial',
        badge: 'Herramienta',
      },
      {
        id: 'sim-trazos',
        title: 'Simulador de Trazos Neurofisiológicos',
        subtitle: 'Análisis de potenciales de acción, latencias y velocidades',
        category: 'Simuladores',
        icon: Activity,
        to: '/simuladores/trazos',
        badge: 'Interactivo',
      },
      {
        id: 'sim-hub',
        title: 'Hub de Simuladores Clínicos',
        subtitle: 'Catálogo completo de simuladores y motores de práctica',
        category: 'Simuladores',
        icon: Layers,
        to: '/simuladores',
      },

      // Exámenes y Portal
      {
        id: 'exam-portal',
        title: 'Simulador de Examen Oficial',
        subtitle: 'Configurar y presentar exámenes cronometrados tipo acreditación',
        category: 'Exámenes',
        icon: GraduationCap,
        to: '/examenes',
        badge: 'Acreditación',
      },
      {
        id: 'user-portal',
        title: 'Mi Portal del Estudiante',
        subtitle: 'Dashboard de avance, horas de práctica y kardex personal',
        category: 'Exámenes',
        icon: GraduationCap,
        to: '/portal',
      },
      {
        id: 'prog-temario',
        title: 'Temario y Programa del Diplomado',
        subtitle: 'Estructura curricular completa y competencias clínicas',
        category: 'Curso',
        icon: BookOpen,
        to: '/temario',
      },

      // Acciones rápidas
      {
        id: 'action-theme',
        title: isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro',
        subtitle: 'Ajustar la paleta visual de la interfaz',
        category: 'Acciones',
        icon: isDarkMode ? Sun : Moon,
        action: () => toggleDarkMode(),
      },
    ];

    allModules.forEach((m) => {
      items.push({
        id: `mod-${m.id}`,
        title: m.title,
        subtitle: `Módulo formativo • ${m.topics?.length || 0} temas clínicos`,
        category: 'Curso',
        icon: BookOpen,
        to: `/modulo/${m.id}`,
      });
    });

    if (isAdmin || isEditor) {
      items.push({
        id: 'admin-calendario',
        title: 'Calendario académico',
        subtitle: 'Clases, exámenes, casos EMG y cortes en un tablero',
        category: 'Admin',
        icon: Calendar,
        to: '/admin/calendario',
        badge: 'Docencia',
      });
    }

    // Vistas de administración
    if (isAdmin) {
      items.push(
        {
          id: 'admin-ejercicios',
          title: 'Gestor de Casos y Ejercicios EMG',
          subtitle: 'Crear, duplicar y asignar casos a cohortes de alumnos',
          category: 'Admin',
          icon: Shield,
          to: '/admin/ejercicios',
          badge: 'Docencia',
        },
        {
          id: 'admin-alumnos',
          title: 'Kardex y Progreso de Alumnos',
          subtitle: 'Métricas de desempeño, intentos de examen y calificaciones',
          category: 'Admin',
          icon: Shield,
          to: '/admin/alumnos',
          badge: 'Gestión',
        },
        {
          id: 'admin-asistencias',
          title: 'Cockpit de Asistencias y Talleres',
          subtitle: 'Pase de lista unificado y matriz de asistencia',
          category: 'Admin',
          icon: Shield,
          to: '/admin/alumnos/asistencias',
          badge: 'Talleres',
        },
        {
          id: 'admin-examenes',
          title: 'Analíticas de Exámenes',
          subtitle: 'Historial de intentos y calificaciones de alumnos',
          category: 'Admin',
          icon: Shield,
          to: '/admin/alumnos/examenes',
          badge: 'Exámenes',
        },
        {
          id: 'admin-usuarios',
          title: 'Directorio de Médicos y Usuarios',
          subtitle: 'Aprobación de inscripciones médicas y gestión de roles',
          category: 'Admin',
          icon: Shield,
          to: '/admin/usuarios',
          badge: 'Usuarios',
        }
      );
    }

    return items;
  }, [allModules, isDarkMode, toggleDarkMode, isAdmin, isEditor]);

  const filteredItems = useMemo(() => {
    const q = query.trim();
    if (!q) {
      return allItems
        .filter(
          (item) =>
            item.category === 'Simuladores' ||
            item.category === 'Admin' ||
            item.id === 'user-portal' ||
            item.id.startsWith('mod-'),
        )
        .slice(0, 15);
    }

    const commandHits = searchCommandItems(
      allItems.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        category: item.category,
        href: item.to,
      })),
      q,
      20,
    );
    const merged = mergeSearchHits([...commandHits, ...searchStaticCourse(q, 20)], 20);
    const commands = new Map(allItems.map((item) => [item.id, item]));

    return merged.flatMap((hit): CommandItem[] => {
      if (hit.kind === 'command') {
        const item = commands.get(hit.id);
        return item ? [item] : [];
      }
      return [
        {
          id: hit.id,
          title: hit.title,
          subtitle: hit.breadcrumb,
          breadcrumb: hit.breadcrumb,
          snippet: hit.snippet,
          resultLabel: searchLabel(hit.matchKind),
          category: 'Curso',
          icon: FileText,
          to: lessonHrefWithQuery(hit.href ?? '/', q),
        },
      ];
    });
  }, [allItems, query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  const handleSelect = (item: CommandItem) => {
    close();
    if (item.action) {
      item.action();
    } else if (item.to) {
      navigate(item.to);
    }
  };

  const handleKeyDownInList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-14 sm:pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-150"
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos y búsqueda global"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden z-10 animate-in zoom-in-95 fade-in duration-150 flex flex-col max-h-[80vh]"
        onKeyDown={handleKeyDownInList}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-blue-600 dark:text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en lecciones, simuladores o acciones..."
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Borrar texto"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/40"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No se encontraron resultados
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Prueba con un término del texto, como "Neuropraxia", "Plexo", "Conducción" o "Kardex".
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate leading-snug">
                        {item.title}
                      </p>
                      {item.breadcrumb && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-snug">
                          {item.breadcrumb}
                        </p>
                      )}
                      {item.snippet ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug mt-0.5">
                          <HighlightedSearchText text={item.snippet} query={query} />
                        </p>
                      ) : (
                        item.subtitle &&
                        !item.breadcrumb && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-snug">
                            {item.subtitle}
                          </p>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.resultLabel && (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
                        {item.resultLabel}
                      </span>
                    )}
                    {item.badge && (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {item.badge}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.category === 'Curso'
                          ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                          : item.category === 'Simuladores'
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                          : item.category === 'Admin'
                          ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                          : item.category === 'Exámenes'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {item.category}
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'translate-x-0.5 text-blue-600 dark:text-cyan-400' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-5 py-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                ↓
              </kbd>
              <span>Navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                ↵
              </kbd>
              <span>Abrir</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-400">Búsqueda rápida en ElectroDx</span>
        </div>
      </div>
    </div>
  );
}
