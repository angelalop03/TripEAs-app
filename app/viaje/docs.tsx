// Documentos del viaje — medidas replicadas del diseño de Figma (frame de
// referencia 393px). Usa los endpoints reales de /api/documentos (ya
// existían: subir, listar, eliminar), no hizo falta tocar el backend.
// Descarga los PDFs con expo-file-system y los guarda en local para poder
// abrirlos sin conexión (con expo-sharing), tal y como pedía el spec original.
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarraInferiorViaje } from '@/components/BarraInferiorViaje';
import { Logo } from '@/components/Logo';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { volverSeguro } from '@/constants/Navegacion';

const FRAME_WIDTH = 393;
const COLOR_LABEL = '#216489';
const COLOR_MUTED = '#6B7B72';
const COLOR_SUBTITULO = '#3B4A43';

interface Documento {
  id_documento: string;
  nombre_archivo: string;
  url_almacenamiento: string;
  fecha_subida: string;
  usuarios?: { nombre: string };
}

function estiloParaDocumento(nombre: string): { icono: keyof typeof Ionicons.glyphMap; color: string; fondo: string } {
  const n = nombre.toLowerCase();
  if (n.includes('billete') || n.includes('vuelo') || n.includes('boarding')) {
    return { icono: 'airplane-outline', color: '#BA1A1A', fondo: '#FBEAEA' };
  }
  if (n.includes('hotel') || n.includes('reserva') || n.includes('alojam')) {
    return { icono: 'business-outline', color: '#216489', fondo: Colors.celesteAgua };
  }
  if (n.includes('seguro')) {
    return { icono: 'shield-checkmark-outline', color: '#006C50', fondo: '#E6F9EC' };
  }
  return { icono: 'document-text-outline', color: '#6B7B72', fondo: '#F4F3F1' };
}

