// Añadir participantes — pantalla dedicada, accesible desde el "+" de la
// Home del viaje. Dos formas reales de añadir gente: compartir el código de
// invitación (cualquiera puede compartirlo) o añadir un perfil provisional
// por nombre (solo el admin, mismo criterio que anadirFantasma en el
// backend). No repite la edición de nombre/foto/fechas del viaje — eso
// sigue viviendo en Ajustes del viaje.
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarraInferiorViaje } from '@/components/BarraInferiorViaje';
import { Logo } from '@/components/Logo';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { SOMBRA_TARJETA } from '@/constants/Estilos';
import { volverSeguro } from '@/constants/Navegacion';
import { useAuth } from '@/hooks/useAuth';

const FRAME_WIDTH = 393;
const COLOR_LABEL = '#216489';
const COLOR_MUTED = '#6B7B72';
const COLOR_TITULO = '#1A1C1A';
const COLOR_BORDE_CAMPO = '#D4EFF2';

interface Viaje {
  id_viaje: string;
  nombre_viaje: string;
  codigo_invitacion: string;
  tu_rol: 'admin' | 'miembro';
}

interface Participante {
  id_usuario: string;
  nombre: string;
  rol: 'admin' | 'miembro';
  es_fantasma: boolean;
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

export default function ParticipantesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [nombreNuevo, setNombreNuevo] = useState('');
  const [anadiendo, setAnadiendo] = useState(false);
  const [errorAnadir, setErrorAnadir] = useState('');
  const [exito, setExito] = useState('');

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
    setExito('');
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
      setExito(`"${nombreNuevo.trim()}" añadido al viaje`);
      setNombreNuevo('');
      cargar();
    } catch {
      setErrorAnadir('No se pudo conectar con el servidor');
    } finally {
      setAnadiendo(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: e(24) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
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
          <View style={{ paddingHorizontal: e(24), paddingTop: e(20), gap: e(24) }}>
            {/* Título */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(14) }}>
              <View
                style={{
                  width: e(48),
                  height: e(48),
                  borderRadius: e(16),
                  backgroundColor: Colors.turquesa,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#00E9B0',
                  shadowOpacity: 0.3,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 10,
                  elevation: 4,
                }}>
                <Ionicons name="person-add" size={e(22)} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), letterSpacing: e(-0.4), color: COLOR_TITULO }}>
                  Añadir participantes
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: COLOR_MUTED, marginTop: e(2) }}>
                  Comparte el código o añade a alguien sin cuenta todavía
                </Text>
              </View>
            </View>

            {/* Código de invitación */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: e(28), padding: e(20), gap: e(14), ...SOMBRA_TARJETA }}>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: e(11),
                  letterSpacing: e(1),
                  color: COLOR_LABEL,
                  textTransform: 'uppercase',
                }}>
                Código de invitación
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_MUTED, marginTop: -e(6) }}>
                Cualquiera con el código puede unirse desde &quot;Unirse a un viaje&quot; en Mis Viajes.
              </Text>
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
                <Text selectable style={{ fontSize: e(24), fontWeight: '800', letterSpacing: e(3), color: Colors.azulProfundo }}>
                  {viaje.codigo_invitacion}
                </Text>
                <Pressable
                  onPress={compartirCodigo}
                  hitSlop={8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: e(6),
                    backgroundColor: Colors.turquesa,
                    borderRadius: 999,
                    paddingHorizontal: e(16),
                    paddingVertical: e(10),
                  }}>
                  <Ionicons name="share-social-outline" size={e(15)} color="#FFFFFF" />
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), color: '#FFFFFF' }}>Compartir</Text>
                </Pressable>
              </View>
            </View>

            {/* Añadir provisional (solo admin) */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: e(28), padding: e(20), gap: e(14), ...SOMBRA_TARJETA }}>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: e(11),
                  letterSpacing: e(1),
                  color: COLOR_LABEL,
                  textTransform: 'uppercase',
                }}>
                Añadir sin cuenta todavía
              </Text>

              {esAdmin ? (
                <>
                  <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_MUTED, marginTop: -e(6) }}>
                    Se crea un perfil provisional; esa persona podrá vincularlo a su cuenta real uniéndose con el código.
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: e(12),
                      backgroundColor: Colors.celesteAgua,
                      borderWidth: 1,
                      borderColor: COLOR_BORDE_CAMPO,
                      borderRadius: e(20),
                      paddingHorizontal: e(16),
                      paddingVertical: e(14),
                    }}>
                    <Ionicons name="person-outline" size={e(16)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                    <TextInput
                      style={{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(15), color: Colors.azulProfundo }}
                      value={nombreNuevo}
                      onChangeText={setNombreNuevo}
                      placeholder="Nombre de la persona"
                      placeholderTextColor={COLOR_MUTED}
                      onSubmitEditing={anadirParticipante}
                      returnKeyType="done"
                    />
                  </View>

                  {errorAnadir ? <Text style={{ color: Colors.rojoSuave, fontSize: e(13) }}>{errorAnadir}</Text> : null}
                  {exito ? <Text style={{ color: '#006449', fontSize: e(13) }}>{exito}</Text> : null}

                  <Pressable
                    onPress={anadirParticipante}
                    disabled={anadiendo}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: e(8),
                      height: e(50),
                      borderRadius: 999,
                      backgroundColor: Colors.turquesa,
                      opacity: anadiendo ? 0.7 : 1,
                    }}>
                    {anadiendo ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={e(18)} color="#FFFFFF" />
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(15), color: '#FFFFFF' }}>Añadir</Text>
                      </>
                    )}
                  </Pressable>
                </>
              ) : (
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_MUTED, marginTop: -e(6) }}>
                  Solo el administrador del viaje puede añadir participantes sin cuenta. Comparte el código de arriba para
                  que se unan por su cuenta.
                </Text>
              )}
            </View>

            {/* Participantes actuales */}
            <View>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: e(11),
                  letterSpacing: e(1),
                  color: COLOR_LABEL,
                  textTransform: 'uppercase',
                  marginBottom: e(12),
                  paddingHorizontal: e(4),
                }}>
                Ya en el viaje ({participantes.length})
              </Text>
              <View style={{ borderRadius: e(24), backgroundColor: '#FFFFFF', overflow: 'hidden', ...SOMBRA_TARJETA }}>
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
                      borderTopColor: '#F0F0F0',
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

      <BarraInferiorViaje activo="index" idViaje={id} onPressTab={irATab} />
    </View>
  );
}
