import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { AdminQuizCatalog } from './quiz/AdminQuizCatalog';
import { AdminQuizEditor } from './quiz/AdminQuizEditor';
import { AdminFinalExamsManager } from './quiz/AdminFinalExamsManager';
import {
  buildQuizCatalogPath,
  catalogPathFromEditorSearch,
  parseQuizCatalogStatus,
  quizEditorPath,
} from '../../utils/quizCatalogNavigation';
import { GraduationCap, BookOpen } from 'lucide-react';

export default function AdminQuizzesPage() {
  const { topicId: routeTopicId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryTopicId = searchParams.get('topicId');
  const activeTopicId = routeTopicId || queryTopicId || null;

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(activeTopicId);

  // Pestaña activa cuando estamos en la vista de lista/catálogo: 'finals' | 'topics'
  const activeTab = searchParams.get('tab') === 'topics' ? 'topics' : 'finals';

  useEffect(() => {
    setSelectedTopicId(activeTopicId);
  }, [activeTopicId]);

  const handleSelectTopic = (topicId: string, moduleId?: string) => {
    setSelectedTopicId(topicId);
    const catalogReturn = buildQuizCatalogPath(
      {
        q: searchParams.get('q') ?? '',
        modulo: searchParams.get('modulo') ?? 'all',
        estado: parseQuizCatalogStatus(searchParams.get('estado')),
      },
      moduleId ? { moduleId, topicId } : null,
    );
    navigate(quizEditorPath(topicId, moduleId, catalogReturn));
  };

  const handleBackToCatalog = () => {
    setSelectedTopicId(null);
    navigate(catalogPathFromEditorSearch(searchParams.toString()));
  };

  const handleSwitchTab = (tab: 'finals' | 'topics') => {
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'topics') {
      nextParams.set('tab', 'topics');
    } else {
      nextParams.delete('tab');
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <AdminLayout
      title={
        selectedTopicId
          ? 'Editor de Evaluación'
          : activeTab === 'finals'
          ? 'Exámenes Finales & Sumativos'
          : 'Cuestionarios de Temas'
      }
      subtitle={
        selectedTopicId
          ? 'Redacta viñetas clínicas, opciones de respuesta, perlas COMEFYR y publica en vivo para alumnos.'
          : activeTab === 'finals'
          ? 'Diseña, programa y despacha evaluaciones oficiales con candado estricto a toda la cohorte o a alumnos individuales.'
          : 'Supervisa y edita los cuestionarios formativos integrados al final de cada lección teórica.'
      }
    >
      {selectedTopicId ? (
        <AdminQuizEditor
          initialTopicId={selectedTopicId}
          initialModuleId={searchParams.get('moduleId') ?? undefined}
          onBackToCatalog={handleBackToCatalog}
        />
      ) : (
        <div className="space-y-6">
          {/* Barra de Pestañas Superiores */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => handleSwitchTab('finals')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'finals'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Exámenes Finales & Asignados</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('topics')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'topics'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Cuestionarios de Temas (Lecciones)</span>
            </button>
          </div>

          {/* Contenido de la pestaña activa */}
          {activeTab === 'finals' ? (
            <AdminFinalExamsManager />
          ) : (
            <AdminQuizCatalog onSelectTopic={handleSelectTopic} />
          )}
        </div>
      )}
    </AdminLayout>
  );
}
