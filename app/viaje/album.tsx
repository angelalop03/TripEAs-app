// Álbum del viaje — medidas replicadas del diseño de Figma (frame de
// referencia 393px). Usa los endpoints reales de /api/album (ya existían:
// subir, listar, eliminar); solo se añadió id_subido_por al SELECT de
// obtenerAlbum para poder mostrar el botón de eliminar solo al dueño.
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarraInferiorViaje } from '@/components/BarraInferiorViaje';
import { Logo } from '@/components/Logo';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { volverSeguro } from '@/constants/Navegacion';
import { useAuth } from '@/hooks/useAuth';

const FRAME_WIDTH = 393;
const COLOR_SUBTITULO = '#3B4A43';
const COLOR_TEAL_OSCURO = '#006878';

interface Archivo {
  id_archivo: string;
  id_subido_por: string;
  url_multimedia: string;
  tipo: 'foto' | 'video';
  fecha_subida: string;
  usuarios?: { nombre: string };
}

interface ArchivoLocal {
  uri: string;
  name: string;
  mimeType: string;
}

// Ritmo de alturas al estilo masonry de Figma (alta / cuadrada / ancha),
// cíclico para que funcione con cualquier número de fotos reales.
const RATIOS_MASONRY = [4 / 3, 1, 3 / 2];

