// Pantalla placeholder para los tabs del detalle de viaje que aún no están construidos.
import { Ionicons } from '@expo/vector-icons';
import { Image, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';

export function EnConstruccion({ icono, titulo }: { icono: keyof typeof Ionicons.glyphMap; titulo: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Image
        source={require('@/assets/images/capibara.png')}
        resizeMode="contain"
        style={{ width: 140, height: 140, marginBottom: 16 }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: Colors.celesteAgua,
          borderRadius: 999,
          paddingHorizontal: 16,
          paddingVertical: 8,
          marginBottom: 12,
        }}>
        <Ionicons name={icono} size={16} color={Colors.azulProfundo} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.azulProfundo }}>{titulo}</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1C1A', textAlign: 'center', marginBottom: 8 }}>
        Muy pronto
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7B72', textAlign: 'center' }}>
        Esta sección todavía está en construcción.
      </Text>
    </View>
  );
}
