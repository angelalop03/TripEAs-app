// Pantalla de Gastos (Tricount) — trae datos reales del backend: total
// gastado del viaje y listado de gastos individuales. No hay categorías ni
// presupuesto máximo (se quitó ese concepto).
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnadirGastoModal } from '@/components/AnadirGastoModal';
import { Logo } from '@/components/Logo';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { volverSeguro } from '@/constants/Navegacion';
import { useAuth } from '@/hooks/useAuth';

const FRAME_WIDTH = 393;
const COLOR_LABEL = '#216489';
const COLOR_MUTED = '#6B7B72';

const ACENTOS_GASTO = [
  { bg: Colors.celesteAgua, fg: '#216489', icono: 'receipt-outline' as const },
  { bg: '#FFE9E5', fg: '#C2410C', icono: 'restaurant-outline' as const },
  { bg: '#E6F9EC', fg: '#006449', icono: 'bed-outline' as const },
  { bg: '#EFE9FE', fg: '#5B3FA8', icono: 'car-outline' as const },
  { bg: '#FFF3D6', fg: '#8A6D00', icono: 'ticket-outline' as const },
];

interface Gasto {
  id_gasto: string;
  concepto: string;
  monto_total: number;
  fecha: string;
  usuarios?: { nombre: string };
}

interface Participante {
  id_usuario: string;
  nombre: string;
}

const formatoEuro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

