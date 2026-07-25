// Pantalla de registro — medidas replicadas 1:1 del diseño de Figma (frame de
// referencia 393x852, escaladas al ancho real del dispositivo). Valida
// localmente y llama a POST /api/auth/registro; si el backend devuelve
// token, inicia sesión directamente, si no, manda a login.
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { Logo } from '@/components/Logo';
import { esErrorDeConexion, fetchApi, MENSAJE_ERROR_CONEXION, mensajeDeError } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { normalizarUsuario, useAuth } from '@/hooks/useAuth';

const FRAME_WIDTH = 393;
const FRAME_HEIGHT = 852;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COLOR_TITULO = '#145C80';
const COLOR_LABEL = '#216489';
const COLOR_PLACEHOLDER = 'rgba(107, 123, 114, 0.5)';
const COLOR_FOOTER = '#3B4A43';
const COLOR_BORDE_CARD = '#D4ECF0';

export default function SignupScreen() {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState('');
  const [errorDeConexion, setErrorDeConexion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validar = () => {
    if (nombre.trim().length === 0) return 'Introduce tu nombre';
    if (!EMAIL_REGEX.test(email.trim())) return 'Introduce un email válido';
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (password !== confirmarPassword) return 'Las contraseñas no coinciden';
    return '';
  };

  const handleSignup = async () => {
    const errorValidacion = validar();
    if (errorValidacion) {
      setErrorDeConexion(false);
      setError(errorValidacion);
      return;
    }

    setError('');
    setErrorDeConexion(false);
    setIsLoading(true);
    try {
      const respuesta = await fetchApi('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), password }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(mensajeDeError(respuesta.status, datos));
        return;
      }

      const token = datos.session?.access_token;

      if (token) {
        await login(token, normalizarUsuario(datos.usuario ?? {}));
      } else {
        // Supabase puede exigir confirmación por email antes de dar sesión.
        router.replace('/login');
      }
    } catch (err) {
      if (esErrorDeConexion(err)) {
        setErrorDeConexion(true);
        setError(MENSAJE_ERROR_CONEXION);
      } else {
        setError('Ha ocurrido un error. Inténtalo de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const campoEstilo = {
    width: '100%' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: e(24),
    paddingVertical: e(17),
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: e(16),
    color: Colors.azulProfundo,
  };

  const etiquetaEstilo = {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: e(12),
    letterSpacing: e(0.6),
    color: COLOR_LABEL,
  };

  const azulSuave = (alpha: number) => `rgba(0, 83, 119, ${alpha})`;

  const social = (nombreProveedor: string) =>
    Alert.alert('Próximamente', `Registro con ${nombreProveedor} aún no está disponible`);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}
      contentContainerStyle={{ minHeight: e(FRAME_HEIGHT) }}
      keyboardShouldPersistTaps="handled">
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

      <View style={{ position: 'absolute', left: e(24), top: e(199), width: e(342) }}>
        <View
          style={{
            width: '100%',
            backgroundColor: Colors.celesteAgua,
            borderWidth: 1,
            borderColor: COLOR_BORDE_CARD,
            borderRadius: e(32),
            padding: e(32),
            gap: e(16),
          }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: e(22),
              lineHeight: e(28),
              color: COLOR_TITULO,
            }}>
            Create Account
          </Text>

          <View style={{ width: '100%', gap: e(16) }}>
            <View style={{ width: '100%', gap: e(8) }}>
              <Text style={etiquetaEstilo}>FULL NAME</Text>
              <TextInput
                style={campoEstilo}
                placeholder="Enter your name"
                placeholderTextColor={COLOR_PLACEHOLDER}
                value={nombre}
                onChangeText={setNombre}
              />
            </View>

            <View style={{ width: '100%', gap: e(8) }}>
              <Text style={etiquetaEstilo}>EMAIL ADDRESS</Text>
              <TextInput
                style={campoEstilo}
                placeholder="you@example.com"
                placeholderTextColor={COLOR_PLACEHOLDER}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={{ width: '100%', gap: e(8) }}>
              <Text style={etiquetaEstilo}>PASSWORD</Text>
              <TextInput
                style={campoEstilo}
                placeholder="Min. 8 characters"
                placeholderTextColor={COLOR_PLACEHOLDER}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={{ width: '100%', gap: e(8) }}>
              <Text style={etiquetaEstilo}>CONFIRM PASSWORD</Text>
              <TextInput
                style={campoEstilo}
                placeholder="Repeat password"
                placeholderTextColor={COLOR_PLACEHOLDER}
                value={confirmarPassword}
                onChangeText={setConfirmarPassword}
                secureTextEntry
              />
            </View>

            {error ? (
              <Text style={{ color: Colors.rojoSuave, fontSize: e(12), textAlign: 'center', width: '100%' }}>{error}</Text>
            ) : null}

            {errorDeConexion ? (
              <Pressable
                style={{ alignSelf: 'center', paddingVertical: e(4), paddingHorizontal: e(12) }}
                onPress={handleSignup}>
                <Text style={{ color: Colors.turquesa, fontSize: e(13), fontWeight: '700' }}>Reintentar</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={{
                width: '100%',
                height: e(56),
                marginTop: e(16),
                borderRadius: 999,
                backgroundColor: Colors.turquesa,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: e(8),
                opacity: isLoading ? 0.7 : 1,
                shadowColor: '#000000',
                shadowOpacity: 0.05,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 2,
                elevation: 2,
              }}
              onPress={handleSignup}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color={Colors.blancoHueso} />
              ) : (
                <>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), lineHeight: e(28), color: Colors.blancoHueso }}>
                    Sign Up
                  </Text>
                  <Ionicons name="arrow-forward" size={e(13.33)} color={Colors.blancoHueso} />
                </>
              )}
            </Pressable>

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

          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'center', paddingTop: e(16) }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: COLOR_FOOTER }}>
              Already have an account?{' '}
            </Text>
            <Link href="/login">
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: Colors.turquesa }}>Log In</Text>
            </Link>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
