// Modal para unirse a un viaje existente con el código de invitación,
// medidas replicadas del diseño de Figma (frame de referencia 375px de ancho).
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onUnido: () => void;
  onCrearOtro?: () => void;
}

const FRAME_WIDTH = 375;
const COLOR_TITULO = '#216489';
const COLOR_TEXTO_SECUNDARIO = '#3B4A43';
const COLOR_BORDE_CARD = '#D4EBED';

export function UnirseViajeModal({ visible, onClose, onUnido, onCrearOtro }: Props) {
  const { width } = useWindowDimensions();
  const anchoModal = Math.min(width - 32, FRAME_WIDTH);
  const e = (valor: number) => (valor / FRAME_WIDTH) * anchoModal;

  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const cerrarYLimpiar = () => {
    setCodigo('');
    setError('');
    onClose();
  };

  const handleUnirse = async () => {
    if (codigo.trim().length !== 8) {
      setError('El código de invitación tiene 8 caracteres');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const respuesta = await fetchConToken('/viajes/unirse', {
        method: 'POST',
        body: JSON.stringify({ codigo_invitacion: codigo.trim().toUpperCase() }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos?.error || 'No se pudo unir al viaje');
        return;
      }

      cerrarYLimpiar();
      onUnido();
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={cerrarYLimpiar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View
          style={{
            width: anchoModal,
            backgroundColor: '#FFFFFF',
            borderWidth: 4,
            borderColor: Colors.azulProfundo,
            borderRadius: e(20),
            padding: e(24),
            alignItems: 'center',
          }}>
          <Pressable onPress={cerrarYLimpiar} hitSlop={8} style={{ position: 'absolute', right: e(16), top: e(16), zIndex: 1 }}>
            <Ionicons name="close" size={e(22)} color={Colors.azulProfundo} />
          </Pressable>

          <Image
            source={require('@/assets/images/capibara.png')}
            resizeMode="contain"
            style={{ width: e(128), height: e(128), marginBottom: e(8) }}
          />

          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: e(22),
              color: COLOR_TITULO,
              textAlign: 'center',
              marginBottom: e(8),
            }}>
            ¿Tienes una invitación?
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: e(14),
              color: COLOR_TEXTO_SECUNDARIO,
              textAlign: 'center',
              marginBottom: e(16),
            }}>
            Ingresa el código de 8 dígitos para unirte a la aventura con tus amigos.
          </Text>

          <View
            style={{
              width: '100%',
              backgroundColor: Colors.celesteAgua,
              borderWidth: 1,
              borderColor: COLOR_BORDE_CARD,
              borderRadius: e(32),
              padding: e(24),
              gap: e(16),
              shadowColor: Colors.azulProfundo,
              shadowOpacity: 0.08,
              shadowOffset: { width: 0, height: e(4) },
              shadowRadius: e(20),
              elevation: 3,
              marginBottom: e(16),
            }}>
            <View style={{ width: '100%', gap: e(8) }}>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: e(12),
                  letterSpacing: e(0.6),
                  textTransform: 'uppercase',
                  color: COLOR_TITULO,
                  paddingHorizontal: e(4),
                }}>
                Código de invitación
              </Text>
              <TextInput
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  borderRadius: e(16),
                  paddingHorizontal: e(16),
                  paddingVertical: e(14),
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontSize: e(22),
                  letterSpacing: e(2.2),
                  textAlign: 'center',
                  color: Colors.azulProfundo,
                }}
                placeholder="ABCD1234"
                placeholderTextColor="#6B7280"
                value={codigo}
                onChangeText={(texto) => setCodigo(texto.toUpperCase().slice(0, 8))}
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>

            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                gap: e(12),
                backgroundColor: 'rgba(255,255,255,0.5)',
                borderRadius: e(32),
                padding: e(12),
              }}>
              <Ionicons name="information-circle-outline" size={e(17)} color={COLOR_TITULO} />
              <Text
                style={{
                  flex: 1,
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: e(10),
                  lineHeight: e(16),
                  color: COLOR_TEXTO_SECUNDARIO,
                }}>
                Pide el código al administrador del viaje. Es una combinación de letras y números única para tu grupo.
              </Text>
            </View>
          </View>

          {error ? (
            <Text style={{ color: Colors.rojoSuave, fontSize: e(13), textAlign: 'center', marginBottom: e(12) }}>{error}</Text>
          ) : null}

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
              shadowColor: '#00E9B0',
              shadowOpacity: 0.2,
              shadowOffset: { width: 0, height: 10 },
              shadowRadius: 15,
              elevation: 6,
              marginBottom: e(16),
            }}
            onPress={handleUnirse}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={Colors.blancoHueso} />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={e(18)} color={Colors.blancoHueso} />
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(16), color: Colors.blancoHueso }}>
                  Unirse a viaje
                </Text>
              </>
            )}
          </Pressable>

          <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14), color: '#6B7B72', marginBottom: e(8) }}>
            ¿No tienes un código?
          </Text>
          <Pressable
            style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(33, 100, 137, 0.3)', paddingBottom: e(2) }}
            onPress={() => {
              cerrarYLimpiar();
              onCrearOtro?.();
            }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: e(12),
                letterSpacing: e(0.6),
                color: COLOR_TITULO,
              }}>
              Crear un nuevo viaje
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
