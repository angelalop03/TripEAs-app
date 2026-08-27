// Ajustes de perfil — cambiar foto y nombre de usuario. Se accede desde el
// sidebar de Mis Viajes (SidebarMenu). El email no es editable aquí: cambiarlo
// implicaría un flujo de reverificación de Supabase Auth que no existe todavía.
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { SelectorAvatarModal } from '@/components/SelectorAvatarModal';
import { fetchConToken } from '@/constants/Api';
import type { AvatarPerfil } from '@/constants/AvataresPerfil';
import { Colors } from '@/constants/Colors';
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

  const abrirSelectorFoto = () => {
    Alert.alert('Foto de perfil', undefined, [
      { text: 'Elegir avatar', onPress: () => setModalAvatares(true) },
      { text: 'Subir desde galería', onPress: elegirFoto },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

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
        formData.append('archivo', {
          uri: fotoLocal,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as unknown as Blob);

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
          <View style={{ paddingHorizontal: e(24), paddingTop: e(24), gap: e(28) }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(22), color: COLOR_LABEL }}>Ajustes de perfil</Text>

            {/* Foto de perfil */}
            <View style={{ alignItems: 'center' }}>
              <Pressable onPress={abrirSelectorFoto} style={{ position: 'relative' }}>
                {fotoLocal || perfil.url_foto_perfil ? (
                  <Image
                    source={{ uri: fotoLocal ?? perfil.url_foto_perfil ?? undefined }}
                    style={{ width: e(120), height: e(120), borderRadius: 999 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: e(120),
                      height: e(120),
                      borderRadius: 999,
                      backgroundColor: Colors.celesteAgua,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(40), color: Colors.azulProfundo }}>{iniciales}</Text>
                  </View>
                )}
                <View
                  style={{
                    position: 'absolute',
                    right: e(2),
                    bottom: e(2),
                    width: e(36),
                    height: e(36),
                    borderRadius: 999,
                    backgroundColor: Colors.turquesa,
                    borderWidth: e(3),
                    borderColor: Colors.amarilloFigma,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="camera" size={e(16)} color="#FFFFFF" />
                </View>
              </Pressable>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(12), color: COLOR_MUTED, marginTop: e(10) }}>
                Toca la foto para cambiarla
              </Text>
            </View>

            {/* Nombre */}
            <View>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: e(12),
                  letterSpacing: e(0.6),
                  color: COLOR_LABEL,
                  textTransform: 'uppercase',
                  marginBottom: e(8),
                }}>
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
                />
              </View>
            </View>

            {/* Email (solo lectura) */}
            <View>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: e(12),
                  letterSpacing: e(0.6),
                  color: COLOR_LABEL,
                  textTransform: 'uppercase',
                  marginBottom: e(8),
                }}>
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
              </View>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(11), color: COLOR_MUTED, marginTop: e(6) }}>
                El email no se puede cambiar desde aquí.
              </Text>
            </View>

            {error ? <Text style={{ color: Colors.rojoSuave, fontSize: e(13), textAlign: 'center' }}>{error}</Text> : null}

            <Pressable
              onPress={guardar}
              disabled={!hayCambios || guardando}
              style={{
                width: '100%',
                height: e(56),
                borderRadius: 999,
                backgroundColor: Colors.turquesa,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !hayCambios || guardando ? 0.5 : 1,
                shadowColor: '#00E9B0',
                shadowOpacity: 0.25,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 12,
                elevation: 4,
              }}>
              {guardando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: '#FFFFFF' }}>Guardar cambios</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>

      <SelectorAvatarModal visible={modalAvatares} onClose={() => setModalAvatares(false)} onSeleccionar={seleccionarAvatar} />
    </View>
  );
}
