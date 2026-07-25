// Modal para crear una lista compartida (POST /api/listas/crear) y, si el
// usuario escribe algo, sus primeros items (POST /api/listas/items/anadir).
// No hay toggle de "compartida con todos": la tabla "listas" no tiene
// ningún campo de permisos, así que cualquier participante del viaje ya
// puede ver y marcar los items de todas las listas por defecto.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';

interface Props {
  visible: boolean;
  idViaje: string;
  onClose: () => void;
  onCreada: () => void;
}

const FRAME_WIDTH = 362;
const COLOR_LABEL = '#216489';
const COLOR_TEAL_OSCURO = '#006878';

export function CrearListaModal({ visible, idViaje, onClose, onCreada }: Props) {
  const { width } = useWindowDimensions();
  const anchoModal = Math.min(width - 32, FRAME_WIDTH);
  const e = (valor: number) => (valor / FRAME_WIDTH) * anchoModal;

  const [nombre, setNombre] = useState('');
  const [itemNuevo, setItemNuevo] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);

  const cerrarYLimpiar = () => {
    setNombre('');
    setItemNuevo('');
    setItems([]);
    setError('');
    onClose();
  };

  const anadirItemLocal = () => {
    const limpio = itemNuevo.trim();
    if (!limpio) return;
    setItems((previos) => [...previos, limpio]);
    setItemNuevo('');
  };

  const quitarItemLocal = (indice: number) => {
    setItems((previos) => previos.filter((_, i) => i !== indice));
  };

  const crear = async () => {
    if (nombre.trim().length === 0) {
      setError('Ponle un nombre a la lista');
      return;
    }
    setError('');
    setCreando(true);
    try {
      const respuesta = await fetchConToken('/listas/crear', {
        method: 'POST',
        body: JSON.stringify({ id_viaje: idViaje, titulo_lista: nombre.trim() }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setError(datos?.error || 'No se pudo crear la lista');
        return;
      }

      const idLista = datos.lista?.id_lista;
      if (idLista && items.length > 0) {
        await Promise.all(
          items.map((nombreItem) =>
            fetchConToken('/listas/items/anadir', {
              method: 'POST',
              body: JSON.stringify({ id_lista: idLista, nombre_item: nombreItem }),
            }).catch(() => null)
          )
        );
      }

      onCreada();
      cerrarYLimpiar();
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setCreando(false);
    }
  };

  const etiquetaEstilo = {
    fontFamily: 'PlusJakartaSans_400Regular' as const,
    fontSize: e(14),
    color: COLOR_LABEL,
    marginBottom: e(8),
  };

  const campoEstilo = {
    width: '100%' as const,
    backgroundColor: '#F4F3F1',
    borderWidth: 1,
    borderColor: '#E3E2E0',
    borderRadius: e(32),
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrarYLimpiar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{ width: anchoModal, maxHeight: '88%', backgroundColor: '#FAF9F6', borderRadius: e(20), overflow: 'hidden' }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: e(24),
            paddingVertical: e(18),
            backgroundColor: '#FAF9F6',
            borderBottomWidth: 1,
            borderBottomColor: '#E3E2E0',
          }}>
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: '#1A1C1A' }}>Nueva Lista</Text>
          <Pressable onPress={cerrarYLimpiar} hitSlop={8}>
            <Ionicons name="close" size={e(20)} color="#1A1C1A" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: e(24), gap: e(20) }} keyboardShouldPersistTaps="handled">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: e(16),
              backgroundColor: 'rgba(111, 220, 245, 0.2)',
              borderWidth: 1,
              borderColor: 'rgba(111, 220, 245, 0.3)',
              borderRadius: e(32),
              padding: e(16),
            }}>
            <View
              style={{
                width: e(64),
                height: e(64),
                borderRadius: 999,
                backgroundColor: '#FFFFFF',
                borderWidth: 2,
                borderColor: '#6FDCF5',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
              <Image source={require('@/assets/images/capibara.png')} resizeMode="contain" style={{ width: e(56), height: e(56) }} />
            </View>
            <View style={{ flex: 1, gap: e(4) }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: COLOR_TEAL_OSCURO }}>Capi dice:</Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontStyle: 'italic', fontSize: e(12), color: '#3B4A43', lineHeight: e(20) }}>
                &quot;¡Una lista compartida hace que todo fluya mejor! ¿Qué necesitamos para esta aventura?&quot;
              </Text>
            </View>
          </View>

          <View>
            <Text style={etiquetaEstilo}>Nombre de la lista</Text>
            <TextInput
              style={[campoEstilo, { paddingHorizontal: e(16), paddingVertical: e(16), fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(16), color: '#1A1C1A' }]}
              placeholder="Ej. Cosas para el camping"
              placeholderTextColor="rgba(59, 74, 67, 0.5)"
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

          <View style={{ gap: e(16) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), letterSpacing: e(0.7), textTransform: 'uppercase', color: COLOR_LABEL }}>
                Añadir primeros items
              </Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: '#3B4A43' }}>Opcional</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: e(8) }}>
              <TextInput
                style={[campoEstilo, { flex: 1, paddingHorizontal: e(16), paddingVertical: e(14), fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: '#1A1C1A' }]}
                placeholder="Añadir algo..."
                placeholderTextColor="#6B7280"
                value={itemNuevo}
                onChangeText={setItemNuevo}
                onSubmitEditing={anadirItemLocal}
                returnKeyType="done"
              />
              <Pressable
                onPress={anadirItemLocal}
                style={{ width: e(48), height: e(48), borderRadius: e(32), backgroundColor: '#98D3FD', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={e(20)} color="#145C80" />
              </Pressable>
            </View>

            {items.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: e(8) }}>
                {items.map((item, indice) => (
                  <View
                    key={`${item}-${indice}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: e(8),
                      backgroundColor: '#E9E8E5',
                      borderWidth: 1,
                      borderColor: '#B9CBC1',
                      borderRadius: 999,
                      paddingHorizontal: e(12),
                      paddingVertical: e(6),
                    }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: '#1A1C1A' }}>{item}</Text>
                    <Pressable onPress={() => quitarItemLocal(indice)} hitSlop={6}>
                      <Ionicons name="close" size={e(12)} color="rgba(26,28,26,0.6)" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {error ? <Text style={{ color: Colors.rojoSuave, fontSize: e(13), textAlign: 'center' }}>{error}</Text> : null}
        </ScrollView>

        <View style={{ padding: e(24), paddingTop: e(16), backgroundColor: '#FAF9F6' }}>
          <Pressable
            onPress={crear}
            disabled={creando}
            style={{
              width: '100%',
              height: e(56),
              borderRadius: 999,
              backgroundColor: COLOR_TEAL_OSCURO,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: e(8),
              opacity: creando ? 0.7 : 1,
            }}>
            {creando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: '#FFFFFF' }}>Crear Lista</Text>
                <Ionicons name="send" size={e(15)} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>
      </View>
      </View>
    </Modal>
  );
}
