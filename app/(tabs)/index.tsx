// Pantalla principal tras el login — lista los viajes del usuario (GET
// /api/viajes/mis-viajes) replicando el diseño de Figma (frame de referencia
// 393px de ancho, escalado al dispositivo). FAB inferior que expande dos
// botones (crear / unirse a un viaje).
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrearViajeModal } from '@/components/CrearViajeModal';
import { SidebarMenu } from '@/components/SidebarMenu';
import { UnirseViajeModal } from '@/components/UnirseViajeModal';
import { esErrorDeConexion, fetchConToken, MENSAJE_ERROR_CONEXION } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { SOMBRA_TARJETA } from '@/constants/Estilos';
import { useAuth } from '@/hooks/useAuth';

const FRAME_WIDTH = 393;

const COLOR_TITULO = '#1A1C1A';
const COLOR_SUBTITULO = '#6B7B72';
const COLOR_ICONO = '#216489';
const COLOR_FECHA = '#3B4A43';

interface Viaje {
  id_viaje: string;
  nombre_viaje: string;
  descripcion: string | null;
  codigo_invitacion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  url_portada: string | null;
  creado_en: string;
  rol: string;
}

function formatearRango(inicio: string | null, fin: string | null) {
  if (!inicio) return 'Fechas por definir';
  const dIni = new Date(inicio);
  const inicioStr = dIni.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  if (!fin) return inicioStr;
  const dFin = new Date(fin);
  const finStr = dFin.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${inicioStr} - ${finStr}`;
}

export default function HomeScreen() {
  const { usuario, actualizarUsuario } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorConexion, setErrorConexion] = useState(false);
  const [fabExpandido, setFabExpandido] = useState(false);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalUnirse, setModalUnirse] = useState(false);
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  // Anima la apertura/cierre del menú del FAB: el fondo se atenúa, las
  // opciones entran deslizándose hacia arriba, y el icono "+" gira 45° para
  // convertirse visualmente en una "x" (sin cambiar de icono).
  const menuAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: fabExpandido ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      // RCTAnimation no existe en web (React Native Web), así que el native
      // driver solo se usa en iOS/Android; en web cae a JS sin avisar.
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fabExpandido, menuAnim]);
  const rotacionFab = menuAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const translateYMenu = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const escalaMenu = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  const cargarViajes = useCallback(async (mostrarSpinner = false) => {
    if (mostrarSpinner) setIsRefreshing(true);
    try {
      const respuesta = await fetchConToken('/viajes/mis-viajes');
      const datos = await respuesta.json();
      if (respuesta.ok) {
        setViajes(datos.viajes ?? []);
        setErrorConexion(false);
      }
    } catch (err) {
      // Timeout/sin conexión: NO tocamos el token ni la sesión, solo lo
      // avisamos y dejamos la última lista de viajes cargada tal cual estaba.
      if (esErrorDeConexion(err)) {
        setErrorConexion(true);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarViajes();
  }, [cargarViajes]);

  // Sesiones antiguas se quedaron con el email guardado como "nombre" (bug ya
  // arreglado en el backend de /auth/login), y sesiones ya abiertas no lo
  // notan solas porque el usuario queda cacheado en AsyncStorage. Al entrar
  // a Home refrescamos el perfil real una vez, así se autocorrige sin tener
  // que cerrar sesión.
  useEffect(() => {
    fetchConToken('/usuarios/perfil')
      .then((respuesta) => respuesta.json().then((datos) => ({ respuesta, datos })))
      .then(({ respuesta, datos }) => {
        if (respuesta.ok && datos.usuario) {
          actualizarUsuario({ nombre: datos.usuario.nombre, url_foto_perfil: datos.usuario.url_foto_perfil });
        }
      })
      .catch(() => {
        // Sin conexión: no pasa nada, se queda con lo que ya había en caché.
      });
  }, [actualizarUsuario]);

  const viajesOrdenados = useMemo(
    () =>
      [...viajes].sort((a, b) => {
        if (!a.fecha_inicio) return 1;
        if (!b.fecha_inicio) return -1;
        return new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime();
      }),
    [viajes]
  );

  const idProximoViaje = useMemo(() => {
    const hoy = new Date();
    const futuros = viajesOrdenados.filter((v) => v.fecha_inicio && new Date(v.fecha_inicio) >= hoy);
    return futuros[0]?.id_viaje ?? null;
  }, [viajesOrdenados]);

  const abrirDetalle = (viaje: Viaje) =>
    router.push({
      pathname: '/viaje/[id]',
      params: {
        id: viaje.id_viaje,
        nombre: viaje.nombre_viaje,
        fechaInicio: viaje.fecha_inicio ?? '',
        fechaFin: viaje.fecha_fin ?? '',
        urlPortada: viaje.url_portada ?? '',
      },
    });

  const iniciales = (usuario?.nombre ?? 'U').trim().charAt(0).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      {/* Navbar */}
      <View
        style={{
          flexDirection: 'row',
          paddingTop: insets.top + e(16),
          paddingHorizontal: e(13),
        }}>
        <Pressable
          onPress={() => setSidebarAbierto(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: e(10),
            backgroundColor: '#FFFFFF',
            borderRadius: 999,
            paddingHorizontal: e(10),
            paddingVertical: e(6),
            ...SOMBRA_TARJETA,
          }}>
          {usuario?.url_foto_perfil ? (
            <Image source={{ uri: usuario.url_foto_perfil }} style={{ width: e(26), height: e(26), borderRadius: e(26) }} resizeMode="cover" />
          ) : (
            <View
              style={{
                width: e(26),
                height: e(26),
                borderRadius: e(26),
                backgroundColor: Colors.celesteAgua,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ color: Colors.azulProfundo, fontSize: e(12), fontWeight: '700' }}>{iniciales}</Text>
            </View>
          )}
          <Text style={{ fontFamily: 'Poppins_500Medium', fontWeight: '600', fontSize: e(14), color: Colors.turquesa }} numberOfLines={1}>
            {usuario?.nombre ?? 'User'}
          </Text>
          <Ionicons name="chevron-down" size={e(14)} color={Colors.turquesa} />
        </Pressable>
      </View>

      {/* Contenido */}
      {isLoading ? (
        errorConexion ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: e(32) }}>
            <Text style={{ color: Colors.rojoSuave, fontSize: e(14), textAlign: 'center', marginBottom: e(12) }}>
              {MENSAJE_ERROR_CONEXION}
            </Text>
            <Pressable
              style={{ backgroundColor: Colors.turquesa, borderRadius: 25, paddingVertical: e(12), paddingHorizontal: e(32) }}
              onPress={() => {
                setIsLoading(true);
                cargarViajes();
              }}>
              <Text style={{ color: Colors.blancoHueso, fontWeight: '600', fontSize: e(14) }}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={Colors.turquesa} size="large" />
          </View>
        )
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: e(24), paddingTop: e(32), paddingBottom: insets.bottom + e(160) }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => cargarViajes(true)} tintColor={Colors.turquesa} />}>
          {errorConexion && (
            <View
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 138, 128, 0.15)',
                borderRadius: e(16),
                paddingVertical: e(10),
                paddingHorizontal: e(14),
                marginBottom: e(16),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: e(8),
              }}>
              <Text style={{ color: Colors.rojoSuave, fontSize: e(12), flex: 1 }}>{MENSAJE_ERROR_CONEXION}</Text>
              <Pressable onPress={() => cargarViajes(true)}>
                <Text style={{ color: Colors.rojoSuave, fontSize: e(12), fontWeight: '700' }}>Reintentar</Text>
              </Pressable>
            </View>
          )}
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: e(28),
              letterSpacing: e(-0.56),
              color: COLOR_TITULO,
              marginBottom: e(8),
            }}>
            Mis viajes
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: e(14),
              color: COLOR_SUBTITULO,
              marginBottom: e(32),
            }}>
            Organiza tus próximas aventuras en grupo.
          </Text>

          {viajesOrdenados.length === 0 ? (
            <View
              style={{
                width: '100%',
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: '#B9CBC1',
                borderRadius: e(32),
                paddingVertical: e(40),
                paddingHorizontal: e(24),
                alignItems: 'center',
              }}>
              <Image
                source={require('@/assets/images/capibara.png')}
                resizeMode="contain"
                style={{ width: e(128), height: e(128), marginBottom: e(16) }}
              />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontSize: e(22),
                  color: COLOR_FECHA,
                  textAlign: 'center',
                  marginBottom: e(8),
                }}>
                No hay viajes
              </Text>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: e(14),
                  color: COLOR_SUBTITULO,
                  textAlign: 'center',
                  marginBottom: e(20),
                }}>
                ¿Crear uno? Invita a tus amigos y deja que Capi te ayude con el estrés.
              </Text>
              <Pressable
                style={{
                  backgroundColor: Colors.turquesa,
                  borderRadius: 25,
                  paddingVertical: e(14),
                  paddingHorizontal: e(36),
                }}
                onPress={() => setModalCrear(true)}>
                <Text style={{ color: Colors.blancoHueso, fontWeight: '600', fontSize: e(15) }}>Crear viaje</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={{ gap: e(16) }}>
                {viajesOrdenados.map((viaje) => {
                  const destacado = viaje.id_viaje === idProximoViaje;
                  return (
                    <Pressable
                      key={viaje.id_viaje}
                      onPress={() => abrirDetalle(viaje)}
                      style={{
                        width: '100%',
                        backgroundColor: destacado ? Colors.amarillo : Colors.celesteAgua,
                        borderWidth: 1,
                        borderColor: 'rgba(0, 83, 119, 0.05)',
                        borderRadius: e(32),
                        padding: e(24),
                        gap: e(16),
                        overflow: 'hidden',
                        ...SOMBRA_TARJETA,
                      }}>
                      {destacado && (
                        <View
                          style={{
                            alignSelf: 'flex-start',
                            backgroundColor: 'rgba(255,255,255,0.5)',
                            borderRadius: 999,
                            paddingHorizontal: e(12),
                            paddingVertical: e(4),
                          }}>
                          <Text
                            style={{
                              fontFamily: 'PlusJakartaSans_600SemiBold',
                              fontSize: e(12),
                              letterSpacing: e(0.6),
                              color: COLOR_ICONO,
                            }}>
                            PRÓXIMO
                          </Text>
                        </View>
                      )}

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text
                          style={{
                            fontFamily: 'PlusJakartaSans_700Bold',
                            fontSize: e(22),
                            color: COLOR_TITULO,
                            flex: 1,
                          }}
                          numberOfLines={1}>
                          {viaje.nombre_viaje}
                        </Text>
                        <Ionicons name="airplane-outline" size={e(20)} color={COLOR_ICONO} />
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8) }}>
                        <Ionicons name="calendar-outline" size={e(14)} color={COLOR_ICONO} />
                        <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: COLOR_FECHA }}>
                          {formatearRango(viaje.fecha_inicio, viaje.fecha_fin)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View
                style={{
                  width: '100%',
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#B9CBC1',
                  borderRadius: e(32),
                  paddingVertical: e(24),
                  paddingHorizontal: e(24),
                  alignItems: 'center',
                  marginTop: e(32),
                }}>
                <Image
                  source={require('@/assets/images/capibara.png')}
                  resizeMode="contain"
                  style={{ width: e(128), height: e(128), marginBottom: e(16) }}
                />
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: e(22),
                    color: COLOR_FECHA,
                    textAlign: 'center',
                    marginBottom: e(8),
                  }}>
                  ¿Planeando algo nuevo?
                </Text>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    fontSize: e(14),
                    color: COLOR_SUBTITULO,
                    textAlign: 'center',
                  }}>
                  Invita a tus amigos y deja que Capi te ayude con el estrés.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <Animated.View
        pointerEvents={fabExpandido ? 'auto' : 'none'}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1A1C1A', opacity: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }) }}>
        <Pressable style={{ flex: 1 }} onPress={() => setFabExpandido(false)} />
      </Animated.View>

      <View style={{ position: 'absolute', bottom: insets.bottom + e(60), left: 0, right: 0, alignItems: 'center' }}>
        <Animated.View
          pointerEvents={fabExpandido ? 'auto' : 'none'}
          style={{
            gap: e(12),
            marginBottom: e(16),
            alignItems: 'center',
            opacity: menuAnim,
            transform: [{ translateY: translateYMenu }, { scale: escalaMenu }],
          }}>
          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: e(8),
              backgroundColor: Colors.turquesa,
              borderRadius: 999,
              paddingVertical: e(14),
              paddingHorizontal: e(26),
              shadowColor: '#00E9B0',
              shadowOpacity: 0.35,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 10,
              elevation: 5,
            }}
            onPress={() => {
              setFabExpandido(false);
              setModalCrear(true);
            }}>
            <Ionicons name="add-circle" size={e(20)} color="#FFFFFF" />
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(15), color: '#FFFFFF' }}>Crear grupo</Text>
          </Pressable>

          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: e(8),
              backgroundColor: '#FFFFFF',
              borderWidth: 2,
              borderColor: Colors.turquesa,
              borderRadius: 999,
              paddingVertical: e(13),
              paddingHorizontal: e(26),
              shadowColor: '#000000',
              shadowOpacity: 0.08,
              shadowOffset: { width: 0, height: 3 },
              shadowRadius: 8,
              elevation: 3,
            }}
            onPress={() => {
              setFabExpandido(false);
              setModalUnirse(true);
            }}>
            <Ionicons name="enter-outline" size={e(18)} color={Colors.turquesa} />
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(15), color: Colors.turquesa }}>Unirse a viaje</Text>
          </Pressable>
        </Animated.View>

        <Pressable
          style={{
            width: e(56),
            height: e(56),
            borderRadius: 999,
            backgroundColor: Colors.turquesa,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#00E9B0',
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: 8,
          }}
          onPress={() => setFabExpandido((v) => !v)}>
          <Animated.View style={{ transform: [{ rotate: rotacionFab }] }}>
            <Ionicons name="add" size={e(26)} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
      </View>

      <CrearViajeModal
        visible={modalCrear}
        onClose={() => setModalCrear(false)}
        onCreado={() => cargarViajes(true)}
      />
      <UnirseViajeModal
        visible={modalUnirse}
        onClose={() => setModalUnirse(false)}
        onUnido={() => cargarViajes(true)}
        onCrearOtro={() => {
          setModalUnirse(false);
          setModalCrear(true);
        }}
      />

      <SidebarMenu visible={sidebarAbierto} onClose={() => setSidebarAbierto(false)} />
    </View>
  );
}
