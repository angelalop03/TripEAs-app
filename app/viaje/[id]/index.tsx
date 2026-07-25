// Dashboard del detalle de viaje — medidas replicadas del diseño de Figma
// (frame de referencia 393px de ancho). El nombre/fechas/portada del viaje
// llegan por parámetros de navegación (no existe un GET /viajes/:id en el
// backend); balance, participantes y próximos planes sí son datos reales.
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonMisViajes } from '@/components/BotonMisViajes';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { volverSeguro } from '@/constants/Navegacion';
import { useAuth } from '@/hooks/useAuth';

const FRAME_WIDTH = 393;
const COLOR_TITULO = '#1A1C1A';
const COLOR_SUBTITULO = '#3B4A43';
const COLOR_LABEL = '#216489';
const COLOR_VERDE = '#006C50';

interface Participante {
  id_usuario: string;
  nombre: string;
  es_fantasma: boolean;
}

interface Evento {
  id_evento: string;
  titulo: string;
  fecha_hora_inicio: string;
}

interface Balance {
  id_usuario: string;
  balance: number;
}

function formatearRango(inicio: string, fin: string) {
  if (!inicio) return '';
  const opciones: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const inicioStr = new Date(inicio).toLocaleDateString('es-ES', opciones);
  if (!fin) return inicioStr;
  const finStr = new Date(fin).toLocaleDateString('es-ES', opciones);
  return `${inicioStr} - ${finStr}`;
}

