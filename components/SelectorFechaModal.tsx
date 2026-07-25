// Popup con un calendario (react-native-calendars) para elegir una fecha,
// reutilizable en cualquier formulario del proyecto.
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { Modal, Pressable, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';

interface Props {
  visible: boolean;
  titulo: string;
  valor?: string | null; // fecha en formato ISO "YYYY-MM-DD"
  minDate?: string;
  onClose: () => void;
  onSeleccionar: (fechaISO: string) => void;
}

export function SelectorFechaModal({ visible, titulo, valor, minDate, onClose, onSeleccionar }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 340, backgroundColor: Colors.blancoHueso, borderRadius: 24, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.azulProfundo }}>{titulo}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={Colors.azulProfundo} />
            </Pressable>
          </View>

          <Calendar
            current={valor ?? undefined}
            minDate={minDate}
            markedDates={valor ? { [valor]: { selected: true, selectedColor: Colors.turquesa } } : undefined}
            onDayPress={(dia: DateData) => {
              onSeleccionar(dia.dateString);
              onClose();
            }}
            theme={{
              backgroundColor: Colors.blancoHueso,
              calendarBackground: Colors.blancoHueso,
              textSectionTitleColor: Colors.azulProfundo,
              selectedDayBackgroundColor: Colors.turquesa,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: Colors.turquesa,
              dayTextColor: Colors.azulProfundo,
              textDisabledColor: '#D4EFF2',
              arrowColor: Colors.turquesa,
              monthTextColor: Colors.azulProfundo,
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
