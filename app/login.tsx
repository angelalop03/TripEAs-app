// Pantalla de login — medidas replicadas 1:1 del diseño de Figma (frame de
// referencia 393x923, escaladas al ancho real del dispositivo), validación
// local y llamada a POST /api/auth/login. En éxito guarda la sesión (el
// guard de app/_layout.tsx se encarga de navegar a (tabs)).
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { Logo } from '@/components/Logo';
import { API_URL } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';

const FRAME_WIDTH = 393;
const FRAME_HEIGHT = 923;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validar = () => {
    if (!EMAIL_REGEX.test(email.trim())) return 'Introduce un email válido';
    if (password.length === 0) return 'Introduce tu contraseña';
    return '';
  };

  const handleLogin = async () => {
    const errorValidacion = validar();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const respuesta = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos?.mensaje || datos?.error || 'No se pudo iniciar sesión');
        return;
      }

      await login(datos.access_token ?? datos.token, datos.usuario ?? datos.user);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const social = (nombre: string) => Alert.alert('Próximamente', `Login con ${nombre} aún no está disponible`);

  const azulSuave = (alpha: number) => `rgba(0, 83, 119, ${alpha})`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}
      contentContainerStyle={{ minHeight: e(FRAME_HEIGHT) }}
      keyboardShouldPersistTaps="handled">
      <View style={{ position: 'absolute', top: e(30), left: 0, right: 0, alignItems: 'center' }}>
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
          top: e(130),
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
          left: e(75),
          top: e(161),
          width: e(245),
          height: e(225),
        }}
      />

      <View style={{ position: 'absolute', left: e(27), top: e(386), width: e(342), alignItems: 'center', gap: e(7) }}>
        <View
          style={{
            width: '100%',
            backgroundColor: Colors.celesteAgua,
            borderRadius: e(32),
            padding: e(32),
            gap: e(16),
            shadowColor: Colors.azulProfundo,
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: e(4) },
            shadowRadius: e(20),
            elevation: 3,
          }}>
          {/* Email */}
          <View style={{ gap: e(8) }}>
            <Text
              style={{
                paddingLeft: e(8),
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: e(12),
                letterSpacing: e(0.6),
                textTransform: 'uppercase',
                color: Colors.azulProfundo,
              }}>
              Email address
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: 'rgba(223, 247, 249, 0.2)',
                borderRadius: e(32),
                paddingHorizontal: e(16),
                paddingVertical: e(12),
              }}>
              <Ionicons name="mail-outline" size={e(18)} color={azulSuave(0.5)} style={{ marginRight: e(12) }} />
              <TextInput
                style={{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(16), color: Colors.azulProfundo }}
                placeholder="hello@tripea.com"
                placeholderTextColor={azulSuave(0.3)}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Password */}
          <View style={{ gap: e(8) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: e(8) }}>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: e(12),
                  letterSpacing: e(0.6),
                  textTransform: 'uppercase',
                  color: Colors.azulProfundo,
                }}>
                Password
              </Text>
              <Pressable onPress={() => Alert.alert('Próximamente', 'La recuperación de contraseña aún no está disponible')}>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: Colors.turquesa }}>
                  Forgot?
                </Text>
              </Pressable>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: 'rgba(223, 247, 249, 0.2)',
                borderRadius: e(32),
                paddingHorizontal: e(16),
                paddingVertical: e(12),
              }}>
              <Ionicons name="lock-closed-outline" size={e(18)} color={azulSuave(0.5)} style={{ marginRight: e(12) }} />
              <TextInput
                style={{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(16), color: Colors.azulProfundo }}
                placeholder="••••••••"
                placeholderTextColor={azulSuave(0.3)}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
              />
              <Pressable onPress={() => setPasswordVisible((v) => !v)}>
                <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={e(18)} color={azulSuave(0.5)} />
              </Pressable>
            </View>
          </View>

          {error ? (
            <Text style={{ color: Colors.rojoSuave, fontSize: e(12), textAlign: 'center', width: '100%' }}>{error}</Text>
          ) : null}

          {/* Botón login */}
          <Pressable
            style={{
              width: '100%',
              height: e(56),
              borderRadius: 999,
              backgroundColor: Colors.turquesa,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: e(8),
              opacity: isLoading ? 0.7 : 1,
              shadowColor: Colors.turquesa,
              shadowOpacity: 0.2,
              shadowOffset: { width: 0, height: e(10) },
              shadowRadius: e(15),
              elevation: 6,
            }}
            onPress={handleLogin}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(16), color: '#FFFFFF' }}>Login</Text>
                <Ionicons name="arrow-forward" size={e(16)} color="#FFFFFF" />
              </>
            )}
          </Pressable>

          {/* Divisor */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(16), width: '100%' }}>
            <View style={{ flex: 1, height: 1, backgroundColor: azulSuave(0.1) }} />
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: e(12),
                color: azulSuave(0.4),
                textTransform: 'uppercase',
              }}>
              Or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: azulSuave(0.1) }} />
          </View>

          {/* Sociales */}
          <View style={{ flexDirection: 'row', gap: e(16), width: '100%' }}>
            <Pressable
              style={{
                flex: 1,
                height: e(50),
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: e(8),
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: azulSuave(0.05),
                borderRadius: 999,
              }}
              onPress={() => social('Google')}>
              <Ionicons name="logo-google" size={e(16)} color={Colors.azulProfundo} />
              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.6), color: Colors.azulProfundo }}>
                Google
              </Text>
            </Pressable>

            <Pressable
              style={{
                flex: 1,
                height: e(50),
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: e(8),
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: azulSuave(0.05),
                borderRadius: 999,
              }}
              onPress={() => social('Apple')}>
              <Ionicons name="logo-apple" size={e(16)} color={Colors.azulProfundo} />
              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.6), color: Colors.azulProfundo }}>
                Apple
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: e(10) }}>
          <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: Colors.azulProfundo }}>
            Don&apos;t have an account?{' '}
          </Text>
          <Link href="/signup">
            <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: Colors.turquesa }}>Sign Up</Text>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
