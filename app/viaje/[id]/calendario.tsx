// Pantalla de Calendario — medidas replicadas del diseño de Figma (frame de
// referencia 393px de ancho). Trae los eventos reales del viaje
// (GET /calendario/:id_viaje) y permite crear nuevos.
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrearActividadModal } from '@/components/CrearActividadModal';
import { Logo } from '@/components/Logo';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';

const FRAME_WIDTH = 393;
const COLOR_LABEL = '#216489';
const COLOR_MUTED = '#6B7B72';
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const SOMBRA_TARJETA = {
  shadowColor: '#000000',
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 6,
  elevation: 2,
};

const ACENTOS_EVENTO = [
  { bg: Colors.celesteAgua, fg: '#006449', icono: 'sparkles-outline' as const },
  { bg: '#FFE9E5', fg: '#C2410C', icono: 'walk-outline' as const },
  { bg: '#EFE9FE', fg: '#5B3FA8', icono: 'car-outline' as const },
  { bg: '#FFF3D6', fg: '#8A6D00', icono: 'camera-outline' as const },
];

interface Evento {
  id_evento: string;
  titulo: string;
  descripcion: string | null;
  ubicacion: string | null;
  fecha_hora_inicio: string;
  fecha_hora_fin: string | null;
}

// Iconos/colores por palabra clave del título (igual que estiloParaDocumento
// en docs.tsx); si no coincide con nada conocido, se rota por índice.
function estiloParaEvento(titulo: string, indice: number): { bg: string; fg: string; icono: keyof typeof Ionicons.glyphMap } {
  const t = titulo.toLowerCase();
  if (/vuelo|avión|aeropuerto|embarque/.test(t)) return { bg: '#FBEAEA', fg: '#BA1A1A', icono: 'airplane-outline' };
  if (/hotel|alojam|check-?in|check-?out/.test(t)) return { bg: Colors.celesteAgua, fg: '#216489', icono: 'bed-outline' };
  if (/comida|cena|almuerzo|desayuno|restaurante/.test(t)) return { bg: '#FFE9E5', fg: '#C2410C', icono: 'restaurant-outline' };
  if (/playa|mar|piscina|baño/.test(t)) return { bg: '#E0F7FA', fg: '#00707A', icono: 'sunny-outline' };
  return ACENTOS_EVENTO[indice % ACENTOS_EVENTO.length];
}

function claveFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function generarCeldasDelMes(mesVisible: Date): { fecha: Date; delMesActual: boolean }[] {
  const primerDia = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
  // getDay(): 0=domingo..6=sábado → lo pasamos a 0=lunes..6=domingo
  const offset = (primerDia.getDay() + 6) % 7;
  const inicioGrid = new Date(primerDia);
  inicioGrid.setDate(primerDia.getDate() - offset);

  return Array.from({ length: 42 }, (_, i) => {
    const fecha = new Date(inicioGrid);
    fecha.setDate(inicioGrid.getDate() + i);
    return { fecha, delMesActual: fecha.getMonth() === mesVisible.getMonth() };
  });
}

