// Splash screen — punto de entrada cuando no hay sesión activa.
// Medidas replicadas 1:1 del diseño de Figma (frame de referencia 393x852)
// y escaladas proporcionalmente al ancho real del dispositivo.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { Colors } from '@/constants/Colors';

const FRAME_WIDTH = 393;
// RCTAnimation no existe en web (React Native Web), así que el native driver
// solo se usa en iOS/Android; en web cae a JS sin avisar.
const useNativeDriver = Platform.OS !== 'web';

// Coreografía del logo: aparece solo "EA" centrado en la pantalla, y tras
// una pausa se "escribe" el prefijo "Trip" (letra a letra) y luego la "s"
// final, hasta completar "TripEAs" — todo mientras sigue centrado. Una vez
// escrito, el logo entero sube con un movimiento suave hasta su posición
// final arriba. Todo lo demás (eslogan, capibara, botones) espera a que
// termine de subir antes de entrar.
const PREFIJO = 'Trip';
const SUFIJO = 's';
const T_EA_IN = 550; // tiempo aprox. hasta que el rebote de "EA" se asienta
const T_EA_HOLD = 200; // pausa mostrando solo "EA" antes de escribir
const T_TYPE_INTERVAL = 80; // ms entre letra y letra
const T_PREFIJO_SUFIJO_PAUSA = 120; // pausa entre "Trip" y la "s" final
const T_SUBIDA_ESPERA = 150; // pausa tras completar "TripEAs" antes de subir
const T_SUBIDA = 700; // duración de la subida a la posición final

const PREFIJO_START = T_EA_IN + T_EA_HOLD;
const PREFIJO_END = PREFIJO_START + PREFIJO.length * T_TYPE_INTERVAL;
const SUFIJO_START = PREFIJO_END + T_PREFIJO_SUFIJO_PAUSA;
const SUFIJO_END = SUFIJO_START + SUFIJO.length * T_TYPE_INTERVAL;
const SUBIDA_START = SUFIJO_END + T_SUBIDA_ESPERA;
const SUBIDA_END = SUBIDA_START + T_SUBIDA;

// Curva "ease-out" muy suave (tipo easeOutExpo), para que la subida del
// logo decelere de forma fluida en vez de frenar en seco.
const EASE_FLUIDO = Easing.bezier(0.16, 1, 0.3, 1);

// Escribe `palabra` letra a letra empezando en `delayInicial` ms, una letra
// cada `intervalo` ms.
function useMaquinaDeEscribir(palabra: string, delayInicial: number, intervalo: number) {
  const [escrito, setEscrito] = useState('');

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= palabra.length; i++) {
      timeouts.push(setTimeout(() => setEscrito(palabra.slice(0, i)), delayInicial + intervalo * (i - 1)));
    }
    return () => timeouts.forEach(clearTimeout);
  }, [palabra, delayInicial, intervalo]);

  return escrito;
}

