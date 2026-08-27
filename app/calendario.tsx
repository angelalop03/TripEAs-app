// Calendario general — ve todos tus viajes juntos en un único calendario.
// Cada día que cae dentro del rango de un viaje se pinta con el color propio
// de ese viaje; si hay solapamiento entre dos viajes, se marca con puntos de
// colores debajo del número. Se accede desde el sidebar de Mis Viajes.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { esErrorDeConexion, fetchConToken, MENSAJE_ERROR_CONEXION } from '@/constants/Api';
import { Colors } from '@/constants/Colors';

const FRAME_WIDTH = 393;
const COLOR_LABEL = '#216489';
const COLOR_MUTED = '#6B7B72';
const COLOR_TITULO = '#1A1C1A';
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const SOMBRA_TARJETA = {
  shadowColor: '#000000',
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 6,
  elevation: 2,
};

// Un color fijo por viaje (mismo viaje → mismo color siempre, calculado a
// partir de su id, no de su posición en la lista) para que el calendario no
// "recoloree" los viajes cada vez que cambia el orden de la respuesta.
const PALETA_VIAJES = [
  { bg: Colors.celesteAgua, fg: '#216489' },
  { bg: '#FFE9E5', fg: '#C2410C' },
  { bg: '#E6F9EC', fg: '#006449' },
  { bg: '#EFE9FE', fg: '#5B3FA8' },
  { bg: '#FFF3D6', fg: '#8A6D00' },
  { bg: '#FFE0F0', fg: '#B3175C' },
];

interface Viaje {
  id_viaje: string;
  nombre_viaje: string;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  url_portada: string | null;
}

interface EntradaDia {
  viaje: Viaje;
  color: { bg: string; fg: string };
}

function colorParaViaje(idViaje: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < idViaje.length; i++) {
    hash = (hash * 31 + idViaje.charCodeAt(i)) >>> 0;
  }
  return PALETA_VIAJES[hash % PALETA_VIAJES.length];
}

