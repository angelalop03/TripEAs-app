// Ajustes de perfil — cambiar foto y nombre de usuario. Se accede desde el
// sidebar de Mis Viajes (SidebarMenu). El email no es editable aquí: cambiarlo
// implicaría un flujo de reverificación de Supabase Auth que no existe todavía.
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { SelectorAvatarModal } from '@/components/SelectorAvatarModal';
import { fetchConToken } from '@/constants/Api';
import { archivoDesdeUri } from '@/constants/Archivos';
import type { AvatarPerfil } from '@/constants/AvataresPerfil';
import { Colors } from '@/constants/Colors';
import { SOMBRA_BOTON_TURQUESA, SOMBRA_TARJETA } from '@/constants/Estilos';
import { useAuth } from '@/hooks/useAuth';

const FRAME_WIDTH = 393;
const COLOR_LABEL = '#216489';
const COLOR_MUTED = '#6B7B72';

interface Perfil {
  id_usuario: string;
  nombre: string;
  email: string;
  url_foto_perfil: string | null;
}

export default function AjustesPerfilScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { actualizarUsuario } = useAuth();
  const e = (valor: number) => (valor / FRAME_WIDTH) * width;

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nombreEdit, setNombreEdit] = useState('');
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [modalAvatares, setModalAvatares] = useState(false);
  const [modalOpcionesFoto, setModalOpcionesFoto] = useState(false);

  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [mostrarPasswords, setMostrarPasswords] = useState(false);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState('');

  const cargar = useCallback(async () => {
    try {
      const respuesta = await fetchConToken('/usuarios/perfil');
      const datos = await respuesta.json();
      if (respuesta.ok) {
        setPerfil(datos.usuario);
        setNombreEdit(datos.usuario.nombre);
      }
    } catch {
      // Sin conexión: se queda con lo último cargado.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const elegirFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para elegir un avatar.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      setFotoLocal(resultado.assets[0].uri);
    }
  };

  const seleccionarAvatar = async (avatar: AvatarPerfil) => {
    setModalAvatares(false);
    try {
      const asset = Asset.fromModule(avatar.fuente);
      await asset.downloadAsync();
      setFotoLocal(asset.localUri ?? asset.uri);
    } catch {
      Alert.alert('No se pudo cargar el avatar', 'Inténtalo de nuevo.');
    }
  };

  // Antes usaba Alert.alert con 3 botones para elegir "avatar" vs "galería",
  // pero los Alert de varios botones tienen soporte muy limitado en web (a
  // veces no aparece nada). Un Modal propio funciona igual en todas partes.
  const abrirSelectorFoto = () => setModalOpcionesFoto(true);

  const hayCambios = !!fotoLocal || (perfil !== null && nombreEdit.trim() !== perfil.nombre && nombreEdit.trim().length > 0);

  const guardar = async () => {
    if (!perfil) return;
    if (nombreEdit.trim().length === 0) {
      setError('El nombre no puede estar vacío');
      return;
    }

    setError('');
    setGuardando(true);
    try {
      let urlFotoSubida: string | undefined;

      if (fotoLocal) {
        const formData = new FormData();
        const archivo = await archivoDesdeUri(fotoLocal, 'avatar.jpg', 'image/jpeg');
        formData.append('archivo', archivo, 'avatar.jpg');

        const respFoto = await fetchConToken('/usuarios/subir-foto-perfil', {
          method: 'POST',
          body: formData,
        });
        const datosFoto = await respFoto.json();
        if (!respFoto.ok) {
          setError(datosFoto?.error || 'No se pudo subir la foto de perfil');
          return;
        }
        urlFotoSubida = datosFoto.url_foto_perfil;
      }

      const respuesta = await fetchConToken('/usuarios/perfil', {
        method: 'PUT',
        body: JSON.stringify({
          nombre: nombreEdit.trim(),
          ...(urlFotoSubida ? { url_foto_perfil: urlFotoSubida } : {}),
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setError(datos?.error || 'No se pudieron guardar los cambios');
        return;
      }

      setPerfil(datos.usuario);
      setFotoLocal(null);
      await actualizarUsuario({ nombre: datos.usuario.nombre, url_foto_perfil: datos.usuario.url_foto_perfil });
      Alert.alert('Perfil actualizado', 'Tus cambios se han guardado correctamente.');
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async () => {
    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
      setErrorPassword('Rellena los tres campos');
      return;
    }
    if (passwordNueva.length < 8) {
      setErrorPassword('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (passwordNueva !== passwordConfirmar) {
      setErrorPassword('Las dos contraseñas nuevas no coinciden');
      return;
    }

    setErrorPassword('');
    setCambiandoPassword(true);
    try {
      const respuesta = await fetchConToken('/auth/cambiar-password', {
        method: 'PUT',
        body: JSON.stringify({ password_actual: passwordActual, password_nueva: passwordNueva }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setErrorPassword(datos?.error || 'No se pudo cambiar la contraseña');
        return;
      }
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirmar('');
      Alert.alert('Contraseña actualizada', 'Tu contraseña se ha cambiado correctamente.');
    } catch {
      setErrorPassword('No se pudo conectar con el servidor');
    } finally {
      setCambiandoPassword(false);
    }
  };

  const iniciales = (perfil?.nombre ?? 'U').trim().charAt(0).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.amarilloFigma }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: e(40) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8), paddingTop: insets.top + e(8), paddingHorizontal: e(9) }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={e(22)} color={Colors.turquesa} />
          </Pressable>
          <Logo size={e(20)} />
        </View>

        {isLoading || !perfil ? (
          <View style={{ paddingVertical: e(80), alignItems: 'center' }}>
            <ActivityIndicator color={Colors.turquesa} size="large" />
          </View>
        ) : (
          <View style={{ paddingHorizontal: e(24), paddingTop: e(8), gap: e(24) }}>
            {/* Título */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(14) }}>
              <View
                style={{
                  width: e(48),
                  height: e(48),
                  borderRadius: e(16),
                  backgroundColor: Colors.turquesa,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...SOMBRA_BOTON_TURQUESA,
                }}>
                <Ionicons name="person" size={e(22)} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), letterSpacing: e(-0.4), color: '#1A1C1A' }}>
                  Ajustes de perfil
                </Text>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: COLOR_MUTED, marginTop: e(2) }}>
                  Tu foto y tu nombre visible para el resto del grupo
                </Text>
              </View>
            </View>

            {/* Foto de perfil */}
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: e(28),
                paddingVertical: e(28),
                ...SOMBRA_TARJETA,
              }}>
              <Pressable onPress={abrirSelectorFoto} style={{ position: 'relative' }}>
                {fotoLocal || perfil.url_foto_perfil ? (
                  <Image
                    source={{ uri: fotoLocal ?? perfil.url_foto_perfil ?? undefined }}
                    style={{ width: e(112), height: e(112), borderRadius: 999, borderWidth: e(3), borderColor: Colors.celesteAgua }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: e(112),
                      height: e(112),
                      borderRadius: 999,
                      backgroundColor: Colors.celesteAgua,
                      borderWidth: e(3),
                      borderColor: '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(38), color: Colors.azulProfundo }}>{iniciales}</Text>
                  </View>
                )}
                <View
                  style={{
                    position: 'absolute',
                    right: -e(2),
                    bottom: -e(2),
                    width: e(36),
                    height: e(36),
                    borderRadius: 999,
                    backgroundColor: Colors.turquesa,
                    borderWidth: e(3),
                    borderColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000000',
                    shadowOpacity: 0.15,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 4,
                    elevation: 3,
                  }}>
                  <Ionicons name="camera" size={e(16)} color="#FFFFFF" />
                </View>
              </Pressable>

              <Pressable
                onPress={abrirSelectorFoto}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: e(6),
                  marginTop: e(16),
                  backgroundColor: Colors.celesteAgua,
                  borderRadius: 999,
                  paddingHorizontal: e(16),
                  paddingVertical: e(8),
                }}>
                <Ionicons name="image-outline" size={e(14)} color="#216489" />
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(13), color: '#216489' }}>Cambiar foto</Text>
              </Pressable>
            </View>

            {/* Información personal */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: e(28), padding: e(20), gap: e(18), ...SOMBRA_TARJETA }}>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: e(11),
                  letterSpacing: e(1),
                  color: COLOR_LABEL,
                  textTransform: 'uppercase',
                }}>
                Información personal
              </Text>

              {/* Nombre */}
              <View style={{ gap: e(8) }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.4), color: '#1A1C1A' }}>
                  Nombre de usuario
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: e(12),
                    backgroundColor: Colors.celesteAgua,
                    borderWidth: 1,
                    borderColor: '#D4EFF2',
                    borderRadius: e(20),
                    paddingHorizontal: e(16),
                    paddingVertical: e(14),
                  }}>
                  <Ionicons name="person-outline" size={e(16)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                  <TextInput
                    style={{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(15), color: Colors.azulProfundo }}
                    value={nombreEdit}
                    onChangeText={setNombreEdit}
                    placeholder="Tu nombre"
                    placeholderTextColor={COLOR_MUTED}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Email (solo lectura) */}
              <View style={{ gap: e(8) }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.4), color: '#1A1C1A' }}>
                  Email
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: e(12),
                    backgroundColor: '#F4F3F1',
                    borderRadius: e(20),
                    paddingHorizontal: e(16),
                    paddingVertical: e(14),
                  }}>
                  <Ionicons name="mail-outline" size={e(16)} color={COLOR_MUTED} />
                  <Text style={{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(15), color: COLOR_MUTED }} numberOfLines={1}>
                    {perfil.email}
                  </Text>
                  <Ionicons name="lock-closed-outline" size={e(13)} color={COLOR_MUTED} style={{ opacity: 0.7 }} />
                </View>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(11), color: COLOR_MUTED }}>
                  El email no se puede cambiar desde aquí.
                </Text>
              </View>
            </View>

            {/* Cambiar contraseña */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: e(28), padding: e(20), gap: e(16), ...SOMBRA_TARJETA }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: e(11),
                    letterSpacing: e(1),
                    color: COLOR_LABEL,
                    textTransform: 'uppercase',
                  }}>
                  Cambiar contraseña
                </Text>
                <Pressable onPress={() => setMostrarPasswords((v) => !v)} hitSlop={8}>
                  <Ionicons name={mostrarPasswords ? 'eye-off-outline' : 'eye-outline'} size={e(16)} color={COLOR_MUTED} />
                </Pressable>
              </View>

              {[
                { valor: passwordActual, set: setPasswordActual, etiqueta: 'Contraseña actual', placeholder: 'Tu contraseña actual' },
                { valor: passwordNueva, set: setPasswordNueva, etiqueta: 'Nueva contraseña', placeholder: 'Mínimo 8 caracteres' },
                { valor: passwordConfirmar, set: setPasswordConfirmar, etiqueta: 'Repite la nueva contraseña', placeholder: 'Repite la nueva contraseña' },
              ].map((campo) => (
                <View key={campo.etiqueta} style={{ gap: e(8) }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.4), color: '#1A1C1A' }}>
                    {campo.etiqueta}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: e(12),
                      backgroundColor: Colors.celesteAgua,
                      borderWidth: 1,
                      borderColor: '#D4EFF2',
                      borderRadius: e(20),
                      paddingHorizontal: e(16),
                      paddingVertical: e(14),
                    }}>
                    <Ionicons name="lock-closed-outline" size={e(16)} color={COLOR_LABEL} style={{ opacity: 0.7 }} />
                    <TextInput
                      style={{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(15), color: Colors.azulProfundo }}
                      value={campo.valor}
                      onChangeText={campo.set}
                      placeholder={campo.placeholder}
                      placeholderTextColor={COLOR_MUTED}
                      secureTextEntry={!mostrarPasswords}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              ))}

              {errorPassword ? (
                <Text style={{ color: Colors.rojoSuave, fontSize: e(13) }}>{errorPassword}</Text>
              ) : null}

              <Pressable
                onPress={cambiarPassword}
                disabled={cambiandoPassword}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: e(8),
                  height: e(50),
                  borderRadius: 999,
                  backgroundColor: Colors.turquesa,
                  opacity: cambiandoPassword ? 0.7 : 1,
                }}>
                {cambiandoPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="key-outline" size={e(16)} color="#FFFFFF" />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(14), color: '#FFFFFF' }}>Cambiar contraseña</Text>
                  </>
                )}
              </Pressable>
            </View>

            {error ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: e(8),
                  backgroundColor: 'rgba(255,138,128,0.12)',
                  borderRadius: e(16),
                  paddingHorizontal: e(14),
                  paddingVertical: e(10),
                }}>
                <Ionicons name="alert-circle-outline" size={e(16)} color={Colors.rojoSuave} />
                <Text style={{ flex: 1, color: Colors.rojoSuave, fontSize: e(13) }}>{error}</Text>
              </View>
            ) : null}

            {hayCambios && !error ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(8), alignSelf: 'center' }}>
                <View style={{ width: e(6), height: e(6), borderRadius: 999, backgroundColor: '#8A6D00' }} />
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), color: '#8A6D00' }}>
                  Tienes cambios sin guardar
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={guardar}
              disabled={!hayCambios || guardando}
              style={{
                width: '100%',
                height: e(56),
                borderRadius: 999,
                backgroundColor: Colors.turquesa,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: e(8),
                opacity: !hayCambios || guardando ? 0.5 : 1,
                ...SOMBRA_BOTON_TURQUESA,
              }}>
              {guardando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={e(18)} color="#FFFFFF" />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: '#FFFFFF' }}>Guardar cambios</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>

      <SelectorAvatarModal visible={modalAvatares} onClose={() => setModalAvatares(false)} onSeleccionar={seleccionarAvatar} />

      <Modal visible={modalOpcionesFoto} transparent animationType="fade" onRequestClose={() => setModalOpcionesFoto(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          onPress={() => setModalOpcionesFoto(false)}>
          <Pressable
            onPress={(evento) => evento.stopPropagation()}
            style={{ width: '100%', maxWidth: 320, backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 8 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: Colors.azulProfundo, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
              Foto de perfil
            </Text>
            <Pressable
              onPress={() => {
                setModalOpcionesFoto(false);
                setModalAvatares(true);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 }}>
              <Ionicons name="happy-outline" size={20} color={Colors.turquesa} />
              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: '#1A1C1A' }}>Elegir avatar</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setModalOpcionesFoto(false);
                elegirFoto();
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 }}>
              <Ionicons name="images-outline" size={20} color={Colors.turquesa} />
              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: '#1A1C1A' }}>Subir desde galería</Text>
            </Pressable>
            <Pressable
              onPress={() => setModalOpcionesFoto(false)}
              style={{ paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0', marginTop: 4 }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: COLOR_MUTED, textAlign: 'center' }}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
