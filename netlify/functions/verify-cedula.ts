import { lookupSepCedula, normalizeCedula } from '../../server/sepCedulaLookup.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json; charset=utf-8',
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  try {
    const url = new URL(req.url);
    let cedula = url.searchParams.get('cedula');

    if (!cedula && req.method === 'POST') {
      try {
        const body = (await req.json()) as { cedula?: string };
        cedula = body.cedula ?? null;
      } catch {}
    }

    if (!cedula || typeof cedula !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Número de cédula requerido' }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const cleanCedula = normalizeCedula(cedula);
    if (cleanCedula.length < 5 || cleanCedula.length > 10) {
      return new Response(JSON.stringify({ success: false, error: 'Formato de cédula no válido' }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const items = await lookupSepCedula(cleanCedula);
    return new Response(JSON.stringify({ success: true, items }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err: unknown) {
    const status =
      typeof err === 'object' && err && 'status' in err
        ? Number((err as { status?: number }).status)
        : 500;
    const message = err instanceof Error ? err.message : 'Error interno al consultar SEP';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: Number.isFinite(status) && status >= 400 ? status : 500,
      headers: JSON_HEADERS,
    });
  }
};
