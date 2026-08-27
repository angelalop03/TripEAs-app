// Ajustes del viaje — nombre, portada, fechas, código de invitación y
// participantes. Nombre/portada/fechas solo son editables por el admin
// del viaje (mismo criterio que anadirFantasma en el backend); cualquier
// participante puede ver y compartir el código de invitación.
// No existe GET /viajes/:id, así que esta pantalla lo añade junto con
// PUT /viajes/:id (ver tripeas-backend/src/controllers/viajesController.js).
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarraInferiorViaje } from '@/components/BarraInferiorViaje';
import { Logo } from '@/components/Logo';
import { SelectorFechaModal } from '@/components/SelectorFechaModal';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { volverSeguro } from '@/constants/Navegacion';
import { useAuth } from '@/hooks/useAuth';

const FRAME_WIDTH = 393;
const COLOR_LABEL = '#216489';
const COLOR_MUTED = '#6B7B72';
const COLOR_BORDE_CAMPO = '#D4EFF2';
const COLOR_TITULO = '#1A1C1A';

// Subida de portada deshabilitada temporalmente: POST /viajes/subir-portada
// está devolviendo 400 y aún no hemos aislado la causa exacta.
const SUBIDA_PORTADA_DESHABILITADA = true;

interface Viaje {
  id_viaje: string;
  nombre_viaje: string;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  url_portada: string | null;
  codigo_invitacion: string;
  tu_rol: 'admin' | 'miembro';
}

interface Participante {
  id_usuario: string;
  nombre: string;
  email: string | null;
  url_foto_perfil: string | null;
  rol: 'admin' | 'miembro';
  es_fantasma: boolean;
}

