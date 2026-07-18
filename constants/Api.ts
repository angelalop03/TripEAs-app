// Cliente HTTP para el backend de TripEAs
import { router } from 'expo-router';

import { borrarSesion, obtenerToken } from '@/hooks/useAuth';

export const API_URL = 'http://192.168.0.52:3000/api';

// fetch que añade automáticamente el header Authorization con el token guardado.
// Si el backend responde 401, limpia la sesión y manda al usuario a login.
export async function fetchConToken(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await obtenerToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const respuesta = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (respuesta.status === 401) {
    await borrarSesion();
    router.replace('/login');
  }

  return respuesta;
}
