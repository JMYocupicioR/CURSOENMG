function rawMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return '';
}

function isMissingTable(err: unknown, message: string): boolean {
  const code =
    err && typeof err === 'object' && 'code' in err && typeof err.code === 'string' ? err.code : '';
  return code === 'PGRST205' || /schema cache|could not find the table/i.test(message);
}

/** El 404 de PostgREST no es un Error: sin esto el editor solo dice «No se pudo publicar». */
export function agreementStoreError(err: unknown, fallback: string, migrationFile: string): Error {
  const message = rawMessage(err);
  if (isMissingTable(err, message)) {
    return new Error(
      `No se puede guardar porque la tabla todavía no está en Supabase. En el SQL Editor del proyecto ejecuta supabase/migrations/${migrationFile} y recarga esta página.`
    );
  }
  if (err instanceof Error && message) return err;
  return new Error(message || fallback);
}
