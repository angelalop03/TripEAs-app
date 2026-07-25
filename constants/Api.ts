// Cliente HTTP para el backend de TripEAs
import { router } from 'expo-router';

import { borrarSesion, obtenerToken } from '@/hooks/useAuth';

export const API_URL = 'http://192.168.0.145:3000/api';

const TIMEOUT_MS = 10000;

// fetch con timeout: si el backend no responde en TIMEOUT_MS, aborta la
// petición en vez de dejarla cargando indefinidamente.
async function fetchConTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// fetch a un endpoint público (login, registro): añade la URL base, el
// Content-Type y el timeout, pero sin token de autenticación.
export async function fetchApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  return fetchConTimeout(`${API_URL}${endpoint}`, { ...options, headers });
}

// fetch que añade automáticamente el header Authorization con el token guardado.
// Si el backend responde 401 (token rechazado), limpia la sesión y manda al
// usuario a login. Un error de red/timeout NO borra la sesión: eso se deja
// para que la pantalla que llama decida cómo mostrarlo (ver esErrorDeConexion).
export async function fetchConToken(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await obtenerToken();
  // FormData (subida de archivos) necesita que fetch ponga su propio
  // Content-Type con el boundary del multipart; si lo forzamos a JSON, el
  // backend no puede parsear el archivo.
  const esFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(esFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const respuesta = await fetchConTimeout(`${API_URL}${endpoint}`, { ...options, headers });

  if (respuesta.status === 401) {
    await borrarSesion();
    router.replace('/login');
  }

  return respuesta;
}

// Distingue un timeout/fallo de red (fetch nunca llegó a responder) de un
// error HTTP normal (4xx/5xx), que sí trae una Response.
export function esErrorDeConexion(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || /network/i.test(error.message);
  }
  return false;
}

// Traduce un status HTTP + el body de error del backend a un mensaje
// consistente para mostrar en los formularios de auth.
export function mensajeDeError(status: number, datos: Record<string, unknown> | null): string {
  if (status === 401) return 'Email o contraseña incorrectos';
  if (status === 400) {
    const mensaje = (datos?.error ?? datos?.mensaje) as string | undefined;
    return mensaje || 'Ha ocurrido un error. Inténtalo de nuevo.';
  }
  return 'Ha ocurrido un error. Inténtalo de nuevo.';
}

export const MENSAJE_ERROR_CONEXION = 'No se pudo conectar al servidor. Comprueba tu conexión.';
