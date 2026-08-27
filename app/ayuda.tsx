// Ayuda / Acerca de — mensaje personal de Angela presentando TripEAs como su
// TFM, con un resumen de lo que se puede hacer en la app. Se accede desde el
// sidebar de Mis Viajes (SidebarMenu).
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Colors } from '@/constants/Colors';

const FRAME_WIDTH = 393;
const COLOR_LABEL = '#216489';
const COLOR_SUBTITULO = '#3B4A43';
const COLOR_MUTED = '#6B7B72';

const FUNCIONES = [
  { icono: 'cash-outline' as const, titulo: 'Tricount', texto: 'Reparte los gastos del viaje y ve quién le debe a quién.' },
  { icono: 'calendar-outline' as const, titulo: 'Calendario', texto: 'Organiza las actividades día a día con todo el grupo.' },
  { icono: 'pie-chart-outline' as const, titulo: 'Choose', texto: 'Deja que la ruleta decida cuando nadie se pone de acuerdo.' },
  { icono: 'checkbox-outline' as const, titulo: 'Listas', texto: 'Listas de tareas y de la compra compartidas, sin duplicar esfuerzos.' },
  { icono: 'images-outline' as const, titulo: 'Álbum', texto: 'Guarda las fotos y vídeos del viaje en un solo sitio.' },
  { icono: 'document-text-outline' as const, titulo: 'Documentos', texto: 'Billetes, reservas y seguros siempre a mano.' },
];

export default function AyudaScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: e(40) }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8), paddingTop: insets.top + e(8), paddingHorizontal: e(9) }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={e(22)} color={Colors.turquesa} />
          </Pressable>
          <Logo size={e(20)} />
        </View>

        <View style={{ paddingHorizontal: e(24), paddingTop: e(20), gap: e(24) }}>
          {/* Mensaje personal */}
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: e(32),
              padding: e(28),
              gap: e(16),
              shadowColor: '#000000',
              shadowOpacity: 0.06,
              shadowOffset: { width: 0, height: 3 },
              shadowRadius: 10,
              elevation: 2,
            }}>
            <View
              style={{
                width: e(140),
                height: e(140),
                borderRadius: 999,
                backgroundColor: 'rgba(255, 241, 118, 0.35)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Image source={require('@/assets/images/profile/Informatica.png')} resizeMode="contain" style={{ width: e(120), height: e(120) }} />
            </View>

            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: Colors.azulProfundo, textAlign: 'center' }}>
              ¡Hola! Soy Angela
            </Text>

            <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: COLOR_SUBTITULO, textAlign: 'center', lineHeight: e(21) }}>
              TripEAs es mi Trabajo de Fin de Máster. La he creado para que organizar un viaje en grupo no dependa de mil
              chats y hojas de cálculo sueltas: un solo sitio donde tu grupo puede planear, repartir gastos y guardar los
              recuerdos del viaje.
            </Text>
          </View>

          {/* Qué puedes hacer */}
          <View style={{ gap: e(16) }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: e(12),
                letterSpacing: e(1.2),
                textTransform: 'uppercase',
                color: COLOR_LABEL,
                paddingHorizontal: e(4),
              }}>
              Qué puedes hacer en TripEAs
            </Text>

            <View style={{ gap: e(12) }}>
              {FUNCIONES.map((funcion) => (
                <View
                  key={funcion.titulo}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: e(16),
                    backgroundColor: '#FFFFFF',
                    borderRadius: e(24),
                    padding: e(16),
                    shadowColor: '#000000',
                    shadowOpacity: 0.04,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    elevation: 1,
                  }}>
                  <View
                    style={{
                      width: e(44),
                      height: e(44),
                      borderRadius: 999,
                      backgroundColor: Colors.celesteAgua,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name={funcion.icono} size={e(20)} color={Colors.azulProfundo} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(15), color: '#1A1C1A' }}>{funcion.titulo}</Text>
                    <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: COLOR_MUTED, marginTop: e(2) }}>
                      {funcion.texto}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Despedida */}
          <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontStyle: 'italic', fontSize: e(13), color: COLOR_MUTED, textAlign: 'center' }}>
            Gracias por probar TripEAs. Espero que te ayude a organizar tu próxima aventura.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
