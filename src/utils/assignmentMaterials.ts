/** Plan Free de Supabase: 50 MB por archivo y 1 GB de almacenamiento del proyecto. */
export const ASSIGNMENT_MATERIAL_MAX_BYTES = 50 * 1024 * 1024;
export const ASSIGNMENT_MATERIAL_MAX_FILES = 4;
export const ASSIGNMENT_MATERIAL_MAX_LINKS = 6;

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'msi',
  'bat',
  'cmd',
  'com',
  'scr',
  'ps1',
  'vbs',
  'js',
  'mjs',
  'jar',
  'dll',
  'sh',
  'html',
  'htm',
  'svg',
  'php',
  'apk',
  'dmg',
  'iso',
  'lnk',
]);

export interface AssignmentMaterial {
  kind: 'file' | 'link';
  url: string;
  label?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  byte_size?: number | null;
  storage_path?: string | null;
}

export function assignmentMaterialExtension(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base
    .slice(dot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);
}

export function formatAssignmentMaterialSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function assignmentMaterialFileError(file: File, existingFileCount = 0): string | null {
  if (existingFileCount >= ASSIGNMENT_MATERIAL_MAX_FILES) {
    return `Puedes adjuntar hasta ${ASSIGNMENT_MATERIAL_MAX_FILES} archivos por tarea.`;
  }
  const ext = assignmentMaterialExtension(file.name);
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    return 'Ese tipo de archivo no se puede subir. Usa un documento, imagen, audio, video o un enlace.';
  }
  if (file.size <= 0) return 'El archivo está vacío.';
  if (file.size > ASSIGNMENT_MATERIAL_MAX_BYTES) {
    return 'El archivo supera 50 MB, el máximo del plan gratuito de Supabase. Súbelo a Drive o YouTube y pega el enlace.';
  }
  return null;
}

export function assignmentMaterialLinkError(raw: string, existingLinkCount = 0): string | null {
  if (existingLinkCount >= ASSIGNMENT_MATERIAL_MAX_LINKS) {
    return `Puedes agregar hasta ${ASSIGNMENT_MATERIAL_MAX_LINKS} enlaces por tarea.`;
  }
  const url = raw.trim();
  if (!url) return 'Pega un enlace.';
  if (url.length > 2000 || /\s/.test(url)) return 'El enlace no es válido.';
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'El enlace no es válido.';
  }
  if (parsed.protocol !== 'https:') return 'El enlace debe empezar con https://.';
  return null;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url || url.length > 2000) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function cleanLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const label = value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 180);
  return label || null;
}

export function normalizeAssignmentMaterials(value: unknown): AssignmentMaterial[] {
  if (!Array.isArray(value)) return [];
  const materials: AssignmentMaterial[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const url = httpsUrl(row.url);
    if (!url) continue;
    if (row.kind === 'link') {
      materials.push({
        kind: 'link',
        url,
        label: cleanLabel(row.label),
      });
      continue;
    }
    if (row.kind !== 'file') continue;
    const byteSize = typeof row.byte_size === 'number' && row.byte_size >= 0 ? row.byte_size : null;
    const storagePath =
      typeof row.storage_path === 'string' && row.storage_path.length > 0 && !row.storage_path.includes('..')
        ? row.storage_path
        : null;
    materials.push({
      kind: 'file',
      url,
      label: cleanLabel(row.label) ?? cleanLabel(row.file_name),
      file_name: cleanLabel(row.file_name),
      mime_type: typeof row.mime_type === 'string' ? row.mime_type.slice(0, 120) : null,
      byte_size: byteSize,
      storage_path: storagePath,
    });
  }
  return materials;
}