// Las fechas de los viajes vienen como "YYYY-MM-DD" (columna DATE, sin hora).
// Parsearlas con `new Date("YYYY-MM-DD")` las interpreta en UTC y puede
// desplazar el día en zonas horarias negativas, así que las construimos a
// mano en hora local (igual que hace CrearViajeModal al mostrarlas).
function parsearFechaLocal(fechaISO: string): Date {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function claveFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

// Todas las claves de fecha entre inicio y fin, ambos incluidos. Tope de
// seguridad de 366 días para no colgar la app si algún viaje tuviera fechas
// mal introducidas.
function fechasEntre(inicioISO: string, finISO: string): string[] {
  const inicio = parsearFechaLocal(inicioISO);
  const fin = parsearFechaLocal(finISO);
  const claves: string[] = [];
  const cursor = new Date(inicio);
  let tope = 0;
  while (cursor <= fin && tope < 366) {
    claves.push(claveFecha(cursor));
    cursor.setDate(cursor.getDate() + 1);
    tope += 1;
  }
  return claves;
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

function formatearDiaLargo(clave: string): string {
  const fecha = parsearFechaLocal(clave);
  const texto = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.replace(/^\w/, (c) => c.toUpperCase());
}

function formatearRango(inicio: string | null, fin: string | null) {
  if (!inicio) return 'Fechas por definir';
  const dIni = parsearFechaLocal(inicio);
  const inicioStr = dIni.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  if (!fin) return inicioStr;
  const dFin = parsearFechaLocal(fin);
  const finStr = dFin.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${inicioStr} - ${finStr}`;
}

export default function CalendarioGeneralScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const hoy = useMemo(() => new Date(), []);
  const [mesVisible, setMesVisible] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [diaSeleccionado, setDiaSeleccionado] = useState(claveFecha(hoy));
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorConexion, setErrorConexion] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await fetchConToken('/viajes/mis-viajes');
      const datos = await respuesta.json();
      if (respuesta.ok) {
        setViajes(datos.viajes ?? []);
        setErrorConexion(false);
      }
    } catch (err) {
      if (esErrorDeConexion(err)) setErrorConexion(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Solo los viajes con fecha de inicio pueden aparecer en el calendario.
  const viajesConFechas = useMemo(() => viajes.filter((v) => !!v.fecha_inicio), [viajes]);

  const viajesOrdenados = useMemo(
    () =>
      [...viajesConFechas].sort(
        (a, b) => parsearFechaLocal(a.fecha_inicio!).getTime() - parsearFechaLocal(b.fecha_inicio!).getTime()
      ),
    [viajesConFechas]
  );

  // Mapa "clave de fecha" → lista de viajes activos ese día (con su color ya
  // resuelto), para pintar la rejilla sin recalcular nada al vuelo.
  const diasPorViaje = useMemo(() => {
    const mapa = new Map<string, EntradaDia[]>();
    viajesConFechas.forEach((viaje) => {
      const color = colorParaViaje(viaje.id_viaje);
      const fin = viaje.fecha_fin ?? viaje.fecha_inicio!;
      fechasEntre(viaje.fecha_inicio!, fin).forEach((clave) => {
        const lista = mapa.get(clave) ?? [];
        lista.push({ viaje, color });
        mapa.set(clave, lista);
      });
    });
    return mapa;
  }, [viajesConFechas]);

  const celdas = useMemo(() => generarCeldasDelMes(mesVisible), [mesVisible]);

  const cambiarMes = (delta: number) => setMesVisible((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const irAHoy = () => {
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setDiaSeleccionado(claveFecha(hoy));
  };

  const enMesActual = mesVisible.getMonth() === hoy.getMonth() && mesVisible.getFullYear() === hoy.getFullYear();
  const mostrarBotonHoy = !enMesActual || diaSeleccionado !== claveFecha(hoy);

  const viajesDelDia = diasPorViaje.get(diaSeleccionado) ?? [];

  // Viaje a destacar en "Todos tus viajes": el que está en curso hoy, o si
  // no hay ninguno, el próximo por empezar.
  const idViajeEnCurso = diasPorViaje.get(claveFecha(hoy))?.[0]?.viaje.id_viaje ?? null;
  const idViajeDestacado = useMemo(() => {
    if (idViajeEnCurso) return idViajeEnCurso;
    const futuro = viajesOrdenados.find((v) => parsearFechaLocal(v.fecha_inicio!) >= hoy);
    return futuro?.id_viaje ?? null;
  }, [viajesOrdenados, idViajeEnCurso, hoy]);

  const abrirViaje = (viaje: Viaje) =>
    router.push({
      pathname: '/viaje/[id]',
      params: {
        id: viaje.id_viaje,
        nombre: viaje.nombre_viaje,
        fechaInicio: viaje.fecha_inicio ?? '',
        fechaFin: viaje.fecha_fin ?? '',
        urlPortada: viaje.url_portada ?? '',
      },
    });

  const nombreMes = mesVisible
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <ScrollView contentContainerStyle={{ paddingBottom: e(48) }} showsVerticalScrollIndicator={false}>
        {/* Navbar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8), paddingTop: insets.top + e(8), paddingHorizontal: e(9) }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={e(22)} color={Colors.turquesa} />
          </Pressable>
          <Logo size={e(20)} />
        </View>

        <View style={{ paddingHorizontal: e(21), paddingTop: e(16), gap: e(16) }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(14) }}>
              <View
                style={{
                  width: e(52),
                  height: e(52),
                  borderRadius: e(18),
                  backgroundColor: Colors.turquesa,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#00E9B0',
                  shadowOpacity: 0.35,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 10,
                  elevation: 4,
                }}>
                <Ionicons name="calendar" size={e(24)} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(26), letterSpacing: e(-0.5), color: COLOR_TITULO }}>
                  Calendario
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_MUTED, marginTop: e(2) }}>
                  Todos tus viajes, de un vistazo.
                </Text>
              </View>
            </View>
            {viajesConFechas.length > 0 && (
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: Colors.mintaSuave,
                  borderRadius: 999,
                  paddingHorizontal: e(10),
                  paddingVertical: e(3),
                  marginTop: e(10),
                  marginLeft: e(66),
                }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(11), color: '#006449' }}>
                  {viajesConFechas.length} viaje{viajesConFechas.length === 1 ? '' : 's'} con fechas
                </Text>
              </View>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator color={Colors.turquesa} style={{ marginTop: e(24) }} />
          ) : errorConexion && viajes.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: e(24) }}>
              <Text style={{ color: Colors.rojoSuave, fontSize: e(14), textAlign: 'center', marginBottom: e(12) }}>
                {MENSAJE_ERROR_CONEXION}
              </Text>
              <Pressable
                style={{ backgroundColor: Colors.turquesa, borderRadius: 25, paddingVertical: e(12), paddingHorizontal: e(32) }}
                onPress={() => {
                  setIsLoading(true);
                  cargar();
                }}>
                <Text style={{ color: Colors.blancoHueso, fontWeight: '600', fontSize: e(14) }}>Reintentar</Text>
              </Pressable>
            </View>
          ) : viajesConFechas.length === 0 ? (
            <View style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: e(32), padding: e(24), alignItems: 'center', ...SOMBRA_TARJETA }}>
              <Image source={require('@/assets/images/capibara.png')} resizeMode="contain" style={{ width: e(100), height: e(100), marginBottom: e(12) }} />
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: COLOR_TITULO, textAlign: 'center', marginBottom: e(4) }}>
                Aún no hay fechas que mostrar
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_MUTED, textAlign: 'center' }}>
                Ponle fecha de inicio a tus viajes para verlos aquí en conjunto.
              </Text>
            </View>
          ) : (
            <>
              {/* Mes + navegación */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(18), color: COLOR_LABEL }}>{nombreMes}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8) }}>
                  {mostrarBotonHoy && (
                    <Pressable
                      onPress={irAHoy}
                      style={{ height: e(34), borderRadius: 999, backgroundColor: '#FFFFFF', paddingHorizontal: e(14), alignItems: 'center', justifyContent: 'center', ...SOMBRA_TARJETA }}>
                      <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), color: Colors.turquesa }}>Hoy</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => cambiarMes(-1)}
                    style={{ width: e(34), height: e(34), borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', ...SOMBRA_TARJETA }}>
                    <Ionicons name="chevron-back" size={e(14)} color="#1A1C1A" />
                  </Pressable>
                  <Pressable
                    onPress={() => cambiarMes(1)}
                    style={{ width: e(34), height: e(34), borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', ...SOMBRA_TARJETA }}>
                    <Ionicons name="chevron-forward" size={e(14)} color="#1A1C1A" />
                  </Pressable>
                </View>
              </View>

              {/* Grid del calendario */}
              <View style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: e(32), padding: e(8), gap: e(16), ...SOMBRA_TARJETA }}>
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
                    const entradas = diasPorViaje.get(clave) ?? [];
                    const principal = entradas[0];
                    const hayVarios = entradas.length > 1;

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
                            backgroundColor: esSeleccionado ? '#98D3FD' : principal ? principal.color.bg : 'transparent',
                            borderWidth: esHoy && !esSeleccionado ? 1.5 : 0,
                            borderColor: Colors.turquesa,
                          }}>
                          <Text
                            style={{
                              fontFamily: esSeleccionado || esHoy || principal ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_400Regular',
                              fontSize: e(14),
                              color: esSeleccionado ? '#145C80' : esHoy ? Colors.turquesa : principal ? principal.color.fg : '#1A1C1A',
                            }}>
                            {fecha.getDate()}
                          </Text>
                        </View>
                        {hayVarios && (
                          <View style={{ flexDirection: 'row', gap: e(2), marginTop: e(2) }}>
                            {entradas.slice(0, 3).map((entrada) => (
                              <View
                                key={entrada.viaje.id_viaje}
                                style={{ width: e(5), height: e(5), borderRadius: 999, backgroundColor: entrada.color.fg }}
                              />
                            ))}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Viajes del día seleccionado */}
              <View style={{ gap: e(12) }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: e(8), paddingHorizontal: e(4) }}>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_600SemiBold',
                      fontSize: e(12),
                      letterSpacing: e(1.2),
                      textTransform: 'uppercase',
                      color: '#3B4A43',
                    }}>
                    {diaSeleccionado === claveFecha(hoy) ? 'Hoy' : 'Este día'}
                  </Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: COLOR_MUTED }} numberOfLines={1}>
                    {formatearDiaLargo(diaSeleccionado)}
                  </Text>
                </View>

                {viajesDelDia.length === 0 ? (
                  <View style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: e(24), padding: e(20), alignItems: 'center', ...SOMBRA_TARJETA }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_MUTED, textAlign: 'center' }}>
                      Ningún viaje activo este día.
                    </Text>
                  </View>
                ) : (
                  viajesDelDia.map(({ viaje, color }) => (
                    <Pressable
                      key={viaje.id_viaje}
                      onPress={() => abrirViaje(viaje)}
                      style={{
                        width: '100%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: e(16),
                        padding: e(18),
                        borderRadius: e(24),
                        backgroundColor: '#FFFFFF',
                        ...SOMBRA_TARJETA,
                      }}>
                      <View
                        style={{
                          width: e(44),
                          height: e(44),
                          borderRadius: 999,
                          backgroundColor: color.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="airplane-outline" size={e(18)} color={color.fg} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(15), color: COLOR_TITULO }} numberOfLines={1}>
                          {viaje.nombre_viaje}
                        </Text>
                        <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: COLOR_MUTED }} numberOfLines={1}>
                          {viaje.descripcion || 'Destino sin especificar'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={e(16)} color={COLOR_MUTED} />
                    </Pressable>
                  ))
                )}
              </View>

              {/* Todos los viajes, en conjunto */}
              <View style={{ gap: e(12), marginTop: e(8) }}>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: e(12),
                    letterSpacing: e(1.2),
                    textTransform: 'uppercase',
                    color: '#3B4A43',
                    paddingHorizontal: e(4),
                  }}>
                  Todos tus viajes
                </Text>

                {viajesOrdenados.map((viaje) => {
                  const color = colorParaViaje(viaje.id_viaje);
                  const destacado = viaje.id_viaje === idViajeDestacado;
                  return (
                    <Pressable
                      key={viaje.id_viaje}
                      onPress={() => abrirViaje(viaje)}
                      style={{
                        width: '100%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: e(14),
                        padding: e(14),
                        borderRadius: e(20),
                        backgroundColor: '#FFFFFF',
                        borderWidth: destacado ? 1.5 : 0,
                        borderColor: Colors.turquesa,
                        ...SOMBRA_TARJETA,
                      }}>
                      <View
                        style={{
                          width: e(36),
                          height: e(36),
                          borderRadius: 999,
                          backgroundColor: color.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="airplane-outline" size={e(15)} color={color.fg} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(6) }}>
                          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(14), color: COLOR_TITULO }} numberOfLines={1}>
                            {viaje.nombre_viaje}
                          </Text>
                          {destacado && (
                            <View style={{ backgroundColor: idViajeEnCurso === viaje.id_viaje ? '#E6F9EC' : Colors.celesteAgua, borderRadius: 999, paddingHorizontal: e(8), paddingVertical: e(2) }}>
                              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(9), letterSpacing: e(0.4), color: idViajeEnCurso === viaje.id_viaje ? '#006449' : '#216489' }}>
                                {idViajeEnCurso === viaje.id_viaje ? 'EN CURSO' : 'PRÓXIMO'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(11), color: COLOR_MUTED }} numberOfLines={1}>
                          {(viaje.descripcion || 'Destino sin especificar') + ' · ' + formatearRango(viaje.fecha_inicio, viaje.fecha_fin)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={e(14)} color={COLOR_MUTED} />
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