function esNuevo(fechaISO: string): boolean {
  return Date.now() - new Date(fechaISO).getTime() < 1000 * 60 * 60 * 24;
}

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [nombreViaje, setNombreViaje] = useState('');
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [modalSubir, setModalSubir] = useState(false);
  const [seleccionados, setSeleccionados] = useState<ArchivoLocal[]>([]);
  const [subiendoTodo, setSubiendoTodo] = useState(false);

  const [previsualizado, setPrevisualizado] = useState<Archivo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(
    async (mostrarSpinner = false) => {
      if (!id) return;
      if (mostrarSpinner) setIsRefreshing(true);
      try {
        const [respViaje, respAlbum] = await Promise.all([
          fetchConToken(`/viajes/${id}`),
          fetchConToken(`/album/${id}`),
        ]);
        const datosViaje = await respViaje.json();
        const datosAlbum = await respAlbum.json();
        if (respViaje.ok) setNombreViaje(datosViaje.viaje?.nombre_viaje ?? '');
        if (respAlbum.ok) setArchivos(datosAlbum.archivos ?? []);
      } catch {
        // Sin conexión: se queda con lo último cargado.
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const columnas = useMemo(() => {
    const izquierda: Archivo[] = [];
    const derecha: Archivo[] = [];
    archivos.forEach((archivo, indice) => (indice % 2 === 0 ? izquierda : derecha).push(archivo));
    return [izquierda, derecha];
  }, [archivos]);

  const irATab = (nombre: string) => {
    if (nombre === 'gastos') router.replace({ pathname: '/viaje/[id]/gastos', params: { id } });
    else if (nombre === 'calendario') router.replace({ pathname: '/viaje/[id]/calendario', params: { id } });
    else if (nombre === 'index') router.replace({ pathname: '/viaje/[id]', params: { id } });
    else if (nombre === 'elegir') router.replace({ pathname: '/viaje/[id]/elegir', params: { id } });
  };

  const elegirArchivos = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para subir recuerdos.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      // Fuerza la representación "compatible" (JPEG) en iOS: por defecto
      // ("Automatic") la galería puede devolver el HEIC nativo de la
      // cámara del iPhone, que no se decodifica en Android ni en la
      // versión web, dejando la foto subida pero invisible en el álbum.
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (resultado.canceled) return;

    const nuevos = resultado.assets.map((asset, indice) => ({
      uri: asset.uri,
      name: asset.fileName ?? `recuerdo_${Date.now()}_${indice}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    }));
    setSeleccionados((previos) => [...previos, ...nuevos.filter((n) => !previos.some((p) => p.uri === n.uri))]);
  };

  const quitarSeleccionado = (uri: string) => {
    setSeleccionados((previos) => previos.filter((archivo) => archivo.uri !== uri));
  };

  const cerrarModalSubir = () => {
    setModalSubir(false);
    setSeleccionados([]);
  };

  const subirTodo = async () => {
    if (!id || seleccionados.length === 0) return;
    setSubiendoTodo(true);
    try {
      const resultados = await Promise.allSettled(
        seleccionados.map(async (archivo) => {
          const formData = new FormData();
          formData.append('id_viaje', id);

          if (Platform.OS === 'web') {
            // En web, `archivo.uri` es un blob:/data: URL, no una ruta de
            // fichero nativa: adjuntar el objeto {uri, name, type} no
            // adjunta ningún archivo real y la subida falla en silencio.
            // Hay que resolver ese URI a un Blob real antes de adjuntarlo.
            const respuestaBlob = await fetch(archivo.uri);
            const blob = await respuestaBlob.blob();
            formData.append('archivo', blob, archivo.name);
          } else {
            formData.append('archivo', {
              uri: archivo.uri,
              name: archivo.name,
              type: archivo.mimeType,
            } as unknown as Blob);
          }

          const respuesta = await fetchConToken('/album/subir', { method: 'POST', body: formData });
          if (!respuesta.ok) throw new Error();
        })
      );

      const fallidos = resultados.filter((r) => r.status === 'rejected').length;
      if (fallidos > 0) {
        Alert.alert('Algunos archivos no se subieron', `${fallidos} de ${seleccionados.length} archivo(s) fallaron. Inténtalo de nuevo con esos.`);
      }
      await cargar();
      cerrarModalSubir();
    } catch {
      Alert.alert('Sin conexión', 'No se pudieron subir los archivos.');
    } finally {
      setSubiendoTodo(false);
    }
  };

  const eliminarArchivo = async (archivo: Archivo) => {
    setEliminando(true);
    try {
      const respuesta = await fetchConToken(`/album/${archivo.id_archivo}`, { method: 'DELETE' });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        Alert.alert('No se pudo eliminar', datos?.error || 'Inténtalo de nuevo.');
        return;
      }
      setPrevisualizado(null);
      await cargar();
    } catch {
      Alert.alert('Sin conexión', 'No se pudo eliminar el archivo.');
    } finally {
      setEliminando(false);
    }
  };

  const anchoModal = Math.min(width - 32, 355);
  const em = (valor: number) => (valor / 355) * anchoModal;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: e(24) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => cargar(true)} tintColor={Colors.turquesa} />}>
        {/* Navbar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8), paddingTop: insets.top + e(8), paddingHorizontal: e(9) }}>
          <Pressable onPress={() => volverSeguro({ pathname: '/viaje/[id]', params: { id } })} hitSlop={8}>
            <Ionicons name="chevron-back" size={e(22)} color={Colors.turquesa} />
          </Pressable>
          <Logo size={e(20)} />
        </View>

        <View style={{ paddingHorizontal: e(24), paddingTop: e(24) }}>
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(28), letterSpacing: e(-0.56), color: Colors.azulProfundo }}>
            Álbum del Viaje
          </Text>
          <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: Colors.azulProfundo, opacity: 0.8, marginTop: e(4) }}>
            {nombreViaje ? `Recuerdos de ${nombreViaje}` : 'Recuerdos compartidos del viaje'}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.turquesa} style={{ marginTop: e(40) }} />
        ) : archivos.length === 0 ? (
          <View style={{ alignItems: 'center', paddingHorizontal: e(24), paddingTop: e(48) }}>
            <Image source={require('@/assets/images/capibara-photo.png')} resizeMode="contain" style={{ width: e(140), height: e(140), marginBottom: e(12) }} />
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(17), color: Colors.azulProfundo, marginBottom: e(4) }}>
              Aún no hay recuerdos
            </Text>
            <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_SUBTITULO, textAlign: 'center' }}>
              Sube la primera foto o vídeo del viaje.
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', paddingHorizontal: e(24), gap: e(12), marginTop: e(8) }}>
            {columnas.map((columna, indiceColumna) => (
              <View key={indiceColumna} style={{ flex: 1, gap: e(12) }}>
                {columna.map((archivo, indiceFila) => {
                  const ratio = archivo.tipo === 'video' ? 1 : RATIOS_MASONRY[indiceFila % RATIOS_MASONRY.length];
                  return (
                    <Pressable
                      key={archivo.id_archivo}
                      onPress={() => setPrevisualizado(archivo)}
                      style={{ width: '100%', aspectRatio: 1 / ratio, borderRadius: e(24), overflow: 'hidden', backgroundColor: '#F4F3F1' }}>
                      {archivo.tipo === 'video' ? (
                        <View style={{ flex: 1, backgroundColor: '#2A3B44', alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{ width: e(40), height: e(40), borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="play" size={e(18)} color={COLOR_TEAL_OSCURO} />
                          </View>
                        </View>
                      ) : (
                        <Image source={{ uri: archivo.url_multimedia }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      )}

                      {esNuevo(archivo.fecha_subida) && (
                        <View
                          style={{
                            position: 'absolute',
                            top: e(10),
                            left: e(10),
                            backgroundColor: 'rgba(111, 220, 245, 0.85)',
                            borderRadius: 999,
                            paddingHorizontal: e(8),
                            paddingVertical: e(4),
                          }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(9), letterSpacing: e(0.5), textTransform: 'uppercase', color: '#00606F' }}>
                            Nuevo
                          </Text>
                        </View>
                      )}

                      {archivo.usuarios?.nombre && (
                        <View
                          style={{
                            position: 'absolute',
                            bottom: e(10),
                            left: e(10),
                            width: e(26),
                            height: e(26),
                            borderRadius: 999,
                            backgroundColor: Colors.turquesa,
                            borderWidth: e(2),
                            borderColor: '#FAF9F6',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(11), color: '#FFFFFF' }}>
                            {archivo.usuarios.nombre.trim().charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botón flotante para subir — bottom calculado con insets.bottom
          (no un valor fijo) para que no quede tapado por BarraInferiorViaje
          en dispositivos con home indicator. */}
      <Pressable
        onPress={() => setModalSubir(true)}
        style={{
          position: 'absolute',
          right: e(19),
          bottom: insets.bottom + 84,
          width: e(56),
          height: e(56),
          borderRadius: e(28),
          backgroundColor: Colors.turquesa,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000000',
          shadowOpacity: 0.2,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 12,
          elevation: 6,
        }}>
        <Ionicons name="camera" size={e(24)} color="#FFFFFF" />
      </Pressable>

      <BarraInferiorViaje activo="mas" idViaje={id} onPressTab={irATab} />

      {/* Modal: Subir Recuerdos */}
      <Modal visible={modalSubir} transparent animationType="fade" onRequestClose={cerrarModalSubir}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ width: anchoModal, maxHeight: '85%', backgroundColor: '#FAF9F6', borderRadius: em(18) }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: em(22),
                paddingVertical: em(16),
                borderBottomWidth: 1,
                borderBottomColor: '#E3E2E0',
              }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: em(18), color: COLOR_TEAL_OSCURO }}>Subir Recuerdos</Text>
              <Pressable onPress={cerrarModalSubir} hitSlop={8}>
                <Ionicons name="close" size={em(20)} color={COLOR_SUBTITULO} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: em(22), gap: em(16) }} keyboardShouldPersistTaps="handled">
              <View
                style={{
                  width: '100%',
                  minHeight: em(220),
                  borderRadius: em(32),
                  backgroundColor: 'rgba(223, 247, 249, 0.5)',
                  borderWidth: em(2.5),
                  borderColor: '#FAF9F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: em(24),
                  gap: em(8),
                }}>
                <View style={{ position: 'relative', width: em(88), height: em(88), alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={require('@/assets/images/capibara-photo.png')} resizeMode="contain" style={{ width: em(88), height: em(88) }} />
                  <View
                    style={{
                      position: 'absolute',
                      right: -em(4),
                      bottom: -em(4),
                      width: em(28),
                      height: em(28),
                      borderRadius: 999,
                      backgroundColor: Colors.turquesa,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name="camera" size={em(13)} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: em(14), color: '#00606F', textAlign: 'center', paddingHorizontal: em(12) }}>
                  ¡Suelta tus fotos aquí o búscalas en tu galería!
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: em(13), color: COLOR_SUBTITULO, opacity: 0.7 }}>
                  JPG, PNG o HEIC hasta 20MB
                </Text>
              </View>

              {seleccionados.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: em(10) }}>
                  {seleccionados.map((archivo) => (
                    <View key={archivo.uri} style={{ width: em(72), height: em(72) }}>
                      <Image source={{ uri: archivo.uri }} style={{ width: '100%', height: '100%', borderRadius: em(16) }} resizeMode="cover" />
                      <Pressable
                        onPress={() => quitarSeleccionado(archivo.uri)}
                        hitSlop={8}
                        style={{ position: 'absolute', top: -em(6), right: -em(6), backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, padding: em(3) }}>
                        <Ionicons name="close" size={em(12)} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}

              <Pressable
                onPress={elegirArchivos}
                style={{
                  flexDirection: 'row',
                  alignSelf: 'center',
                  alignItems: 'center',
                  gap: em(8),
                  backgroundColor: Colors.turquesa,
                  borderRadius: 999,
                  paddingVertical: em(13),
                  paddingHorizontal: em(28),
                }}>
                <Ionicons name="images-outline" size={em(16)} color="#FFFFFF" />
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: em(14), color: '#FFFFFF' }}>
                  {seleccionados.length > 0 ? `Añadir más (${seleccionados.length})` : 'Seleccionar Archivos'}
                </Text>
              </Pressable>
            </ScrollView>

            <View
              style={{
                paddingHorizontal: em(22),
                paddingTop: em(16),
                paddingBottom: em(24),
                backgroundColor: 'rgba(239, 238, 235, 0.8)',
                borderBottomLeftRadius: em(18),
                borderBottomRightRadius: em(18),
              }}>
              <Pressable
                onPress={subirTodo}
                disabled={subiendoTodo || seleccionados.length === 0}
                style={{
                  width: '100%',
                  height: em(50),
                  borderRadius: 999,
                  backgroundColor: COLOR_TEAL_OSCURO,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: seleccionados.length === 0 ? 0.5 : subiendoTodo ? 0.8 : 1,
                }}>
                {subiendoTodo ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: em(14.5), color: '#FFFFFF' }}>
                    {seleccionados.length > 0 ? `Subir todo (${seleccionados.length})` : 'Subir todo'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Visor a pantalla completa */}
      <Modal visible={!!previsualizado} transparent animationType="fade" onRequestClose={() => setPrevisualizado(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
          <Pressable
            onPress={() => setPrevisualizado(null)}
            hitSlop={8}
            style={{ position: 'absolute', top: insets.top + 16, right: 20, zIndex: 1 }}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>

          {previsualizado && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              {previsualizado.tipo === 'foto' ? (
                <Image source={{ uri: previsualizado.url_multimedia }} style={{ width: '100%', height: '70%' }} resizeMode="contain" />
              ) : (
                <View style={{ width: '100%', height: '70%', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="videocam-outline" size={64} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', marginTop: 8, opacity: 0.7 }}>Vista previa de vídeo no disponible</Text>
                </View>
              )}

              <View style={{ marginTop: 16, alignItems: 'center', gap: 4 }}>
                {previsualizado.usuarios?.nombre && (
                  <Text style={{ color: '#FFFFFF', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 }}>
                    Subido por {previsualizado.usuarios.nombre}
                  </Text>
                )}
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  {new Date(previsualizado.fecha_subida).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </View>

              {previsualizado.id_subido_por === usuario?.id && (
                <Pressable
                  onPress={() =>
                    Alert.alert('¿Eliminar este recuerdo?', 'Esta acción no se puede deshacer.', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarArchivo(previsualizado) },
                    ])
                  }
                  disabled={eliminando}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 20,
                    backgroundColor: 'rgba(255,138,128,0.15)',
                    borderRadius: 999,
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                  }}>
                  {eliminando ? (
                    <ActivityIndicator color={Colors.rojoSuave} size="small" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color={Colors.rojoSuave} />
                      <Text style={{ color: Colors.rojoSuave, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>Eliminar</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
