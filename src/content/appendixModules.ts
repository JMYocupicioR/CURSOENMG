/** Modules the student can open, but that do not count as curriculum lessons. */
const APPENDIX_MODULE_IDS = new Set(['bibliography']);

export function isAppendixModule(moduleId: string | null | undefined): boolean {
  return Boolean(moduleId && APPENDIX_MODULE_IDS.has(moduleId));
}
