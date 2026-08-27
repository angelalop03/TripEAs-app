// Listas del viaje — medidas replicadas del diseño de Figma (frame de
// referencia 393px). Usa los endpoints reales de /api/listas (ya existían:
// crear, listar con items anidados, añadir item, marcar completado); no
// hizo falta tocar el backend.
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarraInferiorViaje } from '@/components/BarraInferiorViaje';
import { CrearListaModal } from '@/components/CrearListaModal';
import { Logo } from '@/components/Logo';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { volverSeguro } from '@/constants/Navegacion';

const FRAME_WIDTH = 393;
const COLOR_MUTED = '#6B7B72';
const COLOR_SUBTITULO = '#3B4A43';

// Variedad de color por lista (sin implicar categorías: mismo icono para
// todas, solo cambia el acento) para que la pantalla no se vea monótona.
const ACENTOS_LISTA = [
  { bg: Colors.celesteAgua, fg: '#216489' },
  { bg: '#FFE9E5', fg: '#C2410C' },
  { bg: '#E6F9EC', fg: '#006449' },
  { bg: '#EFE9FE', fg: '#5B3FA8' },
  { bg: '#FFF3D6', fg: '#8A6D00' },
];

interface Item {
  id_item: string;
  nombre_item: string;
  esta_completado: boolean;
  id_asignado_a: string | null;
  usuarios?: { nombre: string };
}

interface Lista {
  id_lista: string;
  titulo_lista: string;
  items_lista: Item[];
}

const TIPS_CAPI = [
  '¡Todo listo para la aventura! No olvides revisar que tenemos suficiente agua.',
  'Las listas compartidas evitan que dos personas compren lo mismo. ¡Repártanse las tareas!',
  'Marca los items según los vayáis consiguiendo, así todos veis el progreso en tiempo real.',
];