function formatearFechaVisible(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio}`;
}

function Inicial({ nombre, tamano }: { nombre: string; tamano: number }) {
  return (
    <View
      style={{
        width: tamano,
        height: tamano,
        borderRadius: 999,
        backgroundColor: Colors.celesteAgua,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontWeight: '700', fontSize: tamano * 0.4, color: Colors.azulProfundo }}>
        {nombre.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function AjustesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editando, setEditando] = useState(false);
  const [nombreEdit, setNombreEdit] = useState('');
  const [destinoEdit, setDestinoEdit] = useState('');
  const [fechaInicioEdit, setFechaInicioEdit] = useState('');
  const [fechaFinEdit, setFechaFinEdit] = useState('');
  const [portadaLocal, setPortadaLocal] = useState<string | null>(null);
  const [campoFechaActivo, setCampoFechaActivo] = useState<'inicio' | 'fin' | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');

  const [modalAnadir, setModalAnadir] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [anadiendo, setAnadiendo] = useState(false);
  const [errorAnadir, setErrorAnadir] = useState('');

  const esAdmin = viaje?.tu_rol === 'admin';

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const [respViaje, respParticipantes] = await Promise.all([
        fetchConToken(`/viajes/${id}`),
        fetchConToken(`/participantes/${id}`),
      ]);
      const datosViaje = await respViaje.json();
      const datosParticipantes = await respParticipantes.json();
      if (respViaje.ok) setViaje(datosViaje.viaje);
      if (respParticipantes.ok) setParticipantes(datosParticipantes.participantes ?? []);
    } catch {
      // Sin conexión: se queda con lo último cargado.
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const irATab = (nombre: string) => {
    if (nombre === 'gastos') router.replace({ pathname: '/viaje/[id]/gastos', params: { id } });
    else if (nombre === 'calendario') router.replace({ pathname: '/viaje/[id]/calendario', params: { id } });
    else if (nombre === 'index') router.replace({ pathname: '/viaje/[id]', params: { id } });
    else if (nombre === 'elegir') router.replace({ pathname: '/viaje/[id]/elegir', params: { id } });
  };

  const empezarEdicion = () => {
    if (!viaje) return;
    setNombreEdit(viaje.nombre_viaje);
    setDestinoEdit(viaje.descripcion ?? '');
    setFechaInicioEdit(viaje.fecha_inicio ?? '');
    setFechaFinEdit(viaje.fecha_fin ?? '');
    setPortadaLocal(null);
    setErrorGuardar('');
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setPortadaLocal(null);
    setErrorGuardar('');
  };

  // TODO: reactivar cuando se resuelva el 400 de POST /viajes/subir-portada.
  const elegirPortada = async () => {
    if (SUBIDA_PORTADA_DESHABILITADA) {
      Alert.alert('Próximamente', 'Podrás cambiar la foto de portada muy pronto.');
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

  const guardarCambios = async () => {
    if (!viaje || !id) return;
    if (nombreEdit.trim().length === 0) {
      setErrorGuardar('El nombre del viaje es obligatorio');
      return;
    }

    setErrorGuardar('');
    setGuardando(true);
    try {
      let urlPortadaSubida: string | undefined;

      if (portadaLocal) {
        const formData = new FormData();
        formData.append('archivo', {
          uri: portadaLocal,
          name: 'portada.jpg',
          type: 'image/jpeg',
        } as unknown as Blob);

        const respPortada = await fetchConToken('/viajes/subir-portada', {
          method: 'POST',
          body: formData,
        });
        const datosPortada = await respPortada.json();
        if (!respPortada.ok) {
          setErrorGuardar(datosPortada?.error || 'No se pudo subir la foto de portada');
          return;
        }
        urlPortadaSubida = datosPortada.url_portada;
      }

      const respuesta = await fetchConToken(`/viajes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre_viaje: nombreEdit.trim(),
          descripcion: destinoEdit.trim() || null,
          fecha_inicio: fechaInicioEdit || null,
          fecha_fin: fechaFinEdit || null,
          ...(urlPortadaSubida ? { url_portada: urlPortadaSubida } : {}),
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setErrorGuardar(datos?.error || 'No se pudieron guardar los cambios');
        return;
      }

      setViaje(datos.viaje);
      setEditando(false);
      setPortadaLocal(null);
    } catch {
      setErrorGuardar('No se pudo conectar con el servidor');
    } finally {
      setGuardando(false);
    }
  };

  const compartirCodigo = () => {
    if (!viaje) return;
    Share.share({
      message: `¡Únete a "${viaje.nombre_viaje}" en TripEAs! Usa el código de invitación: ${viaje.codigo_invitacion}`,
    }).catch(() => null);
  };

  const anadirParticipante = async () => {
    if (!id || nombreNuevo.trim().length === 0) {
      setErrorAnadir('Escribe un nombre');
      return;
    }
    setErrorAnadir('');
    setAnadiendo(true);
    try {
      const respuesta = await fetchConToken('/participantes/anadir-fantasma', {
        method: 'POST',
        body: JSON.stringify({ id_viaje: id, nombre: nombreNuevo.trim() }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setErrorAnadir(datos?.error || 'No se pudo añadir el participante');
        return;
      }
      setNombreNuevo('');
      setModalAnadir(false);
      cargar();
    } catch {
      setErrorAnadir('No se pudo conectar con el servidor');
    } finally {
      setAnadiendo(false);
    }
  };

  const etiquetaEstilo = {
    fontFamily: 'PlusJakartaSans_600SemiBold' as const,
    fontSize: e(12),
    letterSpacing: e(0.6),
    color: COLOR_LABEL,
    textTransform: 'uppercase' as const,
    marginBottom: e(8),
  };

  const campoContenedor = {
    width: '100%' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: e(12),
    backgroundColor: Colors.celesteAgua,
    borderWidth: 1,
    borderColor: COLOR_BORDE_CAMPO,
    borderRadius: e(20),
    paddingHorizontal: e(16),
    paddingVertical: e(14),
  };

  const inputEstilo = {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular' as const,
    fontSize: e(15),
    color: Colors.azulProfundo,
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.blancoHueso }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: e(24) }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8), paddingTop: insets.top + e(8), paddingHorizontal: e(9) }}>
          <Pressable onPress={() => volverSeguro({ pathname: '/viaje/[id]', params: { id } })} hitSlop={8}>
            <Ionicons name="chevron-back" size={e(22)} color={Colors.turquesa} />
          </Pressable>
          <Logo size={e(20)} />
        </View>

        {isLoading || !viaje ? (
          <View style={{ paddingVertical: e(80), alignItems: 'center' }}>
            <ActivityIndicator color={Colors.turquesa} size="large" />
          </View>
        ) : (
          <View style={{ paddingHorizontal: e(24), paddingTop: e(24), gap: e(28) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: COLOR_LABEL }}>
                  Ajustes del viaje
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: COLOR_MUTED, marginTop: e(4) }}>
                  {esAdmin ? 'Puedes editar el viaje y sus participantes.' : 'Solo el admin puede editar el viaje.'}
                </Text>
              </View>
              {esAdmin && !editando && (
                <Pressable
                  onPress={empezarEdicion}
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: e(4), paddingTop: e(4) }}>
                  <Ionicons name="pencil-outline" size={e(16)} color={Colors.turquesa} />
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(13), color: Colors.turquesa }}>Editar</Text>
                </Pressable>
              )}
            </View>

            {/* Portada */}
            <View>
              <Text style={etiquetaEstilo}>Portada</Text>
              <Pressable
                disabled={!editando}
                onPress={elegirPortada}
                style={{
                  width: '100%',
                  height: e(140),
                  borderRadius: e(24),
                  overflow: 'hidden',
                  backgroundColor: Colors.celesteAgua,
                  borderWidth: 1,
                  borderColor: COLOR_BORDE_CAMPO,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {portadaLocal || viaje.url_portada ? (
                  <Image
                    source={{ uri: portadaLocal ?? viaje.url_portada ?? undefined }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ alignItems: 'center', gap: e(6) }}>
                    <Ionicons name="image-outline" size={e(26)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_MUTED }}>Sin portada</Text>
                  </View>
                )}
                {editando && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: e(10),
                      right: e(10),
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      borderRadius: 999,
                      padding: e(8),
                    }}>
                    <Ionicons name="camera-outline" size={e(16)} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            </View>

            {/* Nombre */}
            <View>
              <Text style={etiquetaEstilo}>Nombre del viaje</Text>
              {editando ? (
                <View style={campoContenedor}>
                  <Ionicons name="flag-outline" size={e(16)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                  <TextInput style={inputEstilo} value={nombreEdit} onChangeText={setNombreEdit} placeholder="Nombre del viaje" placeholderTextColor={COLOR_MUTED} />
                </View>
              ) : (
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(18), color: COLOR_TITULO }}>{viaje.nombre_viaje}</Text>
              )}
            </View>

            {/* Destino / descripción */}
            <View>
              <Text style={etiquetaEstilo}>Destino</Text>
              {editando ? (
                <View style={campoContenedor}>
                  <Ionicons name="location-outline" size={e(16)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                  <TextInput style={inputEstilo} value={destinoEdit} onChangeText={setDestinoEdit} placeholder="¿A dónde vais?" placeholderTextColor={COLOR_MUTED} />
                </View>
              ) : (
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(15), color: viaje.descripcion ? COLOR_TITULO : COLOR_MUTED }}>
                  {viaje.descripcion || 'Sin destino indicado'}
                </Text>
              )}
            </View>

            {/* Fechas */}
            <View style={{ flexDirection: 'row', gap: e(16) }}>
              <View style={{ flex: 1 }}>
                <Text style={etiquetaEstilo}>Fecha inicio</Text>
                {editando ? (
                  <Pressable style={[campoContenedor, { paddingVertical: e(12) }]} onPress={() => setCampoFechaActivo('inicio')}>
                    <Ionicons name="calendar-outline" size={e(15)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                    <Text style={[inputEstilo, { fontSize: e(13), color: fechaInicioEdit ? Colors.azulProfundo : COLOR_MUTED }]}>
                      {fechaInicioEdit ? formatearFechaVisible(fechaInicioEdit) : 'DD/MM/AAAA'}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(15), color: viaje.fecha_inicio ? COLOR_TITULO : COLOR_MUTED }}>
                    {viaje.fecha_inicio ? formatearFechaVisible(viaje.fecha_inicio) : 'Sin definir'}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={etiquetaEstilo}>Fecha fin</Text>
                {editando ? (
                  <Pressable style={[campoContenedor, { paddingVertical: e(12) }]} onPress={() => setCampoFechaActivo('fin')}>
                    <Ionicons name="calendar-outline" size={e(15)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                    <Text style={[inputEstilo, { fontSize: e(13), color: fechaFinEdit ? Colors.azulProfundo : COLOR_MUTED }]}>
                      {fechaFinEdit ? formatearFechaVisible(fechaFinEdit) : 'DD/MM/AAAA'}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(15), color: viaje.fecha_fin ? COLOR_TITULO : COLOR_MUTED }}>
                    {viaje.fecha_fin ? formatearFechaVisible(viaje.fecha_fin) : 'Sin definir'}
                  </Text>
                )}
              </View>
            </View>

            {errorGuardar ? (
              <Text style={{ color: Colors.rojoSuave, fontSize: e(13), textAlign: 'center' }}>{errorGuardar}</Text>
            ) : null}

            {editando && (
              <View style={{ flexDirection: 'row', gap: e(12) }}>
                <Pressable
                  onPress={cancelarEdicion}
                  disabled={guardando}
                  style={{
                    flex: 1,
                    height: e(48),
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: COLOR_BORDE_CAMPO,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(14), color: COLOR_MUTED }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={guardarCambios}
                  disabled={guardando}
                  style={{
                    flex: 1,
                    height: e(48),
                    borderRadius: 999,
                    backgroundColor: Colors.turquesa,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: guardando ? 0.7 : 1,
                  }}>
                  {guardando ? (
                    <ActivityIndicator color={Colors.blancoHueso} />
                  ) : (
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(14), color: Colors.blancoHueso }}>Guardar cambios</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Código de invitación */}
            <View>
              <Text style={etiquetaEstilo}>Código de invitación</Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F4F3F1',
                  borderRadius: e(20),
                  paddingHorizontal: e(20),
                  paddingVertical: e(16),
                }}>
                <Text selectable style={{ fontSize: e(22), fontWeight: '800', letterSpacing: e(3), color: Colors.azulProfundo }}>
                  {viaje.codigo_invitacion}
                </Text>
                <Pressable
                  onPress={compartirCodigo}
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: e(6), backgroundColor: '#98D3FD', borderRadius: 999, paddingHorizontal: e(14), paddingVertical: e(8) }}>
                  <Ionicons name="share-social-outline" size={e(15)} color="#145C80" />
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), color: '#145C80' }}>Compartir</Text>
                </Pressable>
              </View>
            </View>

            {/* Participantes */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: e(12) }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(18), color: COLOR_LABEL }}>
                  Participantes ({participantes.length})
                </Text>
                {esAdmin && (
                  <Pressable
                    onPress={() => setModalAnadir(true)}
                    hitSlop={8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: e(4) }}>
                    <Ionicons name="person-add-outline" size={e(16)} color={Colors.turquesa} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(13), color: Colors.turquesa }}>Añadir</Text>
                  </Pressable>
                )}
              </View>
              <View style={{ borderRadius: e(24), backgroundColor: '#F4F3F1', overflow: 'hidden' }}>
                {participantes.map((p, indice) => (
                  <View
                    key={p.id_usuario}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: e(12),
                      paddingHorizontal: e(16),
                      paddingVertical: e(14),
                      borderTopWidth: indice === 0 ? 0 : 1,
                      borderTopColor: '#E3E2E0',
                    }}>
                    <Inicial nombre={p.nombre} tamano={e(34)} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(14), color: COLOR_TITULO }} numberOfLines={1}>
                        {p.nombre}
                        {p.id_usuario === usuario?.id ? ' (tú)' : ''}
                      </Text>
                      {p.es_fantasma && (
                        <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(11), color: COLOR_MUTED }}>
                          Perfil provisional
                        </Text>
                      )}
                    </View>
                    {p.rol === 'admin' && (
                      <View style={{ backgroundColor: '#FBF5C3', borderRadius: 999, paddingHorizontal: e(10), paddingVertical: e(4) }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(11), color: '#8A6D00' }}>Admin</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <BarraInferiorViaje activo="mas" idViaje={id} onPressTab={irATab} />

      <SelectorFechaModal
        visible={campoFechaActivo !== null}
        titulo={campoFechaActivo === 'inicio' ? 'Fecha de inicio' : 'Fecha de fin'}
        valor={campoFechaActivo === 'inicio' ? fechaInicioEdit : fechaFinEdit}
        minDate={campoFechaActivo === 'fin' ? fechaInicioEdit || undefined : undefined}
        onClose={() => setCampoFechaActivo(null)}
        onSeleccionar={(fecha) => {
          if (campoFechaActivo === 'inicio') {
            setFechaInicioEdit(fecha);
            if (fechaFinEdit && fecha > fechaFinEdit) setFechaFinEdit('');
          } else if (campoFechaActivo === 'fin') {
            setFechaFinEdit(fecha);
          }
        }}
      />

      <Modal visible={modalAnadir} transparent animationType="fade" onRequestClose={() => setModalAnadir(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: Colors.azulProfundo, marginBottom: 4 }}>
              Añadir participante
            </Text>
            <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: COLOR_MUTED, marginBottom: 16 }}>
              Se crea un perfil provisional; podrá vincularse a su cuenta real uniéndose con el código de invitación.
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: Colors.celesteAgua,
                borderWidth: 1,
                borderColor: COLOR_BORDE_CAMPO,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 12,
              }}>
              <Ionicons name="person-outline" size={16} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
              <TextInput
                style={{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: Colors.azulProfundo }}
                placeholder="Nombre"
                placeholderTextColor={COLOR_MUTED}
                value={nombreNuevo}
                onChangeText={setNombreNuevo}
                autoFocus
              />
            </View>
            {errorAnadir ? <Text style={{ color: Colors.rojoSuave, fontSize: 12, marginBottom: 8 }}>{errorAnadir}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => {
                  setModalAnadir(false);
                  setNombreNuevo('');
                  setErrorAnadir('');
                }}
                style={{ flex: 1, height: 44, borderRadius: 999, borderWidth: 1, borderColor: COLOR_BORDE_CAMPO, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: COLOR_MUTED }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={anadirParticipante}
                disabled={anadiendo}
                style={{ flex: 1, height: 44, borderRadius: 999, backgroundColor: Colors.turquesa, alignItems: 'center', justifyContent: 'center', opacity: anadiendo ? 0.7 : 1 }}>
                {anadiendo ? <ActivityIndicator color={Colors.blancoHueso} /> : <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: Colors.blancoHueso }}>Añadir</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
