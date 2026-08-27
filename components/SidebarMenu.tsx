// Menú lateral (drawer) que se abre al pulsar la pill de perfil del Home.
// Medidas replicadas del diseño de Figma (sidebar de 256px de ancho).
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const FRAME_WIDTH = 256;

function ItemMenu({
  icono,
  etiqueta,
  color,
  chevron,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  etiqueta: string;
  color?: string;
  chevron?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: pressed ? Colors.celesteAgua : 'transparent',
      })}>
      <Ionicons name={icono} size={20} color={color ?? '#030723'} />
      <Text style={{ flex: 1, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: color ?? '#030723' }}>
        {etiqueta}
      </Text>
      {chevron && <Ionicons name="chevron-down" size={16} color="#030723" />}
    </Pressable>
  );
}

export function SidebarMenu({ visible, onClose }: Props) {
  const { usuario, logout } = useAuth();
  const { width: anchoPantalla } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const anchoDrawer = Math.min(anchoPantalla * 0.75, FRAME_WIDTH + 24);

  const traslacion = useRef(new Animated.Value(-anchoDrawer)).current;

  useEffect(() => {
    Animated.timing(traslacion, {
      toValue: visible ? 0 : -anchoDrawer,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, anchoDrawer, traslacion]);

  const iniciales = (usuario?.nombre ?? 'U').trim().charAt(0).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Animated.View
          style={{
            width: anchoDrawer,
            height: '100%',
            backgroundColor: '#FFFFFF',
            borderTopRightRadius: 28,
            borderBottomRightRadius: 28,
            paddingTop: insets.top + 24,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 24,
            gap: 24,
            transform: [{ translateX: traslacion }],
            shadowColor: '#000000',
            shadowOpacity: 0.15,
            shadowOffset: { width: 6, height: 0 },
            shadowRadius: 20,
            elevation: 12,
          }}>
          {/* Perfil */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {usuario?.url_foto_perfil ? (
              <Image source={{ uri: usuario.url_foto_perfil }} style={{ width: 44, height: 44, borderRadius: 22 }} resizeMode="cover" />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: Colors.celesteAgua,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ color: Colors.azulProfundo, fontSize: 18, fontWeight: '700' }}>{iniciales}</Text>
              </View>
            )}
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.turquesa }} numberOfLines={1}>
              {usuario?.nombre ?? 'User'}
            </Text>
          </View>

          <View style={{ width: '100%', height: 2, backgroundColor: '#F6F6F6', borderRadius: 2 }} />

          {/* Navegación principal */}
          <View style={{ width: '100%', gap: 8 }}>
            <ItemMenu icono="file-tray-outline" etiqueta="Mis Viajes" onPress={onClose} />
            <ItemMenu
              icono="calendar-outline"
              etiqueta="Calendario"
              onPress={() => {
                onClose();
                router.push('/calendario');
              }}
            />
            <ItemMenu
              icono="settings-outline"
              etiqueta="Ajustes"
              onPress={() => {
                onClose();
                router.push('/ajustes-perfil');
              }}
            />
          </View>

          <View style={{ flex: 1 }} />

          {/* Navegación secundaria */}
          <View style={{ width: '100%', gap: 8 }}>
            <ItemMenu
              icono="help-circle-outline"
              etiqueta="Ayuda"
              onPress={() => {
                onClose();
                router.push('/ayuda');
              }}
            />
            <ItemMenu
              icono="log-out-outline"
              etiqueta="Logout Account"
              color="#A62015"
              onPress={() => {
                onClose();
                logout();
              }}
            />
          </View>
        </Animated.View>

        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={onClose} />
      </View>
    </Modal>
  );
}