export default function SplashScreen() {
  const { width, height } = useWindowDimensions();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const prefijoEscrito = useMaquinaDeEscribir(PREFIJO, PREFIJO_START, T_TYPE_INTERVAL);
  const sufijoEscrito = useMaquinaDeEscribir(SUFIJO, SUFIJO_START, T_TYPE_INTERVAL);

  // El logo vive siempre en top: e(45) (su posición final), pero arranca
  // desplazado hacia abajo con un translateY para quedar centrado vertical
  // en la pantalla; ese desplazamiento se anima a 0 en la "subida".
  const LOGO_TOP_FINAL = e(45);
  const LOGO_ALTO = e(89);
  const centroOffsetY = (height - LOGO_ALTO) / 2 - LOGO_TOP_FINAL;

  const sombraBoton = {
    shadowColor: Colors.turquesa,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: e(9.36) },
    shadowRadius: e(14.04),
    elevation: 6,
  };

  // Animación de entrada: el "EA" inicial aparece centrado en la pantalla;
  // al terminar de escribirse "TripEAs" completo, el logo sube con un
  // movimiento suave hasta su sitio; el eslogan, la capibara y los botones
  // entran después, escalonados, para dar sensación de bienvenida progresiva.
  const logoOpacidadAnim = useRef(new Animated.Value(0)).current;
  const logoEscalaAnim = useRef(new Animated.Value(0)).current;
  const logoSubidaAnim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const capibaraAnim = useRef(new Animated.Value(0)).current;
  const botonesAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animar = (valor: Animated.Value, delay: number, duration = 600, easing = Easing.out(Easing.cubic)) =>
      Animated.timing(valor, {
        toValue: 1,
        duration,
        delay,
        easing,
        useNativeDriver,
      });

    Animated.parallel([
      animar(logoOpacidadAnim, 0, 150),
      // Rebote: el "EA" aparece agrandándose y overshootea un poco antes de
      // asentarse en su tamaño final — mucho más vivo que un simple fundido.
      Animated.spring(logoEscalaAnim, {
        toValue: 1,
        delay: 0,
        bounciness: 14,
        speed: 9,
        useNativeDriver,
      }),
      animar(logoSubidaAnim, SUBIDA_START, T_SUBIDA, EASE_FLUIDO),
      animar(taglineAnim, SUBIDA_START + 250, 650, EASE_FLUIDO),
      animar(capibaraAnim, SUBIDA_START + 350, 750, EASE_FLUIDO),
      animar(botonesAnim, SUBIDA_START + 600, 650, EASE_FLUIDO),
    ]).start();
  }, [logoOpacidadAnim, logoEscalaAnim, logoSubidaAnim, taglineAnim, capibaraAnim, botonesAnim]);

  const entradaDesdeArriba = (anim: Animated.Value, distancia = 24) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-e(distancia), 0] }) }],
  });

  const entradaDesdeAbajo = (anim: Animated.Value, distancia = 40) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [e(distancia), 0] }) }],
  });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <Animated.View
        style={[
          { position: 'absolute', top: LOGO_TOP_FINAL, left: 0, right: 0, alignItems: 'center' },
          {
            opacity: logoOpacidadAnim,
            transform: [
              {
                translateY: logoSubidaAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [centroOffsetY, 0],
                }),
              },
              {
                // `logoEscalaAnim` es un spring: pasa de 0 a 1 sobrepasando
                // ligeramente el valor final antes de asentarse, así que al
                // mapearlo a [0.4, 1] el rebote también sobrepasa el 1 y
                // luego se asienta ahí — efecto de "aparece agrandándose".
                scale: logoEscalaAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              },
            ],
          },
        ]}>
        <Text
          style={{
            fontSize: e(59.33),
            fontWeight: 'bold',
            fontFamily: 'Poppins_700Bold',
            lineHeight: e(89),
            textShadowColor: 'rgba(0,0,0,0.25)',
            textShadowOffset: { width: 0, height: e(5.93) },
            textShadowRadius: e(5.93),
          }}>
          <Text style={{ color: Colors.turquesa }}>{prefijoEscrito}</Text>
          <Text style={{ color: Colors.azulProfundo }}>
            EA
            {sufijoEscrito}
          </Text>
        </Text>
      </Animated.View>

      <Animated.Text
        style={[
          {
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
          },
          entradaDesdeArriba(taglineAnim),
        ]}>
        VIAJA, ORGANIZA, COMPARTE, DISFRUTA
      </Animated.Text>

      <Animated.Image
        source={require('@/assets/images/capibara.png')}
        resizeMode="contain"
        style={[
          {
            position: 'absolute',
            left: e(8),
            top: e(199),
            width: e(377),
            height: e(550),
          },
          entradaDesdeAbajo(capibaraAnim, 60),
        ]}
      />

      <Animated.View
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
          entradaDesdeAbajo(botonesAnim, 30),
        ]}>
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
      </Animated.View>
    </View>
  );
}
