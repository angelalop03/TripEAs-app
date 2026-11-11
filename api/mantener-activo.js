// Función serverless de Vercel que se ejecuta una vez al día (ver "crons" en
// vercel.json). Llama a GET /api/salud del backend, que hace una consulta
// real a Supabase. Así:
//  - Supabase (plan gratuito) no pausa el proyecto por 7 días sin actividad.
//  - Render despierta el backend si estaba dormido.
// No forma parte de la app de Expo: Vercel la despliega aparte.
const URL_SALUD = 'https://tripeas-backend.onrender.com/api/salud';

// Render tarda hasta ~1 minuto en despertar; si la primera llamada falla,
// se reintenta una vez antes de dar el día por perdido.
const INTENTOS = 2;
const TIMEOUT_MS = 80000;

async function llamarSalud() {
  const respuesta = await fetch(URL_SALUD, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

module.exports = async function handler(req, res) {
  let ultimoResultado = null;

  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      ultimoResultado = await llamarSalud();
      if (ultimoResultado.status === 200) {
        return res.status(200).json({ ok: true, intento, backend: ultimoResultado.cuerpo });
      }
    } catch (error) {
      ultimoResultado = { error: error.name };
    }
  }

  // 500 para que el fallo quede marcado en los logs de Vercel.
  console.error('No se pudo despertar el backend/Supabase', ultimoResultado);
  return res.status(500).json({ ok: false, resultado: ultimoResultado });
};
