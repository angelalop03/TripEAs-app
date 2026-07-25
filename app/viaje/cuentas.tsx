// Pantalla de Cuentas — quién le debe a quién, calculado por el backend
// (GET /gastos/:id_viaje/liquidacion, algoritmo de teoría de grafos que
// minimiza el número de transferencias). Misma estética que Gastos.
// Vive fuera de app/viaje/[id]/ (los tabs) para que no aparezca como una
// pestaña más — se navega aquí con router.push pasando el id por parámetro.
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarraInferiorViaje } from '@/components/BarraInferiorViaje';
import { Logo } from '@/components/Logo';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { volverSeguro } from '@/constants/Navegacion';

const FRAME_WIDTH = 393;
const COLOR_LABEL = '#216489';
const COLOR_MUTED = '#6B7B72';

interface Transaccion {
  de_id: string;
  de_nombre: string;
  a_id: string;
  a_nombre: string;
  cantidad: number;
}

interface Balance {
  id_usuario: string;
  nombre: string;
  balance: number;
  estado: 'le deben' | 'debe' | 'saldado';
}

const formatoEuro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

function Inicial({ nombre }: { nombre: string }) {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        backgroundColor: Colors.celesteAgua,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontWeight: '700', fontSize: 13, color: Colors.azulProfundo }}>
        {nombre.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function CuentasScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const respuesta = await fetchConToken(`/gastos/${id}/liquidacion`);
      const datos = await respuesta.json();
      if (respuesta.ok) {
        setTransacciones(datos.transacciones_optimas ?? []);
        setBalances(datos.resumen_balances ?? []);
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

  const irATab = (nombre: string) => {
    if (nombre === 'gastos') router.replace({ pathname: '/viaje/[id]/gastos', params: { id } });
    else if (nombre === 'calendario') router.replace({ pathname: '/viaje/[id]/calendario', params: { id } });
    else if (nombre === 'index') router.replace({ pathname: '/viaje/[id]', params: { id } });
    else if (nombre === 'elegir') router.replace({ pathname: '/viaje/[id]/elegir', params: { id } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.blancoHueso }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: e(24) }} showsVerticalScrollIndicator={false}>
        {/* Navbar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8), paddingTop: insets.top + e(8), paddingHorizontal: e(9) }}>
          <Pressable onPress={() => volverSeguro({ pathname: '/viaje/[id]/gastos', params: { id } })} hitSlop={8}>
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
            <View>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: COLOR_LABEL }}>Cuentas</Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: COLOR_MUTED, marginTop: e(4) }}>
                El mínimo de transferencias para saldarlo todo.
              </Text>
            </View>

            {/* Transferencias */}
            {transacciones.length === 0 ? (
              <View
                style={{
                  width: '100%',
                  alignItems: 'center',
                  padding: e(24),
                  borderRadius: e(32),
                  backgroundColor: '#F4F3F1',
                }}>
                <Image
                  source={require('@/assets/images/capibara.png')}
                  resizeMode="contain"
                  style={{ width: e(96), height: e(96), marginBottom: e(12) }}
                />
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(18), color: Colors.azulProfundo, marginBottom: e(4) }}>
                  ¡Todo saldado!
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_MUTED, textAlign: 'center' }}>
                  Nadie le debe nada a nadie ahora mismo.
                </Text>
              </View>
            ) : (
              <View style={{ gap: e(12) }}>
                {transacciones.map((tx, indice) => (
                  <View
                    key={`${tx.de_id}-${tx.a_id}-${indice}`}
                    style={{
                      width: '100%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: e(12),
                      padding: e(16),
                      borderRadius: e(24),
                      backgroundColor: '#F4F3F1',
                    }}>
                    <Inicial nombre={tx.de_nombre} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: Colors.azulProfundo }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{tx.de_nombre}</Text> le debe a{' '}
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{tx.a_nombre}</Text>
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={e(14)} color={COLOR_MUTED} />
                    <Inicial nombre={tx.a_nombre} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(15), color: Colors.rojoSuave, marginLeft: e(4) }}>
                      {formatoEuro.format(tx.cantidad)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Balance por persona */}
            {balances.length > 0 && (
              <View style={{ gap: e(12) }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(18), color: COLOR_LABEL }}>
                  Balance por persona
                </Text>
                <View style={{ borderRadius: e(24), backgroundColor: '#F4F3F1', overflow: 'hidden' }}>
                  {balances.map((b, indice) => (
                    <View
                      key={b.id_usuario}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: e(12),
                        paddingHorizontal: e(16),
                        paddingVertical: e(14),
                        borderTopWidth: indice === 0 ? 0 : 1,
                        borderTopColor: '#E3E2E0',
                      }}>
                      <Inicial nombre={b.nombre} />
                      <Text style={{ flex: 1, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(14), color: Colors.azulProfundo }} numberOfLines={1}>
                        {b.nombre}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'PlusJakartaSans_700Bold',
                          fontSize: e(14),
                          color: b.estado === 'le deben' ? '#006C50' : b.estado === 'debe' ? Colors.rojoSuave : COLOR_MUTED,
                        }}>
                        {b.estado === 'saldado' ? 'Saldado' : `${b.estado === 'le deben' ? '+' : '-'}${formatoEuro.format(Math.abs(b.balance))}`}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <BarraInferiorViaje activo="gastos" idViaje={id} onPressTab={irATab} />
    </View>
  );
}