function calcularProgreso(inicio: string, fin: string): number | null {
  if (!inicio || !fin) return null;
  const i = new Date(inicio).getTime();
  const f = new Date(fin).getTime();
  if (Number.isNaN(i) || Number.isNaN(f) || f <= i) return null;
  const pct = ((Date.now() - i) / (f - i)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function formatearEvento(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (mismoDia(fecha, hoy)) return `Hoy • ${hora}`;
  if (mismoDia(fecha, manana)) return `Mañana • ${hora}`;
  return `${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} • ${hora}`;
}

const sombraTarjeta = {
  shadowColor: '#000000',
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 8,
  elevation: 2,
};

export default function TripHomeScreen() {
  const { id, nombre, fechaInicio, fechaFin, urlPortada } = useLocalSearchParams<{
    id: string;
    nombre?: string;
    fechaInicio?: string;
    fechaFin?: string;
    urlPortada?: string;
  }>();
  const { usuario } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const cargar = useCallback(
    async (mostrarSpinner = false) => {
      if (!id) return;
      if (mostrarSpinner) setIsRefreshing(true);
      try {
        const [respParticipantes, respEventos, respLiquidacion] = await Promise.all([
          fetchConToken(`/participantes/${id}`),
          fetchConToken(`/calendario/${id}`),
          fetchConToken(`/gastos/${id}/liquidacion`),
        ]);
        const [datosParticipantes, datosEventos, datosLiquidacion] = await Promise.all([
          respParticipantes.json(),
          respEventos.json(),
          respLiquidacion.json(),
        ]);
        if (respParticipantes.ok) setParticipantes(datosParticipantes.participantes ?? []);
        if (respEventos.ok) setEventos(datosEventos.eventos ?? []);
        if (respLiquidacion.ok) setBalances(datosLiquidacion.resumen_balances ?? []);
      } catch {
        // Sin conexión: la pantalla se queda con lo que haya podido cargar.
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

  const progreso = useMemo(() => calcularProgreso(fechaInicio ?? '', fechaFin ?? ''), [fechaInicio, fechaFin]);

  const miBalance = useMemo(
    () => balances.find((b) => b.id_usuario === usuario?.id)?.balance ?? 0,
    [balances, usuario]
  );

  const estadoBalance = miBalance > 0.01 ? 'a_favor' : miBalance < -0.01 ? 'en_contra' : 'saldado';
  const coloresBalance: Record<string, [string, string]> = {
    a_favor: ['#00997A', '#006C50'],
    en_contra: ['#FF8A80', '#D2483C'],
    saldado: [Colors.turquesa, '#0A6E7F'],
  };
  const etiquetaBalance: Record<string, string> = {
    a_favor: 'Te deben',
    en_contra: 'Debes',
    saldado: 'Estás en paz',
  };

  const proximosEventos = useMemo(() => {
    const ahora = Date.now();
    return eventos.filter((ev) => new Date(ev.fecha_hora_inicio).getTime() >= ahora).slice(0, 2);
  }, [eventos]);

  const abrirFab = () =>
    Alert.alert('Añadir', '¿Qué quieres añadir?', [
      { text: 'Gasto', onPress: () => router.push({ pathname: '/viaje/[id]/gastos', params: { id } }) },
      { text: 'Evento', onPress: () => router.push({ pathname: '/viaje/[id]/calendario', params: { id } }) },
      { text: 'Cancelar', style: 'cancel' },
    ]);

  const formatoEuro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => cargar(true)} tintColor={Colors.turquesa} />}>
        {/* Hero */}
        <View style={{ width: '100%', height: e(300) }}>
          {urlPortada ? (
            <Image source={{ uri: urlPortada }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[Colors.celesteAgua, Colors.turquesa]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="airplane" size={e(64)} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: e(140) }}
          />

          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: e(24),
              paddingBottom: e(20),
            }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: e(28),
                letterSpacing: e(-0.56),
                color: '#FFFFFF',
                marginBottom: e(4),
              }}
              numberOfLines={1}>
              {nombre ?? 'Viaje'}
            </Text>
            <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(16), color: 'rgba(255,255,255,0.9)' }}>
              {formatearRango(fechaInicio ?? '', fechaFin ?? '')}
              {participantes.length > 0 ? ` • ${participantes.length} exploradores` : ''}
            </Text>
          </View>

          <View
            style={{
              position: 'absolute',
              top: insets.top + e(8),
              left: e(9),
              flexDirection: 'row',
              alignItems: 'center',
              gap: e(8),
              backgroundColor: 'rgba(255,255,255,0.85)',
              borderRadius: e(20),
              paddingHorizontal: e(10),
              paddingVertical: e(8),
              shadowColor: '#000000',
              shadowOpacity: 0.15,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 4,
              elevation: 3,
            }}>
            <Pressable onPress={() => volverSeguro('/')} hitSlop={6}>
              <Ionicons name="chevron-back" size={e(16)} color={Colors.turquesa} />
            </Pressable>
            <BotonMisViajes />
          </View>
        </View>

        <View style={{ paddingHorizontal: e(24), paddingTop: e(16), gap: e(16), paddingBottom: e(40) }}>
          {/* Balance */}
          <LinearGradient
            colors={coloresBalance[estadoBalance]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: e(32),
              padding: e(24),
              overflow: 'hidden',
              shadowColor: coloresBalance[estadoBalance][1],
              shadowOpacity: 0.3,
              shadowOffset: { width: 0, height: 8 },
              shadowRadius: 16,
              elevation: 6,
            }}>
            <Ionicons
              name="wallet"
              size={e(110)}
              color="rgba(255,255,255,0.1)"
              style={{ position: 'absolute', right: e(-16), bottom: e(-20) }}
            />
            <View>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: e(13),
                  letterSpacing: e(0.8),
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.85)',
                  marginBottom: e(6),
                }}>
                {etiquetaBalance[estadoBalance]}
              </Text>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(30), letterSpacing: e(-0.56), color: '#FFFFFF' }}>
                  {formatoEuro.format(Math.abs(miBalance))}
                </Text>
              )}
            </View>
            <View
              style={{
                width: e(48),
                height: e(48),
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="wallet-outline" size={e(24)} color="#FFFFFF" />
            </View>
          </LinearGradient>

          {/* Progreso */}
          {progreso !== null && (
            <View style={[{ width: '100%', backgroundColor: '#F4F3F1', borderRadius: e(32), padding: e(20), gap: e(12) }, sombraTarjeta]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(16), color: COLOR_SUBTITULO }}>
                  Progreso del viaje
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: COLOR_VERDE }}>
                  {progreso}%
                </Text>
              </View>
              <View style={{ width: '100%', height: e(8), borderRadius: 999, backgroundColor: '#E3E2E0' }}>
                <LinearGradient
                  colors={['#00E9B0', COLOR_VERDE]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: `${progreso}%`, height: '100%', borderRadius: 999 }}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8) }}>
                <View style={{ flexDirection: 'row' }}>
                  {participantes.slice(0, 3).map((p, indice) => (
                    <View
                      key={p.id_usuario}
                      style={{
                        width: e(28),
                        height: e(28),
                        borderRadius: 999,
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                        backgroundColor: Colors.celesteAgua,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: indice === 0 ? 0 : -e(8),
                      }}>
                      <Text style={{ fontSize: e(11), fontWeight: '700', color: Colors.azulProfundo }}>
                        {p.nombre.trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(16), color: COLOR_SUBTITULO }}>
                  {participantes.length} {participantes.length === 1 ? 'participante' : 'participantes'}
                </Text>
              </View>
            </View>
          )}

          {/* Accesos rápidos */}
          <View style={{ width: '100%', flexDirection: 'row', gap: e(16) }}>
            <Pressable
              style={[
                {
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: 'rgba(0, 83, 119, 0.05)',
                  borderRadius: e(32),
                  padding: e(16),
                  gap: e(10),
                },
                sombraTarjeta,
              ]}
              onPress={() => router.push({ pathname: '/viaje/[id]/elegir', params: { id } })}>
              <View style={{ width: e(40), height: e(40), borderRadius: 999, backgroundColor: '#00E9B0', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="albums-outline" size={e(18)} color="#006449" />
              </View>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(16), color: COLOR_TITULO }}>Ruleta</Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_SUBTITULO }}>
                Decide con el grupo
              </Text>
            </Pressable>

            <Pressable
              style={[
                {
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: 'rgba(0, 83, 119, 0.05)',
                  borderRadius: e(32),
                  padding: e(16),
                  gap: e(10),
                },
                sombraTarjeta,
              ]}
              onPress={() => router.push({ pathname: '/viaje/[id]/gastos', params: { id } })}>
              <View style={{ width: e(40), height: e(40), borderRadius: 999, backgroundColor: '#98D3FD', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="receipt-outline" size={e(18)} color="#145C80" />
              </View>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(16), color: COLOR_TITULO }}>Gastos</Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_SUBTITULO }}>
                Divide la cuenta
              </Text>
            </Pressable>
          </View>

          {/* Próximos planes */}
          <View style={{ width: '100%', gap: e(12) }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: e(14),
                letterSpacing: e(1.6),
                textTransform: 'uppercase',
                color: COLOR_LABEL,
                paddingHorizontal: e(4),
              }}>
              Próximos planes
            </Text>

            {isLoading ? (
              <ActivityIndicator color={Colors.turquesa} />
            ) : proximosEventos.length === 0 ? (
              <View
                style={[
                  {
                    width: '100%',
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: 'rgba(0, 83, 119, 0.05)',
                    borderRadius: e(32),
                    padding: e(20),
                    alignItems: 'center',
                  },
                  sombraTarjeta,
                ]}>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: COLOR_SUBTITULO, textAlign: 'center' }}>
                  Todavía no hay planes en el calendario.
                </Text>
              </View>
            ) : (
              proximosEventos.map((evento) => (
                <View
                  key={evento.id_evento}
                  style={[
                    {
                      width: '100%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: e(16),
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: 'rgba(0, 83, 119, 0.05)',
                      borderRadius: e(32),
                      padding: e(16),
                    },
                    sombraTarjeta,
                  ]}>
                  <View
                    style={{
                      width: e(48),
                      height: e(48),
                      borderRadius: 999,
                      backgroundColor: 'rgba(221, 208, 89, 0.3)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name="calendar-outline" size={e(20)} color="#686000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: COLOR_TITULO }}
                      numberOfLines={1}>
                      {evento.titulo}
                    </Text>
                    <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: COLOR_SUBTITULO }}>
                      {formatearEvento(evento.fecha_hora_inicio)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Tip de Capi */}
          <View
            style={[
              {
                width: '100%',
                flexDirection: 'row',
                gap: e(16),
                backgroundColor: '#FFF8E1',
                borderWidth: 1,
                borderColor: 'rgba(213, 207, 160, 0.4)',
                borderRadius: e(32),
                padding: e(24),
              },
              sombraTarjeta,
            ]}>
            <Image
              source={require('@/assets/images/capibara.png')}
              resizeMode="contain"
              style={{ width: e(64), height: e(64) }}
            />
            <View style={{ flex: 1, gap: e(4) }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: COLOR_TITULO }}>
                Consejo de Capi
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), lineHeight: e(20), color: COLOR_SUBTITULO }}>
                No olvides subir los tickets y reservas a la sección de Documentos para tenerlo todo a mano.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Pressable
        onPress={abrirFab}
        style={{
          position: 'absolute',
          right: e(25),
          bottom: e(24),
          width: e(56),
          height: e(56),
          borderRadius: 999,
          backgroundColor: COLOR_VERDE,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000000',
          shadowOpacity: 0.2,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 12,
          elevation: 8,
        }}>
        <Ionicons name="add" size={e(24)} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
