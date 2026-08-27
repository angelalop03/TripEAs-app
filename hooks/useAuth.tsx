// Gestión de sesión: token + usuario en AsyncStorage, expuestos vía contexto
// para que login/signup y el guard de app/_layout.tsx compartan el mismo estado.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const TOKEN_KEY = 'tripeas_token';
const USER_KEY = 'tripeas_usuario';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  url_foto_perfil?: string | null;
}

// Helpers standalone (sin React) para que constants/Api.ts pueda leer/borrar
// la sesión fuera de un componente.
export async function obtenerToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function borrarSesion(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

// El backend no devuelve el mismo shape de "usuario" en login (usuario de
// Supabase Auth: id, email, sin nombre) que en registro (fila de la tabla
// "usuarios": id_usuario, nombre, email). Esto normaliza ambos a Usuario.
export function normalizarUsuario(datos: Record<string, unknown>): Usuario {
  const usuarioMetadata = datos.user_metadata as Record<string, unknown> | undefined;
  return {
    id: String(datos.id ?? datos.id_usuario ?? ''),
    nombre: String(datos.nombre ?? usuarioMetadata?.nombre ?? datos.email ?? 'Usuario'),
    email: String(datos.email ?? ''),
    url_foto_perfil: (datos.url_foto_perfil as string | null | undefined) ?? null,
  };
}

interface AuthContextValue {
  token: string | null;
  usuario: Usuario | null;
  isLoading: boolean;
  login: (token: string, usuario: Usuario) => Promise<void>;
  logout: () => Promise<void>;
  actualizarUsuario: (cambios: Partial<Usuario>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedToken, storedUsuario] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
      setToken(storedToken[1]);
      setUsuario(storedUsuario[1] ? JSON.parse(storedUsuario[1]) : null);
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (nuevoToken: string, nuevoUsuario: Usuario) => {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, nuevoToken],
      [USER_KEY, JSON.stringify(nuevoUsuario)],
    ]);
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
  }, []);

  const logout = useCallback(async () => {
    await borrarSesion();
    setToken(null);
    setUsuario(null);
  }, []);

  // Actualiza el usuario en memoria + AsyncStorage tras editar el perfil,
  // sin necesidad de volver a hacer login para que el resto de la app
  // (sidebar, etc.) refleje el nombre/foto nuevos al instante.
  const actualizarUsuario = useCallback(async (cambios: Partial<Usuario>) => {
    setUsuario((previo) => {
      if (!previo) return previo;
      const nuevo = { ...previo, ...cambios };
      AsyncStorage.setItem(USER_KEY, JSON.stringify(nuevo));
      return nuevo;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ token, usuario, isLoading, login, logout, actualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
