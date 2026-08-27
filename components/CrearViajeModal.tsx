// Modal para crear un viaje nuevo (POST /api/viajes/crear), medidas
// replicadas del diseño de Figma (frame de referencia 352px de ancho).
// El backend no tiene un campo "destino" propio: se envía dentro de
// descripcion (no hay un campo de descripción libre en este diseño).
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { AcompanantesModal } from '@/components/AcompanantesModal';
import { SelectorFechaModal } from '@/components/SelectorFechaModal';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreado: () => void;
}

const FRAME_WIDTH = 352;
const COLOR_LABEL = '#216489';
const COLOR_PLACEHOLDER = '#6B7B72';
const COLOR_BORDE_CAMPO = '#D4EFF2';

// Subida de portada deshabilitada temporalmente: POST /viajes/subir-portada
// está devolviendo 400 y aún no hemos aislado la causa exacta.
const SUBIDA_PORTADA_DESHABILITADA = true;

// Muestra una fecha ISO "YYYY-MM-DD" como "DD/MM/AAAA"
function formatearFechaVisible(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function CrearViajeModal({ visible, onClose, onCreado }: Props) {
  const { width } = useWindowDimensions();
  const anchoModal = Math.min(width - 32, FRAME_WIDTH);
  const e = (valor: number) => (valor / FRAME_WIDTH) * anchoModal;

  const [nombre, setNombre] = useState('');
  const [destino, setDestino] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [portadaLocal, setPortadaLocal] = useState<string | null>(null);
  const [acompanantes, setAcompanantes] = useState<string[]>([]);
  const [modalAcompanantes, setModalAcompanantes] = useState(false);
  const [campoFechaActivo, setCampoFechaActivo] = useState<'inicio' | 'fin' | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [codigoCreado, setCodigoCreado] = useState('');

  const cerrarYLimpiar = () => {
    setNombre('');
    setDestino('');
    setFechaInicio('');
    setFechaFin('');
    setPortadaLocal(null);
    setAcompanantes([]);
    setCampoFechaActivo(null);
    setError('');
    setCodigoCreado('');
    onClose();
  };

  // TODO: reactivar cuando se resuelva el 400 de POST /viajes/subir-portada
  // (falla al subir la portada al crear un viaje). Mientras tanto avisamos
  // en vez de dejar que el usuario tope con un error críptico.
  const elegirPortada = async () => {
    if (SUBIDA_PORTADA_DESHABILITADA) {
      Alert.alert('Próximamente', 'Podrás añadir una foto de portada muy pronto.');
      return;
    }
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para elegir una portada.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!resultado.canceled && resultado.assets[0]) {
      setPortadaLocal(resultado.assets[0].uri);
    }
  };

  const handleCrear = async () => {
    if (nombre.trim().length === 0) {
      setError('El nombre del viaje es obligatorio');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      let urlPortadaSubida: string | null = null;

      // Si hay foto elegida, se sube ANTES de crear el viaje (el propio
      // viaje todavía no existe en este punto) y se manda ya la URL.
      if (portadaLocal) {
        const formData = new FormData();
        formData.append('archivo', {
          uri: portadaLocal,
          name: 'portada.jpg',
          type: 'image/jpeg',
        } as unknown as Blob);

        const respuestaPortada = await fetchConToken('/viajes/subir-portada', {
          method: 'POST',
          body: formData,
        });
        const datosPortada = await respuestaPortada.json();

        if (!respuestaPortada.ok) {
          setError(datosPortada?.error || 'No se pudo subir la foto de portada');
          return;
        }
        urlPortadaSubida = datosPortada.url_portada;
      }

      const respuesta = await fetchConToken('/viajes/crear', {
        method: 'POST',
        body: JSON.stringify({
          nombre_viaje: nombre.trim(),
          descripcion: destino.trim() || null,
          fecha_inicio: fechaInicio || null,
          fecha_fin: fechaFin || null,
          url_portada: urlPortadaSubida,
        }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos?.error || 'No se pudo crear el viaje');
        return;
      }

      const idViajeCreado = datos.viaje?.id_viaje;

      // Los acompañantes se añaden como usuarios fantasma DESPUÉS de crear
      // el viaje, porque el endpoint necesita un id_viaje ya existente.
      if (idViajeCreado && acompanantes.length > 0) {
        await Promise.all(
          acompanantes.map((nombreAcompanante) =>
            fetchConToken('/participantes/anadir-fantasma', {
              method: 'POST',
              body: JSON.stringify({ id_viaje: idViajeCreado, nombre: nombreAcompanante }),
            }).catch(() => null)
          )
        );
      }

      setCodigoCreado(datos.viaje?.codigo_invitacion ?? '');
      onCreado();
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const campoContenedor = {
    width: '100%' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: e(12),
    backgroundColor: Colors.celesteAgua,
    borderWidth: 1,
    borderColor: COLOR_BORDE_CAMPO,
    borderRadius: e(32),
    paddingHorizontal: e(16),
    paddingVertical: e(16),
  };

  const etiquetaEstilo = {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: e(12),
    letterSpacing: e(0.6),
    color: COLOR_LABEL,
    textTransform: 'uppercase' as const,
    marginBottom: e(8),
  };

  const inputEstilo = {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: e(16),
    color: Colors.azulProfundo,
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={cerrarYLimpiar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View
          style={{
            width: anchoModal,
            maxHeight: '90%',
            backgroundColor: '#FFFFFF',
            borderWidth: 4,
            borderColor: Colors.azulProfundo,
            borderRadius: e(20),
            padding: e(24),
          }}>
          {codigoCreado ? (
            <View style={{ alignItems: 'center', paddingVertical: e(16) }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: Colors.azulProfundo, marginBottom: e(12) }}>
                ¡Viaje creado!
              </Text>
              <Text style={{ color: Colors.azulProfundo, fontSize: e(14), marginBottom: e(12), textAlign: 'center' }}>
                Comparte este código con tu grupo para que se unan:
              </Text>
              <Text
                selectable
                style={{
                  fontSize: e(32),
                  fontWeight: '800',
                  letterSpacing: 4,
                  color: Colors.turquesa,
                  backgroundColor: Colors.celesteAgua,
                  paddingHorizontal: e(24),
                  paddingVertical: e(12),
                  borderRadius: e(16),
                  marginBottom: e(20),
                }}>
                {codigoCreado}
              </Text>
              <Pressable
                style={{ backgroundColor: Colors.turquesa, borderRadius: 999, paddingVertical: e(14), paddingHorizontal: e(40) }}
                onPress={cerrarYLimpiar}>
                <Text style={{ color: Colors.blancoHueso, fontWeight: '600', fontSize: e(15) }}>Listo</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Pressable onPress={cerrarYLimpiar} hitSlop={8} style={{ position: 'absolute', right: 0, top: 0, zIndex: 1 }}>
                <Ionicons name="close" size={e(22)} color={Colors.azulProfundo} />
              </Pressable>

              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontSize: e(28),
                  letterSpacing: e(-0.56),
                  color: Colors.azulProfundo,
                  marginBottom: e(8),
                  paddingRight: e(24),
                }}>
                Comienza tu aventura
              </Text>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: e(16),
                  color: Colors.azulProfundo,
                  marginBottom: e(24),
                }}>
                Planea tu próximo viaje compartido sin estrés.
              </Text>

              <View style={{ marginBottom: e(16) }}>
                <Text style={etiquetaEstilo}>Portada</Text>
                <Pressable
                  onPress={elegirPortada}
                  style={{
                    width: '100%',
                    height: e(120),
                    borderRadius: e(24),
                    overflow: 'hidden',
                    backgroundColor: Colors.celesteAgua,
                    borderWidth: 1,
                    borderColor: COLOR_BORDE_CAMPO,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {portadaLocal ? (
                    <>
                      <Image source={{ uri: portadaLocal }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <Pressable
                        onPress={(evento) => {
                          evento.stopPropagation();
                          setPortadaLocal(null);
                        }}
                        hitSlop={8}
                        style={{
                          position: 'absolute',
                          top: e(8),
                          right: e(8),
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          borderRadius: 999,
                          padding: e(4),
                        }}>
                        <Ionicons name="close" size={e(16)} color="#FFFFFF" />
                      </Pressable>
                    </>
                  ) : (
                    <View style={{ alignItems: 'center', gap: e(6) }}>
                      <Ionicons name="camera-outline" size={e(26)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                      <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_PLACEHOLDER }}>
                        Añadir foto de portada
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>

              <View style={{ marginBottom: e(16) }}>
                <Text style={etiquetaEstilo}>Nombre del viaje</Text>
                <View style={campoContenedor}>
                  <Ionicons name="flag-outline" size={e(18)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                  <TextInput
                    style={inputEstilo}
                    placeholder="Ej: Verano en Mallorca"
                    placeholderTextColor={COLOR_PLACEHOLDER}
                    value={nombre}
                    onChangeText={setNombre}
                  />
                </View>
              </View>

              <View style={{ marginBottom: e(16) }}>
                <Text style={etiquetaEstilo}>Destino</Text>
                <View style={campoContenedor}>
                  <Ionicons name="location-outline" size={e(18)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                  <TextInput
                    style={inputEstilo}
                    placeholder="¿A dónde vamos?"
                    placeholderTextColor={COLOR_PLACEHOLDER}
                    value={destino}
                    onChangeText={setDestino}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: e(16), marginBottom: e(16) }}>
                <View style={{ flex: 1 }}>
                  <Text style={etiquetaEstilo}>Fecha inicio</Text>
                  <Pressable
                    style={[campoContenedor, { paddingVertical: e(14) }]}
                    onPress={() => setCampoFechaActivo('inicio')}>
                    <Ionicons name="calendar-outline" size={e(15)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                    <Text style={[inputEstilo, { fontSize: e(14), color: fechaInicio ? Colors.azulProfundo : COLOR_PLACEHOLDER }]}>
                      {fechaInicio ? formatearFechaVisible(fechaInicio) : 'DD/MM/AAAA'}
                    </Text>
                  </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={etiquetaEstilo}>Fecha fin</Text>
                  <Pressable
                    style={[campoContenedor, { paddingVertical: e(14) }]}
                    onPress={() => setCampoFechaActivo('fin')}>
                    <Ionicons name="calendar-outline" size={e(15)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                    <Text style={[inputEstilo, { fontSize: e(14), color: fechaFin ? Colors.azulProfundo : COLOR_PLACEHOLDER }]}>
                      {fechaFin ? formatearFechaVisible(fechaFin) : 'DD/MM/AAAA'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View
                style={{
                  width: '100%',
                  alignItems: 'center',
                  backgroundColor: '#F4F3F1',
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: '#B9CBC1',
                  borderRadius: e(32),
                  padding: e(24),
                  gap: e(12),
                  marginBottom: e(24),
                }}>
                <View
                  style={{
                    width: e(64),
                    height: e(64),
                    borderRadius: 999,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 2,
                    elevation: 2,
                  }}>
                  <Ionicons name="people-outline" size={e(28)} color={Colors.turquesa} />
                </View>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_700Bold',
                    fontSize: e(22),
                    color: '#1A1C1A',
                    textAlign: 'center',
                  }}>
                  Añade acompañantes
                </Text>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    fontSize: e(14),
                    color: '#3B4A43',
                    textAlign: 'center',
                  }}>
                  Comparte los gastos y la organización con tus amigos.
                </Text>

                {acompanantes.length > 0 && (
                  <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: e(6) }}>
                    {acompanantes.map((nombreAcompanante, indice) => (
                      <View
                        key={`${nombreAcompanante}-${indice}`}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 999,
                          paddingVertical: e(4),
                          paddingHorizontal: e(10),
                        }}>
                        <Text style={{ fontSize: e(11), color: Colors.azulProfundo }}>{nombreAcompanante}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Pressable
                  style={{ backgroundColor: '#98D3FD', borderRadius: 999, paddingVertical: e(8), paddingHorizontal: e(24) }}
                  onPress={() => setModalAcompanantes(true)}>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_600SemiBold',
                      fontSize: e(12),
                      letterSpacing: e(0.6),
                      textTransform: 'uppercase',
                      color: '#145C80',
                    }}>
                    {acompanantes.length > 0 ? `Editar (${acompanantes.length})` : 'Invitar amigos'}
                  </Text>
                </Pressable>
              </View>

              {error ? (
                <Text style={{ color: Colors.rojoSuave, fontSize: e(13), textAlign: 'center', marginBottom: e(12) }}>{error}</Text>
              ) : null}

              <Pressable
                style={{
                  width: '100%',
                  height: e(56),
                  borderRadius: 999,
                  backgroundColor: Colors.turquesa,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: e(8),
                  opacity: isLoading ? 0.7 : 1,
                  shadowColor: '#00E9B0',
                  shadowOpacity: 0.25,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 12,
                  elevation: 4,
                }}
                onPress={handleCrear}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color={Colors.blancoHueso} />
                ) : (
                  <>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: Colors.blancoHueso }}>
                      Crear viaje
                    </Text>
                    <Ionicons name="arrow-forward" size={e(16)} color={Colors.blancoHueso} />
                  </>
                )}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>

      <AcompanantesModal
        visible={modalAcompanantes}
        valorInicial={acompanantes}
        onClose={() => setModalAcompanantes(false)}
        onGuardar={setAcompanantes}
      />

      <SelectorFechaModal
        visible={campoFechaActivo !== null}
        titulo={campoFechaActivo === 'inicio' ? 'Fecha de inicio' : 'Fecha de fin'}
        valor={campoFechaActivo === 'inicio' ? fechaInicio : fechaFin}
        minDate={campoFechaActivo === 'fin' ? fechaInicio || undefined : undefined}
        onClose={() => setCampoFechaActivo(null)}
        onSeleccionar={(fecha) => {
          if (campoFechaActivo === 'inicio') {
            setFechaInicio(fecha);
            if (fechaFin && fecha > fechaFin) setFechaFin('');
          } else if (campoFechaActivo === 'fin') {
            setFechaFin(fecha);
          }
        }}
      />
    </Modal>
  );
}
