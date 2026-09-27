import { describe, expect, it } from 'vitest';
import {
  ASSIGNMENT_MATERIAL_MAX_BYTES,
  assignmentMaterialFileError,
  assignmentMaterialLinkError,
  normalizeAssignmentMaterials,
} from './assignmentMaterials';

function sizedFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('assignmentMaterialFileError', () => {
  it('acepta imagen, pdf y video dentro de 50 MB', () => {
    expect(assignmentMaterialFileError(sizedFile('trazo.png', 'image/png', 2_000_000))).toBeNull();
    expect(assignmentMaterialFileError(sizedFile('guia.pdf', 'application/pdf', 8_000_000))).toBeNull();
    expect(assignmentMaterialFileError(sizedFile('clase.mp4', 'video/mp4', 40 * 1024 * 1024))).toBeNull();
  });

  it('rechaza archivos por encima del límite del plan gratuito y ejecutables', () => {
    expect(
      assignmentMaterialFileError(sizedFile('clase.mp4', 'video/mp4', ASSIGNMENT_MATERIAL_MAX_BYTES + 1))
    ).toMatch(/50 MB/);
    expect(assignmentMaterialFileError(sizedFile('setup.exe', 'application/octet-stream', 1200))).toMatch(
      /no se puede subir/
    );
    expect(assignmentMaterialFileError(sizedFile('vacio.pdf', 'application/pdf', 0))).toMatch(/vacío/);
  });

  it('limita la cantidad de archivos', () => {
    expect(assignmentMaterialFileError(sizedFile('a.pdf', 'application/pdf', 10), 4)).toMatch(/4 archivos/);
  });
});

describe('assignmentMaterialLinkError', () => {
  it('acepta cualquier enlace https', () => {
    expect(assignmentMaterialLinkError('https://www.youtube.com/watch?v=abc')).toBeNull();
    expect(assignmentMaterialLinkError('https://drive.google.com/file/d/abc/view')).toBeNull();
  });

  it('rechaza http y texto vacío', () => {
    expect(assignmentMaterialLinkError('http://ejemplo.com/guia.pdf')).toMatch(/https/);
    expect(assignmentMaterialLinkError('  ')).toMatch(/enlace/i);
  });
});

describe('normalizeAssignmentMaterials', () => {
  it('conserva archivos y enlaces https y descarta el resto', () => {
    const items = normalizeAssignmentMaterials([
      { kind: 'file', url: 'https://cdn.example/guia.pdf', file_name: 'guia.pdf', byte_size: 12 },
      { kind: 'link', url: 'https://youtu.be/abc', label: 'Clase' },
      { kind: 'link', url: 'javascript:alert(1)' },
      { kind: 'file', url: 'http://insecure.example/a.pdf' },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]?.kind).toBe('file');
    expect(items[1]?.label).toBe('Clase');
  });
});