function formatearFecha(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mismoDia(fecha, hoy)) return 'Hoy';
  if (mismoDia(fecha, ayer)) return 'Ayer';
  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export default function GastosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [nombreViaje, setNombreViaje] = useState('');
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalAnadir, setModalAnadir] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const [respGastos, respParticipantes, respViajes] = await Promise.all([
        fetchConToken(`/gastos/${id}`),
        fetchConToken(`/participantes/${id}`),
        fetchConToken('/viajes/mis-viajes'),
      ]);
      const [datosGastos, datosParticipantes, datosViajes] = await Promise.all([
        respGastos.json(),
        respParticipantes.json(),
        respViajes.json(),
      ]);

      if (respGastos.ok) setGastos(datosGastos.gastos ?? []);
      if (respParticipantes.ok) setParticipantes(datosParticipantes.participantes ?? []);
      if (respViajes.ok) {
        const viaje = datosViajes.viajes?.find((v: { id_viaje: string }) => v.id_viaje === id);
        setNombreViaje(viaje?.nombre_viaje ?? '');
      }
    } catch {
      // Sin conexión: se queda con lo último cargado.
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalGastado = gastos.reduce((suma, g) => suma + g.monto_total, 0);
  const promedioGasto = gastos.length > 0 ? totalGastado / gastos.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.blancoHueso }}>
      <ScrollView contentContainerStyle={{ paddingBottom: e(160) }} showsVerticalScrollIndicator={false}>
        {/* Navbar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8), paddingTop: insets.top + e(8), paddingHorizontal: e(9) }}>
          <Pressable onPress={() => volverSeguro({ pathname: '/viaje/[id]', params: { id } })} hitSlop={8}>
            <Ionicons name="chevron-back" size={e(22)} color={Colors.turquesa} />
          </Pressable>
          <Logo size={e(20)} />
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: e(80), alignItems: 'center' }}>
            <ActivityIndicator color={Colors.turquesa} size="large" />
          </View>
        ) : (
          <View style={{ paddingHorizontal: e(24), paddingTop: e(24), gap: e(24) }}>
            {/* Group balance */}
            <LinearGradient
              colors={[Colors.turquesa, 'rgba(14, 153, 176, 0.55)']}
              start={{ x: 1, y: 0.2 }}
              end={{ x: 0, y: 0.9 }}
              style={{
                width: '100%',
                paddingVertical: e(20),
                paddingHorizontal: e(22),
                borderRadius: e(24),
                overflow: 'hidden',
                shadowColor: Colors.turquesa,
                shadowOpacity: 0.3,
                shadowOffset: { width: 0, height: 8 },
                shadowRadius: 16,
                elevation: 8,
              }}>
              <Ionicons
                name="wallet"
                size={e(120)}
                color="rgba(255,255,255,0.08)"
                style={{ position: 'absolute', right: e(-20), bottom: e(-24) }}
              />

              <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: '#FFFFFF' }}>
                    Group Balance
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: 'rgba(255,255,255,0.85)' }} numberOfLines={1}>
                    {nombreViaje || 'Este viaje'}
                  </Text>
                </View>
                <View
                  style={{
                    width: e(38),
                    height: e(38),
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="wallet-outline" size={e(18)} color="#FFFFFF" />
                </View>
              </View>

              <View style={{ width: '100%', flexDirection: 'row', alignItems: 'flex-end', gap: e(8), marginTop: e(12) }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(30), letterSpacing: e(-0.56), color: '#FFFFFF' }}>
                  {formatoEuro.format(totalGastado)}
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.6), color: 'rgba(255,255,255,0.85)', marginBottom: e(6) }}>
                  Total Spent
                </Text>
              </View>

              {gastos.length > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: e(8),
                    marginTop: e(14),
                    paddingTop: e(12),
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.25)',
                  }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: 'rgba(255,255,255,0.85)' }}>
                    {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'} · media {formatoEuro.format(promedioGasto)}
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* Lista de gastos */}
            <View style={{ gap: e(12) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: COLOR_LABEL }}>Gastos</Text>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => router.push({ pathname: '/viaje/cuentas', params: { id } })}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.6), color: '#655A00' }}>
                    VER CUENTAS
                  </Text>
                  <Ionicons name="chevron-forward" size={e(12)} color="#655A00" />
                </Pressable>
              </View>

              {gastos.length === 0 ? (
                <View
                  style={{
                    width: '100%',
                    padding: e(28),
                    borderRadius: e(32),
                    backgroundColor: '#F4F3F1',
                    alignItems: 'center',
                  }}>
                  <Image
                    source={require('@/assets/images/capibara-money.png')}
                    resizeMode="contain"
                    style={{ width: e(96), height: e(80), marginBottom: e(12) }}
                  />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: Colors.azulProfundo, marginBottom: e(4) }}>
                    Todavía no hay gastos
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_MUTED, textAlign: 'center' }}>
                    Pulsa el botón de abajo para registrar el primero.
                  </Text>
                </View>
              ) : (
                gastos.map((gasto, indice) => {
                  const acento = ACENTOS_GASTO[indice % ACENTOS_GASTO.length];
                  return (
                    <View
                      key={gasto.id_gasto}
                      style={{
                        width: '100%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: e(14),
                        padding: e(16),
                        borderRadius: e(24),
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: 'rgba(0, 83, 119, 0.06)',
                        shadowColor: '#000000',
                        shadowOpacity: 0.04,
                        shadowOffset: { width: 0, height: 2 },
                        shadowRadius: 6,
                        elevation: 2,
                      }}>
                      <View
                        style={{
                          width: e(44),
                          height: e(44),
                          borderRadius: 999,
                          backgroundColor: acento.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name={acento.icono} size={e(19)} color={acento.fg} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(15), color: Colors.azulProfundo }} numberOfLines={1}>
                          {gasto.concepto}
                        </Text>
                        <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: COLOR_MUTED }}>
                          Pagó {gasto.usuarios?.nombre ?? 'alguien'} · {formatearFecha(gasto.fecha)}
                        </Text>
                      </View>
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: Colors.turquesa }}>
                        {formatoEuro.format(gasto.monto_total)}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            <Text style={{ textAlign: 'center', fontStyle: 'italic', fontSize: e(14), color: COLOR_LABEL, opacity: 0.8 }}>
              &quot;No te preocupes, vamos bien!&quot;
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Botón añadir */}
      <View style={{ position: 'absolute', bottom: insets.bottom + e(16), left: 0, right: 0, alignItems: 'center', gap: e(6) }}>
        <Pressable
          onPress={() => setModalAnadir(true)}
          style={{
            width: e(52),
            height: e(52),
            borderRadius: 999,
            backgroundColor: Colors.turquesa,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#95D0F8',
            shadowOpacity: 1,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 6,
            elevation: 6,
          }}>
          <Ionicons name="add" size={e(24)} color="#FFFFFF" />
        </Pressable>
        <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: e(12), color: Colors.azulProfundo }}>Añadir Gasto</Text>
      </View>

      <AnadirGastoModal
        visible={modalAnadir}
        idViaje={id}
        participantes={participantes}
        usuarioActualId={usuario?.id}
        onClose={() => setModalAnadir(false)}
        onCreado={cargar}
      />
    </View>
  );
}