export default function CalendarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const hoy = useMemo(() => new Date(), []);
  const [mesVisible, setMesVisible] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [diaSeleccionado, setDiaSeleccionado] = useState(claveFecha(hoy));
  const [nombreViaje, setNombreViaje] = useState('');
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const [respEventos, respViajes] = await Promise.all([
        fetchConToken(`/calendario/${id}`),
        fetchConToken('/viajes/mis-viajes'),
      ]);
      const [datosEventos, datosViajes] = await Promise.all([respEventos.json(), respViajes.json()]);

      if (respEventos.ok) setEventos(datosEventos.eventos ?? []);
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

  const diasConEvento = useMemo(() => {
    const set = new Set<string>();
    eventos.forEach((ev) => set.add(claveFecha(new Date(ev.fecha_hora_inicio))));
    return set;
  }, [eventos]);

  const eventosDelDia = useMemo(
    () =>
      eventos
        .filter((ev) => claveFecha(new Date(ev.fecha_hora_inicio)) === diaSeleccionado)
        .sort((a, b) => a.fecha_hora_inicio.localeCompare(b.fecha_hora_inicio)),
    [eventos, diaSeleccionado]
  );

  const celdas = useMemo(() => generarCeldasDelMes(mesVisible), [mesVisible]);

  const cambiarMes = (delta: number) => setMesVisible((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const nombreMes = mesVisible
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <ScrollView contentContainerStyle={{ paddingBottom: e(160) }} showsVerticalScrollIndicator={false}>
        {/* Navbar */}
        <View style={{ paddingTop: insets.top + e(9), paddingHorizontal: e(9) }}>
          <Logo size={e(20)} />
        </View>

        <View style={{ paddingHorizontal: e(21), paddingTop: e(24), gap: e(16) }}>
          {/* Mes + navegación */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: COLOR_LABEL }}>{nombreMes}</Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: '#1A1C1A', opacity: 0.7 }} numberOfLines={1}>
                {nombreViaje || 'Tu viaje'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: e(8) }}>
              <Pressable
                onPress={() => cambiarMes(-1)}
                style={{ width: e(34), height: e(34), borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chevron-back" size={e(14)} color="#1A1C1A" />
              </Pressable>
              <Pressable
                onPress={() => cambiarMes(1)}
                style={{ width: e(34), height: e(34), borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chevron-forward" size={e(14)} color="#1A1C1A" />
              </Pressable>
            </View>
          </View>

          {/* Grid del calendario */}
          <View style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: e(32), padding: e(8), gap: e(16) }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: e(16),
                borderBottomWidth: 1,
                borderBottomColor: '#E9E8E5',
              }}>
              {DIAS_SEMANA.map((dia) => (
                <Text
                  key={dia}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: e(12),
                    letterSpacing: e(0.6),
                    color: '#6B7B72',
                  }}>
                  {dia}
                </Text>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {celdas.map(({ fecha, delMesActual }) => {
                const clave = claveFecha(fecha);
                const esSeleccionado = clave === diaSeleccionado;
                const esHoy = clave === claveFecha(hoy);
                const tieneEvento = diasConEvento.has(clave);

                return (
                  <Pressable
                    key={clave}
                    onPress={() => delMesActual && setDiaSeleccionado(clave)}
                    disabled={!delMesActual}
                    style={{
                      width: `${100 / 7}%`,
                      height: e(56),
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: delMesActual ? 1 : 0.2,
                    }}>
                    <View
                      style={{
                        width: e(32),
                        height: e(32),
                        borderRadius: 999,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: esSeleccionado ? '#98D3FD' : 'transparent',
                      }}>
                      <Text
                        style={{
                          fontFamily: esSeleccionado ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_400Regular',
                          fontSize: e(14),
                          color: esSeleccionado ? '#145C80' : esHoy ? Colors.turquesa : '#1A1C1A',
                        }}>
                        {fecha.getDate()}
                      </Text>
                    </View>
                    {tieneEvento && !esSeleccionado && (
                      <View style={{ width: e(6), height: e(6), borderRadius: 999, backgroundColor: '#006C50', marginTop: e(2) }} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Actividades del día seleccionado */}
          <View style={{ gap: e(12) }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: e(12),
                letterSpacing: e(1.2),
                textTransform: 'uppercase',
                color: '#3B4A43',
                paddingHorizontal: e(4),
              }}>
              {diaSeleccionado === claveFecha(hoy) ? 'Actividades de hoy' : 'Actividades de este día'}
            </Text>

            {isLoading ? (
              <ActivityIndicator color={Colors.turquesa} />
            ) : eventosDelDia.length === 0 ? (
              <View style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: e(32), padding: e(24), alignItems: 'center' }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: COLOR_MUTED, textAlign: 'center' }}>
                  No hay nada planeado para este día todavía.
                </Text>
              </View>
            ) : (
              eventosDelDia.map((evento) => {
                const hora = new Date(evento.fecha_hora_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                return (
                  <View
                    key={evento.id_evento}
                    style={{
                      width: '100%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: e(16),
                      padding: e(20),
                      borderRadius: e(32),
                      backgroundColor: '#FFFFFF',
                    }}>
                    <View
                      style={{
                        width: e(48),
                        height: e(48),
                        borderRadius: 999,
                        backgroundColor: Colors.celesteAgua,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Ionicons name="sparkles-outline" size={e(20)} color="#006449" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: '#1A1C1A' }} numberOfLines={2}>
                        {evento.titulo}
                      </Text>
                      <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: COLOR_MUTED }}>
                        {hora}
                        {evento.ubicacion ? ` • ${evento.ubicacion}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => setModalCrear(true)}
        style={{
          position: 'absolute',
          right: e(27),
          bottom: insets.bottom + e(24),
          width: e(52),
          height: e(52),
          borderRadius: 999,
          backgroundColor: Colors.turquesa,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 10,
          elevation: 6,
        }}>
        <Ionicons name="add" size={e(24)} color="#FFFFFF" />
      </Pressable>

      <CrearActividadModal
        visible={modalCrear}
        idViaje={id}
        fechaSeleccionada={diaSeleccionado}
        onClose={() => setModalCrear(false)}
        onCreado={cargar}
      />
    </View>
  );
}
