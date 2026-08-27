// Modal para elegir una foto de perfil predefinida de las que hay en
// assets/images/profile/ (ver constants/AvataresPerfil.ts).
import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { AVATARES_PERFIL, type AvatarPerfil } from '@/constants/AvataresPerfil';
import { Colors } from '@/constants/Colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSeleccionar: (avatar: AvatarPerfil) => void;
}

export function SelectorAvatarModal({ visible, onClose, onSeleccionar }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 340, maxHeight: '75%', backgroundColor: Colors.blancoHueso, borderRadius: 28, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: Colors.azulProfundo }}>Elige un avatar</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={Colors.azulProfundo} />
            </Pressable>
          </View>

          {AVATARES_PERFIL.length === 0 ? (
            <Text style={{ fontSize: 13, color: Colors.azulProfundo, opacity: 0.6, textAlign: 'center', paddingVertical: 24 }}>
              Todavía no hay avatares disponibles.
            </Text>
          ) : (
            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }} showsVerticalScrollIndicator={false}>
              {AVATARES_PERFIL.map((avatar) => (
                <Pressable
                  key={avatar.id}
                  onPress={() => onSeleccionar(avatar)}
                  style={{ width: 84, alignItems: 'center', gap: 6 }}>
                  <Image
                    source={avatar.fuente}
                    style={{ width: 72, height: 72, borderRadius: 999, backgroundColor: Colors.celesteAgua }}
                    resizeMode="cover"
                  />
                  <Text style={{ fontSize: 11, color: Colors.azulProfundo, textAlign: 'center' }} numberOfLines={1}>
                    {avatar.nombre}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
