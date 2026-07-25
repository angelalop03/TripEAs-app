// Modal para crear un evento de calendario (POST /api/calendario/crear),
// medidas replicadas del diseño de Figma ("CreateActivity").
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { SelectorFechaModal } from '@/components/SelectorFechaModal';
import { fetchConToken } from '@/constants/Api';
import { Colors } from '@/constants/Colors';

interface Props {
  visible: boolean;
  idViaje: string;
  fechaSeleccionada?: string;
  onClose: () => void;
  onCreado: () => void;
}

const FRAME_WIDTH = 348;
const COLOR_LABEL = '#216489';
const COLOR_PLACEHOLDER = '#B9CBC1';
const COLOR_ACENTO = '#006878';

// Formatea mientras se escribe: "1930" -> "19:30"
function formatearHora(valor: string): string {
  const limpio = valor.replace(/[^0-9]/g, '').slice(0, 4);
  if (limpio.length <= 2) return limpio;
  return `${limpio.slice(0, 2)}:${limpio.slice(2)}`;
}

function horaValida(valor: string): boolean {
  if (!valor) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

export function CrearActividadModal({ visible, idViaje, fechaSeleccionada, onClose, onCreado }: Props) {
  const { width } = useWindowDimensions();
  const anchoModal = Math.min(width - 32, FRAME_WIDTH);
  const e = (valor: number) => (valor / FRAME_WIDTH) * anchoModal;

  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState(fechaSeleccionada ?? '');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const cerrarYLimpiar = () => {
    setTitulo('');
    setFecha('');
    setHoraInicio('');
    setHoraFin('');
    setDescripcion('');
    setError('');
    onClose();
  };

  const handleCrear = async () => {
    if (titulo.trim().length === 0) {
      setError('Ponle un título a la actividad');
      return;
    }
    if (!fecha) {
      setError('Elige un día para la actividad');
      return;
    }
    if (!horaValida(horaInicio) || !horaInicio) {
      setError('Introduce la hora de inicio (HH:MM)');
      return;
    }
    if (horaFin && !horaValida(horaFin)) {
      setError('La hora de fin no es válida (HH:MM)');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const respuesta = await fetchConToken('/calendario/crear', {
        method: 'POST',
        body: JSON.stringify({
          id_viaje: idViaje,
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          fecha_hora_inicio: `${fecha}T${horaInicio}:00`,
          fecha_hora_fin: horaFin ? `${fecha}T${horaFin}:00` : null,
        }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos?.error || 'No se pudo crear la actividad');
        return;
      }

      cerrarYLimpiar();
      onCreado();
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const tarjeta = {
    width: '100%' as const,
    backgroundColor: 'rgba(152, 211, 253, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(227, 226, 224, 0.5)',
    borderRadius: e(28.5),
    padding: e(21.4),
    gap: e(7),
  };

  const etiqueta = {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: e(10.7),
    letterSpacing: e(0.5),
    textTransform: 'uppercase' as const,
    color: COLOR_LABEL,
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrarYLimpiar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{ width: anchoModal, maxHeight: '90%', backgroundColor: Colors.blancoHueso, borderRadius: e(18), overflow: 'hidden' }}>
          {/* Cabecera */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: e(14),
              paddingHorizontal: e(21),
              paddingVertical: e(14),
              borderBottomWidth: 1,
              borderBottomColor: '#E3E2E0',
            }}>
            <Pressable onPress={cerrarYLimpiar} hitSlop={8}>
              <Ionicons name="chevron-back" size={e(20)} color={COLOR_ACENTO} />
            </Pressable>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(17.8), color: '#1A1C1A' }}>Nueva Actividad</Text>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: e(21.4), gap: e(14.3) }}>
            {/* Título */}
            <View style={tarjeta}>
              <Text style={etiqueta}>Título de la actividad</Text>
              <TextInput
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: e(42.8),
                  paddingHorizontal: e(14.3),
                  paddingVertical: e(15.6),
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: e(14.3),
                  color: Colors.azulProfundo,
                }}
                placeholder="Ej: Cena en el Puerto"
                placeholderTextColor={COLOR_PLACEHOLDER}
                value={titulo}
                onChangeText={setTitulo}
              />
            </View>

            {/* Fecha */}
            <View style={tarjeta}>
              <Text style={etiqueta}>¿Cuándo será?</Text>
              <Pressable
                onPress={() => setMostrarCalendario(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: e(10),
                  backgroundColor: '#FFFFFF',
                  borderRadius: e(42.8),
                  paddingHorizontal: e(14.3),
                  paddingVertical: e(15.6),
                }}>
                <Ionicons name="calendar-outline" size={e(16)} color={COLOR_ACENTO} />
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14.3), color: fecha ? Colors.azulProfundo : COLOR_PLACEHOLDER }}>
                  {fecha || 'dd/mm/aaaa'}
                </Text>
              </Pressable>
            </View>

            {/* Horario */}
            <View style={tarjeta}>
              <Text style={etiqueta}>Horario</Text>
              <View style={{ flexDirection: 'row', gap: e(14.3) }}>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: e(6),
                    backgroundColor: '#FFFFFF',
                    borderRadius: e(42.8),
                    paddingHorizontal: e(14.3),
                    paddingVertical: e(13.8),
                  }}>
                  <Ionicons name="time-outline" size={e(15)} color={COLOR_ACENTO} />
                  <TextInput
                    style={{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14.3), color: Colors.azulProfundo }}
                    placeholder="--:--"
                    placeholderTextColor={COLOR_PLACEHOLDER}
                    value={horaInicio}
                    onChangeText={(v) => setHoraInicio(formatearHora(v))}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: e(6),
                    backgroundColor: '#FFFFFF',
                    borderRadius: e(42.8),
                    paddingHorizontal: e(14.3),
                    paddingVertical: e(13.8),
                  }}>
                  <Ionicons name="time-outline" size={e(15)} color={COLOR_ACENTO} />
                  <TextInput
                    style={{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(14.3), color: Colors.azulProfundo }}
                    placeholder="--:--"
                    placeholderTextColor={COLOR_PLACEHOLDER}
                    value={horaFin}
                    onChangeText={(v) => setHoraFin(formatearHora(v))}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>
            </View>

            {/* Descripción */}
            <View style={tarjeta}>
              <Text style={etiqueta}>Descripción</Text>
              <TextInput
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: e(24),
                  paddingHorizontal: e(14.3),
                  paddingVertical: e(14.3),
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: e(12.5),
                  color: Colors.azulProfundo,
                  minHeight: e(80),
                  textAlignVertical: 'top',
                }}
                placeholder="Agrega notas, enlaces o detalles importantes..."
                placeholderTextColor={COLOR_PLACEHOLDER}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
              />
            </View>

            {error ? <Text style={{ color: Colors.rojoSuave, fontSize: e(12), textAlign: 'center' }}>{error}</Text> : null}
          </ScrollView>

          {/* Botón fijo */}
          <View
            style={{
              padding: e(21.4),
              paddingTop: e(14),
              backgroundColor: Colors.blancoHueso,
            }}>
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: e(7),
                backgroundColor: COLOR_ACENTO,
                borderRadius: 999,
                paddingVertical: e(13.4),
                opacity: isLoading ? 0.7 : 1,
              }}
              onPress={handleCrear}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={e(18)} color="#FFFFFF" />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(17.8), color: '#FFFFFF' }}>
                    Crear Actividad
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <SelectorFechaModal
        visible={mostrarCalendario}
        titulo="¿Cuándo será?"
        valor={fecha || undefined}
        onClose={() => setMostrarCalendario(false)}
        onSeleccionar={setFecha}
      />
    </Modal>
  );
}
