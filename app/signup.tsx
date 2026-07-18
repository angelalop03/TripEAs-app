// Pantalla de registro — valida localmente y llama a POST /api/auth/registro.
// Si el backend devuelve token, inicia sesión directamente; si no, manda a login.
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Logo } from '@/components/Logo';
import { API_URL } from '@/constants/Api';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
  const { login } = useAuth();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validar = () => {
    if (nombre.trim().length === 0) return 'Introduce tu nombre';
    if (!EMAIL_REGEX.test(email.trim())) return 'Introduce un email válido';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (password !== confirmarPassword) return 'Las contraseñas no coinciden';
    return '';
  };

  const handleSignup = async () => {
    const errorValidacion = validar();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const respuesta = await fetch(`${API_URL}/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), password }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos?.mensaje || datos?.error || 'No se pudo crear la cuenta');
        return;
      }

      const token = datos.access_token ?? datos.token;
      const usuario = datos.usuario ?? datos.user;

      if (token && usuario) {
        await login(token, usuario);
      } else {
        router.replace('/login');
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const social = (nombreProveedor: string) =>
    Alert.alert('Próximamente', `Registro con ${nombreProveedor} aún no está disponible`);

  return (
    <View style={styles.container}>
      <Logo size={30} />
      <Text style={styles.tagline}>VIAJA, ORGANIZA, COMPARTE, DISFRUTA</Text>

      <Image
        source={require('@/assets/images/capibara.png')}
        style={styles.capibara}
        resizeMode="contain"
      />

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Create your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor={Colors.azulProfundo}
          value={nombre}
          onChangeText={setNombre}
          textAlign="center"
        />
        <TextInput
          style={styles.input}
          placeholder="example@gmail.com"
          placeholderTextColor={Colors.azulProfundo}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textAlign="center"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.azulProfundo}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="center"
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm your password"
          placeholderTextColor={Colors.azulProfundo}
          value={confirmarPassword}
          onChangeText={setConfirmarPassword}
          secureTextEntry
          textAlign="center"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.filaLink}>
          <Text style={styles.textoMuted}>Already have an account? </Text>
          <Link href="/login">
            <Text style={styles.textoLink}>Log in</Text>
          </Link>
        </View>

        <Pressable
          style={[styles.botonPrimario, isLoading && styles.botonDeshabilitado]}
          onPress={handleSignup}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={Colors.blancoHueso} />
          ) : (
            <Text style={styles.textoBotonPrimario}>Sign Up</Text>
          )}
        </Pressable>

        <Text style={styles.textoContinuar}>Or continue with</Text>

        <View style={styles.filaSocial}>
          <Pressable style={styles.botonSocial} onPress={() => social('Google')}>
            <Ionicons name="logo-google" size={18} color={Colors.azulProfundo} />
          </Pressable>
          <Pressable style={styles.botonSocial} onPress={() => social('Apple')}>
            <Ionicons name="logo-apple" size={18} color={Colors.azulProfundo} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.amarillo,
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 24,
  },
  tagline: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: Colors.azulProfundo,
    textAlign: 'center',
  },
  capibara: {
    width: 90,
    height: 90,
    marginTop: 14,
    marginBottom: -18,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.blancoHueso,
    borderRadius: 28,
    padding: 22,
    elevation: 3,
  },
  cardTitulo: {
    color: Colors.azulProfundo,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
  },
  input: {
    backgroundColor: Colors.celesteAgua,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(14, 153, 176, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    color: Colors.azulProfundo,
    fontSize: 14,
  },
  error: {
    color: Colors.rojoSuave,
    marginBottom: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  filaLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  textoMuted: {
    color: Colors.azulProfundo,
    fontSize: 11,
    opacity: 0.75,
  },
  textoLink: {
    color: Colors.turquesa,
    fontSize: 11,
    fontWeight: '700',
  },
  botonPrimario: {
    backgroundColor: Colors.turquesa,
    borderRadius: 25,
    paddingVertical: 11,
    paddingHorizontal: 44,
    alignSelf: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.7,
  },
  textoBotonPrimario: {
    color: Colors.blancoHueso,
    fontSize: 14,
    fontWeight: '600',
  },
  textoContinuar: {
    textAlign: 'center',
    color: Colors.azulProfundo,
    opacity: 0.6,
    fontSize: 11,
    marginTop: 16,
    marginBottom: 10,
  },
  filaSocial: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  botonSocial: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Colors.celesteAgua,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
