// Tab "More" — menú con las secciones del viaje que no caben en la barra
// inferior: Documentos, Álbum y Ajustes.
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Colors } from '@/constants/Colors';

const COLOR_LABEL = '#216489';
const COLOR_MUTED = '#6B7B72';

const OPCIONES = [
  {
    icono: 'document-text-outline' as const,
    color: '#98D3FD',
    colorIcono: '#145C80',
    titulo: 'Documentos',
    descripcion: 'Billetes, reservas y PDFs del viaje',
    ruta: '/viaje/docs' as const,
  },
  {
    icono: 'images-outline' as const,
    color: '#F0A8C4',
    colorIcono: '#8A2151',
    titulo: 'Álbum',
    descripcion: 'Fotos y vídeos compartidos',
    ruta: '/viaje/album' as const,
  },
  {
    icono: 'settings-outline' as const,
    color: '#E3E2E0',
    colorIcono: '#3B4A43',
    titulo: 'Ajustes del viaje',
    descripcion: 'Nombre, código de invitación y más',
    ruta: '/viaje/ajustes' as const,
  },
];

export default function MasScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <View style={{ paddingTop: insets.top + 9, paddingHorizontal: 9 }}>
        <Logo size={20} />
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 24, gap: 16 }}>
        <View>
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: COLOR_LABEL }}>Más</Text>
          <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: '#1A1C1A', opacity: 0.7, marginTop: 4 }}>
            Todo lo demás del viaje
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {OPCIONES.map((opcion) => (
            <Pressable
              key={opcion.titulo}
              onPress={() => router.push({ pathname: opcion.ruta, params: { id } })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: 'rgba(0, 83, 119, 0.05)',
                borderRadius: 28,
                padding: 18,
                shadowColor: '#000000',
                shadowOpacity: 0.05,
                shadowOffset: { width: 0, height: 3 },
                shadowRadius: 8,
                elevation: 2,
              }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  backgroundColor: opcion.color,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name={opcion.icono} size={22} color={opcion.colorIcono} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#1A1C1A' }}>{opcion.titulo}</Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: COLOR_MUTED, marginTop: 2 }}>
                  {opcion.descripcion}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLOR_MUTED} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