export default function ListasScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [listas, setListas] = useState<Lista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [modalCrear, setModalCrear] = useState(false);
  const [nuevoItemPorLista, setNuevoItemPorLista] = useState<Record<string, string>>({});
  const [tip] = useState(() => TIPS_CAPI[Math.floor(Math.random() * TIPS_CAPI.length)]);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const respuesta = await fetchConToken(`/listas/${id}`);
      const datos = await respuesta.json();
      if (respuesta.ok) setListas(datos.listas ?? []);
    } catch {
      // Sin conexión: se queda con lo último cargado.
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const listasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return listas;
    const termino = busqueda.trim().toLowerCase();
    return listas.filter((lista) => lista.titulo_lista.toLowerCase().includes(termino));
  }, [listas, busqueda]);

  const alternarExpandida = (idLista: string) => {
    setExpandidas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(idLista)) nuevas.delete(idLista);
      else nuevas.add(idLista);
      return nuevas;
    });
  };

  const alternarCompletado = async (item: Item) => {
    setListas((previas) =>
      previas.map((lista) => ({
        ...lista,
        items_lista: lista.items_lista.map((i) => (i.id_item === item.id_item ? { ...i, esta_completado: !i.esta_completado } : i)),
      }))
    );
    try {
      const respuesta = await fetchConToken(`/listas/items/${item.id_item}/completar`, {
        method: 'PATCH',
        body: JSON.stringify({ esta_completado: !item.esta_completado }),
      });
      if (!respuesta.ok) await cargar();
    } catch {
      await cargar();
    }
  };

  const anadirItem = async (idLista: string) => {
    const nombreItem = (nuevoItemPorLista[idLista] ?? '').trim();
    if (!nombreItem) return;
    setNuevoItemPorLista((previos) => ({ ...previos, [idLista]: '' }));
    try {
      const respuesta = await fetchConToken('/listas/items/anadir', {
        method: 'POST',
        body: JSON.stringify({ id_lista: idLista, nombre_item: nombreItem }),
      });
      if (respuesta.ok) await cargar();
    } catch {
      // Sin conexión: el item no se añadió, no hacemos nada más.
    }
  };

  const irATab = (nombre: string) => {
    if (nombre === 'gastos') router.replace({ pathname: '/viaje/[id]/gastos', params: { id } });
    else if (nombre === 'calendario') router.replace({ pathname: '/viaje/[id]/calendario', params: { id } });
    else if (nombre === 'index') router.replace({ pathname: '/viaje/[id]', params: { id } });
    else if (nombre === 'elegir') router.replace({ pathname: '/viaje/[id]/elegir', params: { id } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: e(24) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Navbar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8), paddingTop: insets.top + e(8), paddingHorizontal: e(9) }}>
          <Pressable onPress={() => volverSeguro({ pathname: '/viaje/[id]', params: { id } })} hitSlop={8}>
            <Ionicons name="chevron-back" size={e(22)} color={Colors.turquesa} />
          </Pressable>
          <Logo size={e(20)} />
        </View>

        <View style={{ paddingHorizontal: e(24), paddingTop: e(16), gap: e(24) }}>
          {/* Buscador */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FDFDFD',
              borderRadius: e(20),
              paddingHorizontal: e(16),
              height: e(48),
              shadowColor: '#000000',
              shadowOpacity: 0.06,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 2,
            }}>
            <TextInput
              style={{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: '#1A1C1A' }}
              placeholder="Buscar cualquier cosa..."
              placeholderTextColor="rgba(0,0,0,0.57)"
              value={busqueda}
              onChangeText={setBusqueda}
            />
            <View style={{ width: e(28), height: e(28), borderRadius: 999, backgroundColor: Colors.turquesa, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="search" size={e(14)} color="#FFFFFF" />
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator color={Colors.turquesa} style={{ marginTop: e(20) }} />
          ) : listasFiltradas.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: e(32),
                paddingHorizontal: e(24),
                backgroundColor: '#FFFFFF',
                borderRadius: e(24),
                shadowColor: '#000000',
                shadowOpacity: 0.05,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 6,
                elevation: 2,
              }}>
              <Image source={require('@/assets/images/capibara.png')} resizeMode="contain" style={{ width: e(100), height: e(100), marginBottom: e(12) }} />
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: Colors.azulProfundo, marginBottom: e(4) }}>
                {listas.length === 0 ? 'Aún no hay listas' : 'Ninguna lista coincide'}
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(13), color: COLOR_SUBTITULO, textAlign: 'center' }}>
                {listas.length === 0 ? 'Crea la primera con el botón +' : 'Prueba con otra búsqueda.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: e(16) }}>
              {listasFiltradas.map((lista, indice) => {
                const total = lista.items_lista.length;
                const completados = lista.items_lista.filter((i) => i.esta_completado).length;
                const expandida = expandidas.has(lista.id_lista);
                const pendientes = total - completados;
                const acento = ACENTOS_LISTA[indice % ACENTOS_LISTA.length];

                return (
                  <View
                    key={lista.id_lista}
                    style={{
                      width: '100%',
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: 'rgba(0,0,0,0.05)',
                      borderRadius: e(16),
                      shadowColor: '#000000',
                      shadowOpacity: 0.05,
                      shadowOffset: { width: 0, height: 1 },
                      shadowRadius: 2,
                      overflow: 'hidden',
                    }}>
                    <Pressable
                      onPress={() => alternarExpandida(lista.id_lista)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: e(14), padding: e(20) }}>
                      <View
                        style={{
                          width: e(44),
                          height: e(44),
                          borderRadius: 999,
                          backgroundColor: acento.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="list-outline" size={e(20)} color={acento.fg} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(18), color: Colors.azulProfundo }} numberOfLines={1}>
                          {lista.titulo_lista}
                        </Text>
                        <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: COLOR_SUBTITULO, marginTop: e(2) }}>
                          {total === 0 ? 'Sin items todavía' : pendientes === 0 ? `${completados} de ${total} completados` : `${pendientes} pendiente${pendientes === 1 ? '' : 's'}`}
                        </Text>
                        {total > 0 && (
                          <View style={{ height: e(4), borderRadius: 999, backgroundColor: '#E9E8E5', marginTop: e(8), overflow: 'hidden' }}>
                            <View
                              style={{
                                height: '100%',
                                width: `${(completados / total) * 100}%`,
                                backgroundColor: pendientes === 0 ? Colors.mintaSuave : Colors.turquesa,
                                borderRadius: 999,
                              }}
                            />
                          </View>
                        )}
                      </View>
                      <Ionicons name={expandida ? 'chevron-up' : 'chevron-down'} size={e(16)} color={COLOR_SUBTITULO} />
                    </Pressable>

                    {expandida && (
                      <View style={{ paddingHorizontal: e(20), paddingBottom: e(20), gap: e(10) }}>
                        {lista.items_lista.map((item) => (
                          <Pressable
                            key={item.id_item}
                            onPress={() => alternarCompletado(item)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: e(12) }}>
                            <View
                              style={{
                                width: e(22),
                                height: e(22),
                                borderRadius: e(6),
                                borderWidth: 1.5,
                                borderColor: item.esta_completado ? Colors.turquesa : '#B9CBC1',
                                backgroundColor: item.esta_completado ? Colors.turquesa : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                              {item.esta_completado && <Ionicons name="checkmark" size={e(14)} color="#FFFFFF" />}
                            </View>
                            <Text
                              style={{
                                flex: 1,
                                fontFamily: 'PlusJakartaSans_400Regular',
                                fontSize: e(14),
                                color: item.esta_completado ? COLOR_MUTED : '#1A1C1A',
                                textDecorationLine: item.esta_completado ? 'line-through' : 'none',
                              }}>
                              {item.nombre_item}
                            </Text>
                          </Pressable>
                        ))}

                        <View style={{ flexDirection: 'row', gap: e(8), marginTop: e(4) }}>
                          <TextInput
                            style={{
                              flex: 1,
                              backgroundColor: '#F4F3F1',
                              borderWidth: 1,
                              borderColor: '#E3E2E0',
                              borderRadius: e(20),
                              paddingHorizontal: e(14),
                              paddingVertical: e(10),
                              fontFamily: 'PlusJakartaSans_400Regular',
                              fontSize: e(13),
                              color: '#1A1C1A',
                            }}
                            placeholder="Añadir item..."
                            placeholderTextColor="#6B7280"
                            value={nuevoItemPorLista[lista.id_lista] ?? ''}
                            onChangeText={(texto) => setNuevoItemPorLista((previos) => ({ ...previos, [lista.id_lista]: texto }))}
                            onSubmitEditing={() => anadirItem(lista.id_lista)}
                            returnKeyType="done"
                          />
                          <Pressable
                            onPress={() => anadirItem(lista.id_lista)}
                            style={{ width: e(38), height: e(38), borderRadius: e(20), backgroundColor: '#98D3FD', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="add" size={e(16)} color="#145C80" />
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Capi tip */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: e(16),
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: 'rgba(14, 153, 176, 0.1)',
              borderRadius: e(16),
              padding: e(20),
              shadowColor: '#000000',
              shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 1 },
              shadowRadius: 2,
            }}>
            <View style={{ width: e(64), height: e(64), borderRadius: 999, backgroundColor: 'rgba(255, 241, 118, 0.3)', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={require('@/assets/images/capibara.png')} resizeMode="contain" style={{ width: e(56), height: e(56) }} />
            </View>
            <View style={{ flex: 1, gap: e(4) }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontStyle: 'italic', fontSize: e(14), color: Colors.azulProfundo, lineHeight: e(18) }}>
                &quot;{tip}&quot;
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: Colors.turquesa }}>- Capi</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botón flotante para crear lista — BarraInferiorViaje usa medidas
          fijas (sin la escala e() de esta pantalla) y su alto real depende
          del safe-area del dispositivo, así que el offset se calcula con
          insets.bottom en vez de un valor fijo (por eso antes quedaba
          tapado en dispositivos con home indicator). */}
      <Pressable
        onPress={() => setModalCrear(true)}
        style={{
          position: 'absolute',
          right: e(27),
          bottom: insets.bottom + 84,
          width: e(56),
          height: e(56),
          borderRadius: 999,
          backgroundColor: Colors.turquesa,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000000',
          shadowOpacity: 0.2,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 12,
          elevation: 6,
        }}>
        <Ionicons name="add" size={e(24)} color="#FFFFFF" />
      </Pressable>

      <BarraInferiorViaje activo="mas" idViaje={id} onPressTab={irATab} />

      <CrearListaModal visible={modalCrear} idViaje={id} onClose={() => setModalCrear(false)} onCreada={cargar} />
    </View>
  );
}
