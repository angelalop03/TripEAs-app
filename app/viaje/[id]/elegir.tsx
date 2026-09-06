// Pantalla de Ruleta de decisiones — medidas replicadas del diseño de Figma
// (frame de referencia 393px de ancho). Usa los endpoints reales de
// /api/ruleta (crear, girar, listar); no hace falta tocar el backend.
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonMisViajes } from '@/components/BotonMisViajes';
import { RuletaWheel } from '@/components/RuletaWheel';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { volverSeguro } from '@/constants/Navegacion';

const FRAME_WIDTH = 393;
const COLOR_LABEL = '#216489';
const COLORES_SEGMENTO = ['#FF7043', '#4DB6AC', '#7986CB', '#F06292', '#AED581', '#FFD54F'];

interface Opcion {
  id_opcion: string;
  texto_opcion: string;
}

interface Ruleta {
  id_ruleta: string;
  titulo: string;
  opciones_ruleta: Opcion[];
}

export default function ElegirScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [ruletaActiva, setRuletaActiva] = useState<Ruleta | null>(null);
  const [opcionesLocal, setOpcionesLocal] = useState<string[]>([]);
  const [nuevaOpcion, setNuevaOpcion] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGuardando, setIsGuardando] = useState(false);
  const [isGirando, setIsGirando] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [colorResultado, setColorResultado] = useState(Colors.turquesa);
  const [error, setError] = useState('');

  const [rotacion] = useState(() => new Animated.Value(0));
  const rotacionAcumulada = useRef(0);

  const cargar = useCallback(
    async (mostrarSpinner = false) => {
      if (!id) return;
      if (mostrarSpinner) setIsRefreshing(true);
      try {
        const respuesta = await fetchConToken(`/ruleta/${id}`);
        const datos = await respuesta.json();
        if (respuesta.ok) {
          const ruletas: Ruleta[] = datos.ruletas ?? [];
          const ultima = ruletas[ruletas.length - 1] ?? null;
          setRuletaActiva(ultima);
          setOpcionesLocal(ultima?.opciones_ruleta.map((o) => o.texto_opcion) ?? []);
        }
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

  const anadirOpcion = () => {
    const limpio = nuevaOpcion.trim();
    if (!limpio) return;
    setOpcionesLocal((prev) => [...prev, limpio]);
    setNuevaOpcion('');
  };

  const quitarOpcion = (indice: number) => setOpcionesLocal((prev) => prev.filter((_, i) => i !== indice));

  const listaCambio =
    opcionesLocal.length !== (ruletaActiva?.opciones_ruleta.length ?? 0) ||
    opcionesLocal.some((texto, i) => texto !== ruletaActiva?.opciones_ruleta[i]?.texto_opcion);

  const guardarRuleta = async () => {
    if (opcionesLocal.length < 2) {
      setError('Añade al menos 2 opciones para crear la ruleta');
      return;
    }
    setError('');
    setIsGuardando(true);
    try {
      const respuesta = await fetchConToken('/ruleta/crear', {
        method: 'POST',
        body: JSON.stringify({ id_viaje: id, titulo: '¿Qué hacemos?', opciones: opcionesLocal }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setError(datos?.error || 'No se pudo crear la ruleta');
        return;
      }
      await cargar();
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setIsGuardando(false);
    }
  };

  const girar = async () => {
    if (!ruletaActiva || isGirando) return;
    setIsGirando(true);
    setError('');
    try {
      const respuesta = await fetchConToken(`/ruleta/${ruletaActiva.id_ruleta}/girar`, { method: 'POST' });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setError(datos?.error || 'No se pudo girar la ruleta');
        setIsGirando(false);
        return;
      }

      const ganadora: Opcion = datos.ganadora;
      const opciones = ruletaActiva.opciones_ruleta;
      const indiceGanador = opciones.findIndex((o) => o.id_opcion === ganadora.id_opcion);
      const anguloPorOpcion = 360 / opciones.length;
      const centroGanadora = indiceGanador * anguloPorOpcion + anguloPorOpcion / 2;

      const actual = rotacionAcumulada.current;
      const actualMod = ((actual % 360) + 360) % 360;
      let objetivoMod = (360 - centroGanadora) % 360;
      let delta = objetivoMod - actualMod;
      if (delta < 0) delta += 360;
      const nuevoTotal = actual + delta + 360 * 5;
      rotacionAcumulada.current = nuevoTotal;

      Animated.timing(rotacion, {
        toValue: nuevoTotal,
        duration: 4000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setIsGirando(false);
        setColorResultado(COLORES_SEGMENTO[indiceGanador % COLORES_SEGMENTO.length]);
        setResultado(ganadora.texto_opcion);
      });
    } catch {
      setError('No se pudo conectar con el servidor');
      setIsGirando(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: e(160) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => cargar(true)} tintColor={Colors.turquesa} />}>
        <View style={{ paddingTop: insets.top + e(9), paddingHorizontal: e(9) }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: e(8),
              alignSelf: 'flex-start',
              backgroundColor: '#FFFFFF',
              borderRadius: e(20),
              paddingHorizontal: e(10),
              paddingVertical: e(8),
              shadowColor: '#000000',
              shadowOpacity: 0.08,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 3,
            }}>
            <Pressable onPress={() => volverSeguro('/')} hitSlop={6}>
              <Ionicons name="chevron-back" size={e(16)} color={Colors.turquesa} />
            </Pressable>
            <BotonMisViajes />
          </View>
        </View>

        <View style={{ alignItems: 'center', paddingHorizontal: e(24), paddingTop: e(24) }}>
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: '#145C80', textAlign: 'center' }}>
            Ruleta de Decisiones
          </Text>
          <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: Colors.azulProfundo, marginTop: e(4) }}>
            ¡Deja que Capi decida!
          </Text>

          {isLoading ? (
            <ActivityIndicator color={Colors.turquesa} style={{ marginTop: e(60) }} />
          ) : ruletaActiva && ruletaActiva.opciones_ruleta.length >= 2 ? (
            <View style={{ marginTop: e(32), alignItems: 'center', justifyContent: 'center' }}>
              <LinearGradient
                colors={['rgba(14,153,176,0.18)', 'rgba(14,153,176,0)']}
                style={{
                  position: 'absolute',
                  width: e(400),
                  height: e(400),
                  borderRadius: 999,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: e(-10),
                  width: e(220),
                  height: e(24),
                  borderRadius: 999,
                  backgroundColor: 'rgba(0,0,0,0.12)',
                  transform: [{ scaleX: 1.3 }],
                }}
              />
              <RuletaWheel
                opciones={ruletaActiva.opciones_ruleta}
                tamano={e(340)}
                rotacion={rotacion}
                girando={isGirando}
                onGirar={girar}
              />
            </View>
          ) : (
            <View
              style={{
                marginTop: e(32),
                width: '100%',
                alignItems: 'center',
                gap: e(8),
                paddingVertical: e(28),
                paddingHorizontal: e(20),
                borderRadius: e(32),
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: '#B9CBC1',
                backgroundColor: 'rgba(250,249,246,0.6)',
              }}>
              <Image source={require('@/assets/images/capibara.png')} resizeMode="contain" style={{ width: e(100), height: e(100) }} />
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: Colors.azulProfundo, textAlign: 'center', opacity: 0.8 }}>
                Añade al menos 2 opciones y crea la ruleta para empezar a girar.
              </Text>
            </View>
          )}

          {/* Nominados */}
          <View
            style={{
              width: '100%',
              marginTop: e(32),
              padding: e(24),
              gap: e(16),
              borderRadius: e(32),
              backgroundColor: 'rgba(250,249,246,0.9)',
              borderWidth: 1,
              borderColor: '#FFFFFF',
              shadowColor: '#000000',
              shadowOpacity: 0.06,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 14,
              elevation: 3,
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: COLOR_LABEL }}>Nominaciones</Text>
              <View style={{ backgroundColor: '#98D3FD', borderRadius: 999, paddingHorizontal: e(12), paddingVertical: e(4) }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: '#145C80' }}>
                  {opcionesLocal.length} {opcionesLocal.length === 1 ? 'opción' : 'opciones'}
                </Text>
              </View>
            </View>

            <View style={{ gap: e(12) }}>
              {opcionesLocal.map((texto, indice) => (
                <View
                  key={`${texto}-${indice}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 999,
                    paddingHorizontal: e(12),
                    paddingVertical: e(12),
                    shadowColor: '#000000',
                    shadowOpacity: 0.04,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 5,
                    elevation: 1,
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(12), flex: 1 }}>
                    <View
                      style={{
                        width: e(16),
                        height: e(16),
                        borderRadius: 999,
                        backgroundColor: COLORES_SEGMENTO[indice % COLORES_SEGMENTO.length],
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                        shadowColor: '#000000',
                        shadowOpacity: 0.15,
                        shadowOffset: { width: 0, height: 1 },
                        shadowRadius: 2,
                      }}
                    />
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(16), color: '#1A1C1A', flex: 1 }} numberOfLines={1}>
                      {texto}
                    </Text>
                  </View>
                  <Pressable onPress={() => quitarOpcion(indice)} hitSlop={8}>
                    <Ionicons name="close-circle" size={e(20)} color={Colors.rojoSuave} />
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: e(8) }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: e(8),
                  backgroundColor: '#FFFFFF',
                  borderRadius: 999,
                  paddingHorizontal: e(16),
                }}>
                <Ionicons name="bulb-outline" size={e(16)} color="#145C80" style={{ opacity: 0.6 }} />
                <TextInput
                  style={{ flex: 1, paddingVertical: e(12), fontSize: e(14), color: Colors.azulProfundo }}
                  placeholder="Añade tu sugerencia"
                  placeholderTextColor={Colors.azulProfundo}
                  value={nuevaOpcion}
                  onChangeText={setNuevaOpcion}
                  onSubmitEditing={anadirOpcion}
                  returnKeyType="done"
                />
              </View>
              <Pressable
                onPress={anadirOpcion}
                style={{
                  width: e(44),
                  height: e(44),
                  borderRadius: 999,
                  backgroundColor: '#98D3FD',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#145C80',
                  shadowOpacity: 0.25,
                  shadowOffset: { width: 0, height: 3 },
                  shadowRadius: 6,
                  elevation: 3,
                }}>
                <Ionicons name="add" size={e(20)} color="#145C80" />
              </Pressable>
            </View>

            {error ? <Text style={{ color: Colors.rojoSuave, fontSize: e(12), textAlign: 'center' }}>{error}</Text> : null}

            {listaCambio && opcionesLocal.length >= 2 && (
              <Pressable
                onPress={guardarRuleta}
                disabled={isGuardando}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: e(8),
                  backgroundColor: '#98D3FD',
                  borderRadius: 999,
                  paddingVertical: e(14),
                  opacity: isGuardando ? 0.7 : 1,
                  shadowColor: '#145C80',
                  shadowOpacity: 0.3,
                  shadowOffset: { width: 0, height: 6 },
                  shadowRadius: 12,
                  elevation: 5,
                }}>
                {isGuardando ? (
                  <ActivityIndicator color="#145C80" />
                ) : (
                  <>
                    <Ionicons name="sync-outline" size={e(18)} color="#145C80" />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: '#145C80' }}>
                      {ruletaActiva ? 'Actualizar Ruleta' : 'Crear Ruleta'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Mensaje de Capi con el resultado */}
      <Modal visible={resultado !== null} transparent animationType="fade" onRequestClose={() => setResultado(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View
            style={{
              width: '100%',
              maxWidth: 320,
              backgroundColor: Colors.blancoHueso,
              borderRadius: 32,
              padding: 24,
              paddingTop: 28,
              alignItems: 'center',
              borderTopWidth: 6,
              borderTopColor: colorResultado,
              shadowColor: '#000000',
              shadowOpacity: 0.3,
              shadowOffset: { width: 0, height: 12 },
              shadowRadius: 24,
              elevation: 14,
            }}>
            <View
              style={{
                width: 130,
                height: 130,
                borderRadius: 999,
                backgroundColor: `${colorResultado}22`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}>
              <Image source={require('@/assets/images/capibara.png')} resizeMode="contain" style={{ width: 110, height: 110 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="sparkles" size={16} color={colorResultado} />
              <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: colorResultado, textTransform: 'uppercase' }}>
                ¡Capi ha decidido!
              </Text>
              <Ionicons name="sparkles" size={16} color={colorResultado} />
            </View>
            <View style={{ backgroundColor: Colors.celesteAgua, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 16, marginTop: 8 }}>
              <Text style={{ fontWeight: '800', fontSize: 22, color: Colors.azulProfundo, textAlign: 'center' }}>{resultado}</Text>
            </View>
            <Pressable
              style={{
                backgroundColor: colorResultado,
                borderRadius: 999,
                paddingVertical: 12,
                paddingHorizontal: 36,
                shadowColor: colorResultado,
                shadowOpacity: 0.4,
                shadowOffset: { width: 0, height: 6 },
                shadowRadius: 10,
                elevation: 5,
              }}
              onPress={() => setResultado(null)}>
              <Text style={{ color: Colors.blancoHueso, fontWeight: '700', fontSize: 15 }}>¡Genial!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
