import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { AdminQuizCatalog } from './quiz/AdminQuizCatalog';
import { AdminQuizEditor } from './quiz/AdminQuizEditor';

export default function AdminQuizzesPage() {
  const { topicId: routeTopicId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryTopicId = searchParams.get('topicId');
  const activeTopicId = routeTopicId || queryTopicId || null;

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(activeTopicId);

  useEffect(() => {
    if (activeTopicId) {
      setSelectedTopicId(activeTopicId);
    }
  }, [activeTopicId]);

  const handleSelectTopic = (topicId: string, moduleId?: string) => {
    setSelectedTopicId(topicId);
    const params = new URLSearchParams();
    if (moduleId) params.set('moduleId', moduleId);
    const search = params.toString();
    navigate(search ? `/admin/quizzes/${topicId}?${search}` : `/admin/quizzes/${topicId}`);
  };

  const handleBackToCatalog = () => {
    setSelectedTopicId(null);
    navigate('/admin/quizzes');
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
