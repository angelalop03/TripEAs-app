// Splash screen — punto de entrada cuando no hay sesión activa.
// Medidas replicadas 1:1 del diseño de Figma (frame de referencia 393x852)
// y escaladas proporcionalmente al ancho real del dispositivo.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { Logo } from '@/components/Logo';
import { Colors } from '@/constants/Colors';

const FRAME_WIDTH = 393;

export default function SplashScreen() {
  const { width } = useWindowDimensions();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const sombraBoton = {
    shadowColor: Colors.turquesa,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: e(9.36) },
    shadowRadius: e(14.04),
    elevation: 6,
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <View style={{ position: 'absolute', top: e(45), left: 0, right: 0, alignItems: 'center' }}>
        <Logo
          size={e(59.33)}
          fontFamily="Poppins_700Bold"
          style={{
            lineHeight: e(89),
            textShadowColor: 'rgba(0,0,0,0.25)',
            textShadowOffset: { width: 0, height: e(5.93) },
            textShadowRadius: e(5.93),
          }}
        />
      </View>

      <Text
        style={{
          position: 'absolute',
          top: e(145),
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'Poppins_500Medium',
          fontSize: e(14),
          lineHeight: e(21),
          color: Colors.azulProfundo,
          textShadowColor: 'rgba(0,0,0,0.25)',
          textShadowOffset: { width: 0, height: e(4) },
          textShadowRadius: e(4),
        }}>
        VIAJA, ORGANIZA, COMPARTE, DISFRUTA
      </Text>

      <Image
        source={require('@/assets/images/capibara.png')}
        resizeMode="contain"
        style={{
          position: 'absolute',
          left: e(8),
          top: e(199),
          width: e(377),
          height: e(550),
        }}
      />

      <Pressable
        style={[
          {
            position: 'absolute',
            left: e(134),
            top: e(569),
            width: e(125.39),
            height: e(52.4),
            borderRadius: 999,
            backgroundColor: Colors.turquesa,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: e(7.49),
          },
          sombraBoton,
        ]}
        onPress={() => router.push('/login')}>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: e(14.97),
            lineHeight: e(22),
            color: Colors.blancoHueso,
          }}>
          Login
        </Text>
        <Ionicons name="arrow-forward" size={e(14.97)} color={Colors.blancoHueso} />
      </Pressable>

      <Pressable
        style={[
          {
            position: 'absolute',
            left: e(134),
            top: e(633),
            width: e(125.39),
            height: e(52.4),
            borderRadius: 999,
            backgroundColor: Colors.blancoHueso,
            borderWidth: e(0.94),
            borderColor: Colors.turquesa,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: e(7.49),
          },
          sombraBoton,
        ]}
        onPress={() => router.push('/signup')}>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold',
            fontSize: e(14.97),
            lineHeight: e(22),
            color: Colors.turquesa,
          }}>
          Sing Up
        </Text>
        <Ionicons name="arrow-forward" size={e(14.97)} color={Colors.turquesa} />
      </Pressable>
    </View>
  );
}
