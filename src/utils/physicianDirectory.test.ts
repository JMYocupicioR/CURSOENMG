import { describe, expect, it } from 'vitest';
import { isEditorialOrSpecialist, isTeachingCollaborator } from './physicianDirectory';

const base = {
  roles: [] as ('admin' | 'editor' | 'contributor' | 'student')[],
  show_in_editorial_committee: false,
  is_public: false,
};

describe('physician directory filters', () => {
  it('keeps a content editor out of the teaching list', () => {
    const editor = { ...base, roles: ['editor' as const], show_in_editorial_committee: true };
    expect(isEditorialOrSpecialist(editor)).toBe(true);
    expect(isTeachingCollaborator(editor)).toBe(false);
  });

  it('lists only the contributor role for teaching and revenue share', () => {
    const teacher = { ...base, roles: ['contributor' as const] };
    expect(isTeachingCollaborator(teacher)).toBe(true);
    expect(isEditorialOrSpecialist(teacher)).toBe(false);
  });

  it('keeps someone who teaches and edits in both lists', () => {
    const both = { ...base, roles: ['editor' as const, 'contributor' as const] };
    expect(isTeachingCollaborator(both)).toBe(true);
    expect(isEditorialOrSpecialist(both)).toBe(true);
  });
});
