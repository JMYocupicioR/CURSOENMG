import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Video,
  FileText,
  Image,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  UploadCloud,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import type { Topic } from '../../types/content';
import { topicToRevisionPayload } from '../../services/contentMerge';
import { saveRevision, submitRevision, reviewRevision } from '../../services/editorialService';
import { parseVideoUrl, isAllowedImageUrl } from '../../utils/mediaValidation';
import { uploadTeachingFile } from '../../services/teachingStorage';

type SourceMode = 'file' | 'link';

type MaterialType = 'video' | 'pdf' | 'image' | 'pearl';

interface QuickTopicMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  topic: Topic;
  onSuccess?: () => void;
  initialTab?: MaterialType;
}

function SourceToggle({
  value,
  onChange,
  fileLabel,
  linkLabel,
  accent,
}: {
  value: SourceMode;
  onChange: (mode: SourceMode) => void;
  fileLabel: string;
  linkLabel: string;
  accent: 'purple' | 'emerald';
}) {
  const active =
    accent === 'purple'
      ? 'bg-purple-600 text-white'
      : 'bg-emerald-600 text-white';
  return (
    <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
      {(['file', 'link'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            value === mode ? active : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {mode === 'file' ? fileLabel : linkLabel}
        </button>
      ))}
    </div>
  );
}

