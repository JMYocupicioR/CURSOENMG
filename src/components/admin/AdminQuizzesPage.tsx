import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { AdminQuizCatalog } from './quiz/AdminQuizCatalog';
import { AdminQuizEditor } from './quiz/AdminQuizEditor';
import {
  buildQuizCatalogPath,
  catalogPathFromEditorSearch,
  parseQuizCatalogStatus,
  quizEditorPath,
} from '../../utils/quizCatalogNavigation';

export default function AdminQuizzesPage() {
  const { topicId: routeTopicId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryTopicId = searchParams.get('topicId');
  const activeTopicId = routeTopicId || queryTopicId || null;

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(activeTopicId);

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

  return (
    <AdminLayout
      title={selectedTopicId ? 'Editor de Evaluación' : 'Evaluaciones'}
      subtitle={
        selectedTopicId
          ? 'Redacta viñetas clínicas, opciones de respuesta, perlas COMEFYR y publica en vivo para alumnos.'
          : 'Supervisa y edita las evaluaciones y cuestionarios de los módulos de la cohorte.'
      }
    >
      {selectedTopicId ? (
        <AdminQuizEditor
          initialTopicId={selectedTopicId}
          initialModuleId={searchParams.get('moduleId') ?? undefined}
          onBackToCatalog={handleBackToCatalog}
        />
      ) : (
        <AdminQuizCatalog onSelectTopic={handleSelectTopic} />
      )}
    </AdminLayout>
  );
}