function formatearRelativo(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const diffMs = Date.now() - fecha.getTime();
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  if (horas < 1) return 'Subido hace un momento';
  if (horas < 24) return `Subido hace ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'Subido ayer';
  return `Subido hace ${dias} días`;
}

export default function DocsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubiendo, setIsSubiendo] = useState(false);
  const [abriendoId, setAbriendoId] = useState<string | null>(null);

  const cargar = useCallback(
    async (mostrarSpinner = false) => {
      if (!id) return;
      if (mostrarSpinner) setIsRefreshing(true);
      try {
        const respuesta = await fetchConToken(`/documentos/${id}`);
        const datos = await respuesta.json();
        if (respuesta.ok) setDocumentos(datos.documentos ?? []);
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

  const subirArchivo = async () => {
    const resultado = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (resultado.canceled || !resultado.assets?.[0]) return;

    const archivo = resultado.assets[0];
    setIsSubiendo(true);
    try {
      const formData = new FormData();
      formData.append('id_viaje', id);
      formData.append('archivo', {
        uri: archivo.uri,
        name: archivo.name,
        type: 'application/pdf',
      } as unknown as Blob);

      const respuesta = await fetchConToken('/documentos/subir', { method: 'POST', body: formData });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        Alert.alert('No se pudo subir', datos?.error || 'Inténtalo de nuevo.');
        return;
      }
      await cargar();
    } catch {
      Alert.alert('Sin conexión', 'No se pudo subir el archivo.');
    } finally {
      setIsSubiendo(false);
    }
  };

  const abrirDocumento = async (documento: Documento) => {
    setAbriendoId(documento.id_documento);
    try {
      const rutaLocal = `${FileSystem.documentDirectory}${documento.nombre_archivo}`;
      const info = await FileSystem.getInfoAsync(rutaLocal);

      if (!info.exists) {
        await FileSystem.downloadAsync(documento.url_almacenamiento, rutaLocal);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(rutaLocal, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('Descargado', 'El archivo se guardó en el dispositivo.');
      }
    } catch {
      Alert.alert('No se pudo abrir', 'Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setAbriendoId(null);
    }
  };

  const opcionesDocumento = (documento: Documento) => {
    Alert.alert(documento.nombre_archivo, undefined, [
      { text: 'Abrir', onPress: () => abrirDocumento(documento) },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          Alert.alert('¿Eliminar documento?', 'Esta acción no se puede deshacer.', [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: async () => {
                try {
                  const respuesta = await fetchConToken(`/documentos/${documento.id_documento}`, { method: 'DELETE' });
                  const datos = await respuesta.json();
                  if (!respuesta.ok) {
                    Alert.alert('No se pudo eliminar', datos?.error || 'Inténtalo de nuevo.');
                    return;
                  }
                  await cargar();
                } catch {
                  Alert.alert('Sin conexión', 'No se pudo eliminar el documento.');
                }
              },
            },
          ]);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const destacado = documentos[0];

  const irATab = (nombre: string) => {
    if (nombre === 'gastos') router.replace({ pathname: '/viaje/[id]/gastos', params: { id } });
    else if (nombre === 'calendario') router.replace({ pathname: '/viaje/[id]/calendario', params: { id } });
    else if (nombre === 'index') router.replace({ pathname: '/viaje/[id]', params: { id } });
    else if (nombre === 'elegir') router.replace({ pathname: '/viaje/[id]/elegir', params: { id } });
  };

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

        <View style={{ paddingHorizontal: e(24), paddingTop: e(24), gap: e(24) }}>
          <View>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: Colors.azulProfundo }}>
              Mis Documentos
            </Text>
            <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: Colors.azulProfundo, marginTop: e(4) }}>
              Guarda y organiza tus archivos de viaje en un solo lugar.
            </Text>
          </View>

          {isLoading ? (
            <ActivityIndicator color={Colors.turquesa} style={{ marginTop: e(20) }} />
          ) : (
            <>
              {destacado && (
                <View style={{ gap: e(16) }}>
                  <Text
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(1.2), textTransform: 'uppercase', color: COLOR_LABEL }}>
                    Destacado
                  </Text>
                  <View
                    style={{
                      width: '100%',
                      borderRadius: e(32),
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#B9CBC1',
                      overflow: 'hidden',
                      shadowColor: '#000000',
                      shadowOpacity: 0.08,
                      shadowOffset: { width: 0, height: 4 },
                      shadowRadius: 20,
                      elevation: 4,
                    }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: COLOR_LABEL,
                        paddingHorizontal: e(16),
                        paddingVertical: e(16),
                      }}>
                      <View>
                        <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.6), color: 'rgba(255,255,255,0.8)' }}>
                          MÁS RECIENTE
                        </Text>
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(20), color: '#FFFFFF', marginTop: e(2) }} numberOfLines={1}>
                          {destacado.nombre_archivo}
                        </Text>
                      </View>
                      <Ionicons name={estiloParaDocumento(destacado.nombre_archivo).icono} size={e(26)} color="#FFFFFF" />
                    </View>

                    <View style={{ padding: e(24), gap: e(16) }}>
                      <View style={{ flexDirection: 'row', gap: e(16) }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.6), color: COLOR_MUTED }}>
                            SUBIDO POR
                          </Text>
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: '#1A1C1A' }} numberOfLines={1}>
                            {destacado.usuarios?.nombre ?? 'Alguien'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.6), color: COLOR_MUTED }}>
                            CUÁNDO
                          </Text>
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: '#1A1C1A' }} numberOfLines={1}>
                            {formatearRelativo(destacado.fecha_subida).replace('Subido ', '')}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => abrirDocumento(destacado)}
                        disabled={abriendoId === destacado.id_documento}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: e(8),
                          backgroundColor: '#00E9B0',
                          borderRadius: 999,
                          paddingVertical: e(14),
                          opacity: abriendoId === destacado.id_documento ? 0.7 : 1,
                        }}>
                        {abriendoId === destacado.id_documento ? (
                          <ActivityIndicator color="#006449" />
                        ) : (
                          <>
                            <Ionicons name="download-outline" size={e(18)} color="#006449" />
                            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: '#006449' }}>Abrir / Descargar</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              <View style={{ gap: e(16) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(1.2), textTransform: 'uppercase', color: COLOR_LABEL }}>
                    Todos los archivos
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: COLOR_MUTED }}>
                    {documentos.length} {documentos.length === 1 ? 'archivo' : 'archivos'}
                  </Text>
                </View>

                {documentos.length === 0 ? (
                  <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_MUTED, textAlign: 'center', paddingVertical: e(12) }}>
                    Todavía no has subido ningún documento.
                  </Text>
                ) : (
                  <View style={{ gap: e(8) }}>
                    {documentos.map((documento) => {
                      const estilo = estiloParaDocumento(documento.nombre_archivo);
                      return (
                        <Pressable
                          key={documento.id_documento}
                          onPress={() => abrirDocumento(documento)}
                          onLongPress={() => opcionesDocumento(documento)}
                          style={{
                            width: '100%',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: e(16),
                            padding: e(16),
                            borderRadius: e(32),
                            backgroundColor: Colors.celesteAgua,
                            borderWidth: 1,
                            borderColor: 'rgba(0, 83, 119, 0.05)',
                          }}>
                          <View style={{ width: e(48), height: e(48), borderRadius: e(32), backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                            {abriendoId === documento.id_documento ? (
                              <ActivityIndicator color={estilo.color} size="small" />
                            ) : (
                              <Ionicons name={estilo.icono} size={e(22)} color={estilo.color} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(16), color: '#1A1C1A' }} numberOfLines={1}>
                              {documento.nombre_archivo}
                            </Text>
                            <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: COLOR_SUBTITULO }}>
                              {formatearRelativo(documento.fecha_subida)}
                            </Text>
                          </View>
                          <Pressable onPress={() => opcionesDocumento(documento)} hitSlop={8}>
                            <Ionicons name="ellipsis-vertical" size={e(18)} color={COLOR_MUTED} />
                          </Pressable>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Zona de subida */}
              <Pressable
                onPress={subirArchivo}
                disabled={isSubiendo}
                style={{
                  width: '100%',
                  alignItems: 'center',
                  gap: e(12),
                  paddingVertical: e(32),
                  paddingHorizontal: e(24),
                  borderRadius: e(32),
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#98D3FD',
                  backgroundColor: '#FFFFFF',
                  marginBottom: e(24),
                }}>
                <View style={{ width: e(72), height: e(72), borderRadius: 999, backgroundColor: Colors.celesteAgua, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cloud-upload-outline" size={e(32)} color={COLOR_LABEL} />
                </View>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: COLOR_LABEL, textAlign: 'center' }}>
                  ¿Nuevo archivo?
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: COLOR_SUBTITULO, textAlign: 'center' }}>
                  Toca aquí para subir un PDF (billetes, reservas, seguros...)
                </Text>
                <Pressable
                  onPress={subirArchivo}
                  disabled={isSubiendo}
                  style={{
                    backgroundColor: '#98D3FD',
                    borderRadius: 999,
                    paddingVertical: e(10),
                    paddingHorizontal: e(32),
                    marginTop: e(8),
                    opacity: isSubiendo ? 0.7 : 1,
                  }}>
                  {isSubiendo ? (
                    <ActivityIndicator color="#145C80" />
                  ) : (
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: '#145C80' }}>Seleccionar Archivo</Text>
                  )}
                </Pressable>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      <BarraInferiorViaje activo="mas" idViaje={id} onPressTab={irATab} />
    </View>
  );
}