export function QuickTopicMaterialModal({
  isOpen,
  onClose,
  moduleId,
  topic,
  onSuccess,
  initialTab = 'video',
}: QuickTopicMaterialModalProps) {
  const { user, isAdmin, isEditor, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<MaterialType>(initialTab);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(topic.id);
  const [adminPublishMode, setAdminPublishMode] = useState<'instant' | 'review'>('instant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  // Video
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // PDF
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfSource, setPdfSource] = useState<SourceMode>('file');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDescription, setPdfDescription] = useState('');

  // Image
  const [imageSource, setImageSource] = useState<SourceMode>('file');
  const [imageSrc, setImageSrc] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState('');

  // Pearl
  const [pearlText, setPearlText] = useState('');

  const targetTopic = useMemo(() => {
    if (selectedTargetId === topic.id) return topic;
    const foundChild = topic.children?.find((c) => c.id === selectedTargetId);
    return foundChild ?? topic;
  }, [topic, selectedTargetId]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setSelectedTargetId(topic.id);
    setError(null);
    setSuccessMsg(null);
  }, [isOpen, initialTab, topic.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Debes iniciar sesión para agregar material.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = topicToRevisionPayload(targetTopic);
      const authorName = profile?.display_name || 'Especialista Docente';

      if (activeTab === 'video') {
        if (!videoTitle.trim() || !videoUrl.trim()) {
          throw new Error('Por favor ingresa el título y la URL del video.');
        }
        const parsed = parseVideoUrl(videoUrl.trim());
        if (!parsed) {
          throw new Error(
            'URL de video no válida. Soporta YouTube, Vimeo, Google Drive, Loom o enlaces de embed.'
          );
        }

        switch (parsed.kind) {
          case 'drive':
            payload.videoUrls = [...(payload.videoUrls ?? []), { title: videoTitle.trim(), driveId: parsed.driveId }];
            break;
          case 'youtube':
            payload.youtubeUrls = [
              ...(payload.youtubeUrls ?? []),
              { title: videoTitle.trim(), videoId: parsed.videoId, startTime: parsed.startTime },
            ];
            break;
          case 'vimeo':
            payload.vimeoUrls = [...(payload.vimeoUrls ?? []), { title: videoTitle.trim(), videoId: parsed.videoId }];
            break;
          case 'embed':
            payload.embedUrls = [...(payload.embedUrls ?? []), { title: videoTitle.trim(), embedUrl: parsed.embedUrl }];
            break;
        }
      } else if (activeTab === 'pdf') {
        if (!pdfTitle.trim()) {
          throw new Error('Por favor ingresa el nombre del documento.');
        }
        let cleanPdfUrl = pdfUrl.trim();
        if (pdfSource === 'file') {
          if (!pdfFile) throw new Error('Selecciona un PDF de tu equipo o cambia a enlace público.');
          const uploaded = await uploadTeachingFile(user.id, 'pdf', pdfFile);
          if (uploaded.error || !uploaded.url) throw new Error(uploaded.error || 'No se pudo subir el PDF.');
          cleanPdfUrl = uploaded.url;
        } else if (!cleanPdfUrl) {
          throw new Error('Por favor ingresa el enlace al PDF o guía clínica.');
        }
        const cleanDesc = pdfDescription.trim() || 'Material docente de referencia clínica.';
        
        payload.pdfUrls = [
          ...(payload.pdfUrls ?? []),
          {
            title: pdfTitle.trim(),
            url: cleanPdfUrl,
            description: cleanDesc,
            author: authorName,
          },
        ];
      } else if (activeTab === 'image') {
        let cleanImageSrc = imageSrc.trim();
        if (imageSource === 'file') {
          if (!imageFile) throw new Error('Selecciona una imagen de tu equipo o cambia a enlace público.');
          const uploaded = await uploadTeachingFile(user.id, 'image', imageFile);
          if (uploaded.error || !uploaded.url) throw new Error(uploaded.error || 'No se pudo subir la imagen.');
          cleanImageSrc = uploaded.url;
        } else if (!cleanImageSrc) {
          throw new Error('Por favor ingresa la URL de la imagen o trazado EMG.');
        }
        if (!isAllowedImageUrl(cleanImageSrc) && !cleanImageSrc.startsWith('data:image')) {
          throw new Error('URL de imagen no permitida o formato incorrecto (.png, .jpg, .webp, google drive, etc).');
        }
        payload.imageUrls = [
          ...(payload.imageUrls ?? []),
          {
            src: cleanImageSrc,
            alt: imageCaption.trim() || targetTopic.title,
            caption: imageCaption.trim() ? `${imageCaption.trim()} — Aportado por ${authorName}` : `Aportado por ${authorName}`,
          },
        ];
      } else if (activeTab === 'pearl') {
        if (!pearlText.trim()) {
          throw new Error('Por favor redacta la perla clínica.');
        }
        payload.clinicalPearls = [
          ...(payload.clinicalPearls ?? []),
          `${pearlText.trim()} *(Aporte: ${authorName})*`,
        ];
      }

      // Ensure media object is also populated for Supabase media JSONB persistence
      payload.media = {
        videoUrls: payload.videoUrls ?? [],
        youtubeUrls: payload.youtubeUrls ?? [],
        vimeoUrls: payload.vimeoUrls ?? [],
        embedUrls: payload.embedUrls ?? [],
        imageUrls: payload.imageUrls ?? [],
        pdfUrls: payload.pdfUrls ?? [],
        references: payload.references ?? payload.media?.references ?? [],
      };

      // Save revision
      const isChild = targetTopic.id !== topic.id;
      const saved = await saveRevision({
        targetTopicId: targetTopic.id,
        moduleId,
        parentId: isChild ? topic.id : null,
        action: 'update',
        payload,
        authorId: user.id,
      });

      await submitRevision(saved.id);

      // Instant publish or leave in review queue
      if ((isAdmin || isEditor) && adminPublishMode === 'instant') {
        await reviewRevision(saved.id, 'approved', `Material docente agregado directamente por ${authorName}`);
        setSuccessMsg('¡Material publicado exitosamente en el tema!');
      } else if (isAdmin || isEditor) {
        setSuccessMsg('¡Material enviado a la cola de revisión para los demás administradores!');
      } else {
        setSuccessMsg('¡Material enviado a revisión con éxito!');
      }

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error adding material:', err);
      setError(err?.message || 'Error al guardar el material.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Agregar Material al Tema
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate max-w-md">
                Tema: <strong className="text-slate-700 dark:text-slate-300">{topic.title}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Type Selector Tabs */}
          <div className="grid grid-cols-4 gap-1 p-2 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'video'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Clase /</span> Video
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'pdf'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Guía /</span> PDF
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('image')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'image'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">Trazado /</span> Imagen
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pearl')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'pearl'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              Perla <span className="hidden sm:inline">Clínica</span>
            </button>
          </div>

          {/* Subtopic Target Selector (if parent topic has children) */}
          {topic.children && topic.children.length > 0 && (
            <div className="px-6 py-3.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="block text-xs font-bold text-blue-900 dark:text-blue-200">
                  ¿A qué sección o subtema deseas agregar este material?
                </span>
                <span className="block text-[11px] text-blue-700/80 dark:text-blue-300/70">
                  Puedes guardarlo en la cabecera general o en un subtema numerado.
                </span>
              </div>
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="text-xs font-medium rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[220px]"
              >
                <option value={topic.id}>📌 {topic.title} (Tema General)</option>
                {topic.children.map((child, idx) => (
                  <option key={child.id} value={child.id}>
                    {idx + 1}. {child.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Tab: Video */}
            {activeTab === 'video' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Título de la grabación o video explicativo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Análisis de trazado en túnel del carpo con Dr. Martínez"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Enlace del Video (YouTube, Google Drive, Vimeo, Loom) *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://youtu.be/... o https://drive.google.com/file/d/.../view"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Los videos no se guardan en la plataforma: el plan gratuito solo tiene 1 GB y se llenaría con pocas clases. Usa YouTube, Drive, Vimeo o Loom. Los alumnos lo reproducen dentro de la lección.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: PDF / Guide */}
            {activeTab === 'pdf' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nombre del documento / Guía clínica *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Criterios Diagnósticos EAN/PNS 2021 para CIDP (PDF)"
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none dark:text-white"
                  />
                </div>

                <SourceToggle
                  value={pdfSource}
                  onChange={setPdfSource}
                  fileLabel="Subir PDF"
                  linkLabel="Enlace público"
                  accent="purple"
                />

                {pdfSource === 'file' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Archivo PDF desde tu equipo *
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      required
                      onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Máximo 20 MB. El plan gratuito de Supabase permite hasta 50 MB por archivo y 1 GB en total.
                      {pdfFile ? ` Seleccionado: ${pdfFile.name}.` : ''}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Enlace de descarga o visualización (Google Drive, Cloudinary, etc.) *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://drive.google.com/... o https://midominio.com/guia.pdf"
                      value={pdfUrl}
                      onChange={(e) => setPdfUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Descripción o utilidad para los médicos residentes (opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Guía rápida con tablas de latencias de referencia y correlación anatómica..."
                    value={pdfDescription}
                    onChange={(e) => setPdfDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Tab: Image */}
            {activeTab === 'image' && (
              <div className="space-y-4">
                <SourceToggle
                  value={imageSource}
                  onChange={setImageSource}
                  fileLabel="Subir imagen"
                  linkLabel="Enlace público"
                  accent="emerald"
                />

                {imageSource === 'file' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Imagen o captura de electromiografía *
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                      onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      JPG, PNG o WebP. Máximo 5 MB.
                      {imageFile ? ` Seleccionado: ${imageFile.name}.` : ''}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      URL de la imagen o captura de electromiografía *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://i.imgur.com/... o enlace de imagen directo"
                      value={imageSrc}
                      onChange={(e) => setImageSrc(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pie de foto / Diagnóstico del trazado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Bloqueo de conducción parcial en nervio mediano a nivel de antebrazo"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Tab: Clinical Pearl */}
            {activeTab === 'pearl' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Redacta tu Perla Clínica (💡) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Ej. En sospecha de neuropatía desmielinizante temprana, evaluar siempre la onda F y el reflejo H antes de descartar prolongación de latencias distales..."
                    value={pearlText}
                    onChange={(e) => setPearlText(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Se mostrará destacada en la caja dorada de perlas clínicas con tu crédito como especialista.
                  </p>
                </div>
              </div>
            )}

            {/* Admin Publishing Mode Selection */}
            {(isAdmin || isEditor) && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Modo de publicación (Administrador)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      adminPublishMode === 'instant'
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="adminPublishMode"
                      checked={adminPublishMode === 'instant'}
                      onChange={() => setAdminPublishMode('instant')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <span className="block font-bold">Publicar de Inmediato</span>
                      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        Visible en vivo de inmediato en el tema.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      adminPublishMode === 'review'
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="adminPublishMode"
                      checked={adminPublishMode === 'review'}
                      onChange={() => setAdminPublishMode('review')}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <span className="block font-bold">Enviar a Revisión</span>
                      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        Aparecerá en &quot;Pendientes&quot; del panel admin para los demás.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    {isAdmin || isEditor
                      ? adminPublishMode === 'instant'
                        ? 'Guardar y Publicar en el Tema'
                        : 'Enviar a Revisión de Administradores'
                      : 'Proponer Material Docente'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
