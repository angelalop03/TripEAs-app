// Sub-popup para añadir acompañantes desde el modal de crear viaje.
// El backend no tiene buscador de amigos registrados (no existe ese
// endpoint todavía): solo se pueden añadir "usuarios fantasma" por nombre
// (POST /api/participantes/anadir-fantasma), que la persona real podrá
// reclamar más adelante uniéndose al viaje con el código de invitación.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/Colors';

interface Props {
  visible: boolean;
  valorInicial: string[];
  onClose: () => void;
  onGuardar: (nombres: string[]) => void;
}

export function AcompanantesModal({ visible, valorInicial, onClose, onGuardar }: Props) {
  const [nombres, setNombres] = useState<string[]>(valorInicial);
  const [nombreNuevo, setNombreNuevo] = useState('');

  const abrir = () => {
    setNombres(valorInicial);
    setNombreNuevo('');
  };

  const anadir = () => {
    const limpio = nombreNuevo.trim();
    if (!limpio) return;
    setNombres((prev) => [...prev, limpio]);
    setNombreNuevo('');
  };

  const quitar = (indice: number) => {
    setNombres((prev) => prev.filter((_, i) => i !== indice));
  };

  const guardar = () => {
    onGuardar(nombres);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onShow={abrir} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 340, maxHeight: '80%', backgroundColor: Colors.blancoHueso, borderRadius: 28, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', color: Colors.azulProfundo }}>Añadir acompañantes</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={Colors.azulProfundo} />
            </Pressable>
          </View>

          <Text style={{ fontSize: 12, color: Colors.azulProfundo, opacity: 0.75, marginBottom: 16 }}>
            Si ya usan TripEAs podrán unirse luego con el código del viaje. Si no, ponles solo el nombre: se añaden como
            invitados provisionales y podrán reclamar su perfil cuando se registren.
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: Colors.celesteAgua,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 15,
                color: Colors.azulProfundo,
              }}
              placeholder="Nombre del acompañante"
              placeholderTextColor={Colors.azulProfundo}
              value={nombreNuevo}
              onChangeText={setNombreNuevo}
              onSubmitEditing={anadir}
              returnKeyType="done"
            />
            <Pressable
              onPress={anadir}
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                backgroundColor: Colors.turquesa,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="add" size={22} color={Colors.blancoHueso} />
            </Pressable>
          </View>

          {nombres.length === 0 ? (
            <Text style={{ fontSize: 13, color: Colors.azulProfundo, opacity: 0.5, textAlign: 'center', marginBottom: 16 }}>
              Aún no has añadido a nadie.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 180, marginBottom: 16 }}>
              {nombres.map((nombre, indice) => (
                <View
                  key={`${nombre}-${indice}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: Colors.celesteAgua,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    marginBottom: 8,
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="person-outline" size={16} color={Colors.azulProfundo} />
                    <Text style={{ fontSize: 14, color: Colors.azulProfundo, flex: 1 }} numberOfLines={1}>
                      {nombre}
                    </Text>
                    <Text style={{ fontSize: 10, color: Colors.turquesa, fontWeight: '700' }}>FANTASMA</Text>
                  </View>
                  <Pressable onPress={() => quitar(indice)} hitSlop={8} style={{ marginLeft: 8 }}>
                    <Ionicons name="trash-outline" size={16} color={Colors.rojoSuave} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable
            style={{ backgroundColor: Colors.turquesa, borderRadius: 25, paddingVertical: 13, alignItems: 'center' }}
            onPress={guardar}>
            <Text style={{ color: Colors.blancoHueso, fontWeight: '600', fontSize: 15 }}>
              {nombres.length > 0 ? `Guardar (${nombres.length})` : 'Guardar'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
