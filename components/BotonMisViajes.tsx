// Botón de "ir a Mis Viajes": logo TripEAs + etiqueta debajo, para que
// quede claro que lleva al listado principal de viajes (no es "atrás").
// Mismo aspecto fijo en todas las pantallas del viaje para que el usuario
// lo reconozca siempre igual, sin depender de la escala local de cada pantalla.
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { Logo } from '@/components/Logo';

export function BotonMisViajes() {
  return (
    <Pressable onPress={() => router.replace('/')} hitSlop={8} style={{ alignItems: 'center' }}>
      <Logo size={20} />
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 9,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: '#6B7B72',
          marginTop: 1,
        }}>
        Mis Viajes
      </Text>
    </Pressable>
  );
}
