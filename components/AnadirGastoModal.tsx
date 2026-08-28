// Modal para registrar un gasto (POST /api/gastos/registrar), medidas
// replicadas del diseño de Figma ("CreatePay", frame de referencia 327px).
// Se puede dividir entre todos los participantes o solo unos pocos
// (selección de avatares) — no hay categorías ni presupuesto.
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { fetchConToken } from '@/constants/Api';

interface Participante {
  id_usuario: string;
  nombre: string;
}

interface Props {
  visible: boolean;
  idViaje: string;
  participantes: Participante[];
  usuarioActualId?: string;
  onClose: () => void;
  onCreado: () => void;
}

const FRAME_WIDTH = 327;
const COLOR_LABEL = '#005377';
const COLOR_PLACEHOLDER = '#6B7280';
const COLOR_ACENTO = '#006878';

export function AnadirGastoModal({ visible, idViaje, participantes, usuarioActualId, onClose, onCreado }: Props) {
  const { width } = useWindowDimensions();
  const anchoModal = Math.min(width - 32, FRAME_WIDTH);
  const e = (valor: number) => (valor / FRAME_WIDTH) * anchoModal;

  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [pagadorId, setPagadorId] = useState(usuarioActualId ?? '');
  const [mostrarPagadores, setMostrarPagadores] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setPagadorId(usuarioActualId ?? participantes[0]?.id_usuario ?? '');
      setSeleccionados(new Set(participantes.map((p) => p.id_usuario)));
    }
  }, [visible, usuarioActualId, participantes]);

  const cerrarYLimpiar = () => {
    setConcepto('');
    setMonto('');
    setMostrarPagadores(false);
    setError('');
    onClose();
  };

  const alternarParticipante = (id: string) => {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  };

  const alternarTodos = () => {
    setSeleccionados((prev) => (prev.size === participantes.length ? new Set() : new Set(participantes.map((p) => p.id_usuario))));
  };

  const pagador = participantes.find((p) => p.id_usuario === pagadorId);
  const elegidos = participantes.filter((p) => seleccionados.has(p.id_usuario));
  const montoNumero = Number(monto.replace(',', '.')) || 0;
  const cuotaPorPersona = elegidos.length > 0 ? montoNumero / elegidos.length : 0;

  const handleGuardar = async () => {
    if (concepto.trim().length === 0) {
      setError('Ponle un nombre al gasto');
      return;
    }
    if (!montoNumero || montoNumero <= 0) {
      setError('Introduce un importe válido');
      return;
    }
    if (elegidos.length === 0) {
      setError('Elige al menos una persona para dividir el gasto');
      return;
    }

    // Reparto a partes iguales entre los seleccionados, ajustando el
    // último para que la suma cuadre exactamente con el total.
    const cuotaBase = Math.round((montoNumero / elegidos.length) * 100) / 100;
    const distribucion = elegidos.map((p, indice) => ({
      id_usuario: p.id_usuario,
      cuota: indice === elegidos.length - 1 ? Math.round((montoNumero - cuotaBase * (elegidos.length - 1)) * 100) / 100 : cuotaBase,
    }));

    setError('');
    setIsLoading(true);
    try {
      const respuesta = await fetchConToken('/gastos/registrar', {
        method: 'POST',
        body: JSON.stringify({
          id_viaje: idViaje,
          concepto: concepto.trim(),
          monto_total: montoNumero,
          id_pagador: pagadorId || undefined,
          distribucion,
        }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos?.error || 'No se pudo registrar el gasto');
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrarYLimpiar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View
          style={{
            width: anchoModal,
            maxHeight: '90%',
            backgroundColor: Colors.blancoHueso,
            borderRadius: e(20),
            overflow: 'hidden',
            shadowColor: '#000000',
            shadowOpacity: 0.25,
            shadowOffset: { width: 0, height: 12 },
            shadowRadius: 24,
            elevation: 12,
          }}>
          {/* Cabecera */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: Colors.celesteAgua,
              paddingHorizontal: e(18),
              paddingVertical: e(10),
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(0, 104, 120, 0.1)',
            }}>
            <Pressable onPress={cerrarYLimpiar} hitSlop={8}>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: e(12), color: COLOR_LABEL }}>Cancelar</Text>
            </Pressable>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: e(16), color: COLOR_LABEL }}>Nuevo Gasto</Text>
            <View style={{ width: e(57) }} />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: e(18) }}>
            {/* Capibara + importe */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(10), marginBottom: e(22) }}>
              <View
                style={{
                  width: e(96),
                  height: e(80),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <View
                  style={{
                    position: 'absolute',
                    width: e(74),
                    height: e(74),
                    borderRadius: 999,
                    backgroundColor: Colors.celesteAgua,
                  }}
                />
                <Image
                  source={require('@/assets/images/capibara-money.png')}
                  resizeMode="contain"
                  style={{ width: e(96), height: e(80) }}
                />
              </View>
              <LinearGradient
                colors={['#DFF7F9', '#C7EEF2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  borderRadius: e(22),
                  paddingVertical: e(14),
                  shadowColor: COLOR_ACENTO,
                  shadowOpacity: 0.15,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: e(9),
                    letterSpacing: e(0.4),
                    textTransform: 'uppercase',
                    color: '#00606F',
                    marginBottom: e(4),
                  }}>
                  Total
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: e(4), height: e(34) }}>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_700Bold',
                      fontSize: e(26),
                      lineHeight: e(34),
                      color: '#006878',
                      includeFontPadding: false,
                    }}>
                    €
                  </Text>
                  <TextInput
                    style={{
                      fontFamily: 'PlusJakartaSans_700Bold',
                      fontSize: e(26),
                      lineHeight: e(34),
                      height: e(34),
                      width: e(84),
                      flexGrow: 0,
                      flexShrink: 0,
                      color: monto ? '#006878' : '#67D5ED',
                      textAlign: 'center',
                      padding: 0,
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                    }}
                    placeholder="0.00"
                    placeholderTextColor="#67D5ED"
                    value={monto}
                    onChangeText={setMonto}
                    keyboardType="decimal-pad"
                  />
                </View>
              </LinearGradient>
            </View>

            {/* Concepto */}
            <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.6), color: COLOR_LABEL, marginBottom: e(6) }}>
              ¿En qué gastaste?
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: e(10),
                backgroundColor: Colors.celesteAgua,
                borderRadius: e(32),
                paddingHorizontal: e(20),
                paddingVertical: e(4),
                marginBottom: e(18),
              }}>
              <Ionicons name="pricetag-outline" size={e(16)} color={COLOR_ACENTO} style={{ opacity: 0.7 }} />
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: e(13),
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: e(16),
                  color: Colors.azulProfundo,
                }}
                placeholder="Ej. Cena en el puerto"
                placeholderTextColor={COLOR_PLACEHOLDER}
                value={concepto}
                onChangeText={setConcepto}
              />
            </View>

            {/* Quién pagó */}
            <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.6), color: COLOR_LABEL, marginBottom: e(6) }}>
              ¿Quién pagó?
            </Text>
            <Pressable
              onPress={() => setMostrarPagadores((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: Colors.celesteAgua,
                borderRadius: e(32),
                paddingHorizontal: e(12),
                paddingVertical: e(10),
                marginBottom: mostrarPagadores ? e(8) : e(18),
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: e(10) }}>
                <View
                  style={{
                    width: e(30),
                    height: e(30),
                    borderRadius: 999,
                    backgroundColor: COLOR_ACENTO,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: e(13) }}>
                    {(pagador?.nombre ?? '?').trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(16), color: Colors.azulProfundo }}>
                  {pagador ? `${pagador.nombre}${pagador.id_usuario === usuarioActualId ? ' (Yo)' : ''}` : 'Selecciona quién pagó'}
                </Text>
              </View>
              <Ionicons name={mostrarPagadores ? 'chevron-up' : 'chevron-down'} size={e(16)} color={COLOR_PLACEHOLDER} />
            </Pressable>

            {mostrarPagadores && (
              <View style={{ backgroundColor: Colors.celesteAgua, borderRadius: e(20), marginBottom: e(18), overflow: 'hidden' }}>
                {participantes.map((p) => {
                  const esElegido = p.id_usuario === pagadorId;
                  return (
                    <Pressable
                      key={p.id_usuario}
                      onPress={() => {
                        setPagadorId(p.id_usuario);
                        setMostrarPagadores(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: e(10),
                        paddingHorizontal: e(16),
                        paddingVertical: e(10),
                        backgroundColor: esElegido ? 'rgba(0,104,120,0.1)' : 'transparent',
                      }}>
                      <View
                        style={{
                          width: e(24),
                          height: e(24),
                          borderRadius: 999,
                          backgroundColor: '#FFFFFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Text style={{ color: COLOR_ACENTO, fontWeight: '700', fontSize: e(11) }}>
                          {p.nombre.trim().charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={{ fontSize: e(15), color: Colors.azulProfundo, fontWeight: esElegido ? '700' : '400' }}>
                        {p.nombre}
                        {p.id_usuario === usuarioActualId ? ' (Yo)' : ''}
                      </Text>
                      {esElegido && <Ionicons name="checkmark" size={e(16)} color={COLOR_ACENTO} style={{ marginLeft: 'auto' }} />}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Dividir gasto */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: e(10) }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), letterSpacing: e(0.6), color: '#3B4A43' }}>
                Dividir gasto
              </Text>
              {elegidos.length > 0 && montoNumero > 0 && (
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: e(12), color: COLOR_ACENTO }}>
                  {cuotaPorPersona.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} / persona
                </Text>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: e(10) }}>
              <View style={{ flexDirection: 'row', gap: e(16) }}>
                {participantes.map((p) => {
                  const activo = seleccionados.has(p.id_usuario);
                  return (
                    <Pressable key={p.id_usuario} onPress={() => alternarParticipante(p.id_usuario)} style={{ alignItems: 'center', width: e(52) }}>
                      <View
                        style={{
                          width: e(48),
                          height: e(48),
                          borderRadius: 999,
                          backgroundColor: Colors.turquesa,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: activo ? 1 : 0.35,
                          borderWidth: activo ? e(3) : 0,
                          borderColor: COLOR_ACENTO,
                        }}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: e(16) }}>
                          {p.nombre.trim().charAt(0).toUpperCase()}
                        </Text>
                        {activo && (
                          <View
                            style={{
                              position: 'absolute',
                              bottom: -e(2),
                              right: -e(2),
                              width: e(18),
                              height: e(18),
                              borderRadius: 999,
                              backgroundColor: '#FFFFFF',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: e(2),
                              borderColor: '#FFFFFF',
                            }}>
                            <Ionicons name="checkmark-circle" size={e(18)} color={COLOR_ACENTO} />
                          </View>
                        )}
                      </View>
                      <Text
                        style={{ marginTop: e(4), fontSize: e(10), color: Colors.azulProfundo, opacity: activo ? 1 : 0.5 }}
                        numberOfLines={1}>
                        {p.nombre.split(' ')[0]}
                      </Text>
                    </Pressable>
                  );
                })}

                <Pressable onPress={alternarTodos} style={{ alignItems: 'center', width: e(52) }}>
                  <View
                    style={{
                      width: e(48),
                      height: e(48),
                      borderRadius: 999,
                      backgroundColor: '#E3E2E0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name="people" size={e(20)} color="#3B4A43" />
                  </View>
                  <Text style={{ marginTop: e(4), fontSize: e(10), color: '#3B4A43' }} numberOfLines={1}>
                    Todos
                  </Text>
                </Pressable>
              </View>
            </ScrollView>

            {elegidos.length > 0 && (
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: e(11), color: '#6B7B72', marginBottom: e(14) }}>
                Dividido entre {elegidos.length} {elegidos.length === 1 ? 'persona' : 'personas'}
              </Text>
            )}

            {/* Tip mascota */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(213, 207, 160, 0.2)',
                borderWidth: 1,
                borderColor: 'rgba(213, 207, 160, 0.3)',
                borderRadius: e(20),
                padding: e(14),
                marginBottom: e(20),
              }}>
              <Text style={{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontStyle: 'italic', fontSize: e(11), lineHeight: e(15), color: '#5C5832' }}>
                &quot;¡Yo me encargo de las mates! Tú solo disfruta el viaje.&quot;
              </Text>
            </View>

            {error ? <Text style={{ color: Colors.rojoSuave, fontSize: e(13), textAlign: 'center', marginBottom: e(10) }}>{error}</Text> : null}

            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: e(8),
                backgroundColor: Colors.turquesa,
                borderRadius: 999,
                paddingVertical: e(15),
                opacity: isLoading ? 0.7 : 1,
                shadowColor: Colors.turquesa,
                shadowOpacity: 0.35,
                shadowOffset: { width: 0, height: 6 },
                shadowRadius: 12,
                elevation: 6,
              }}
              onPress={handleGuardar}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={e(16)} color="#FFFFFF" />
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: e(18), color: '#FFFFFF' }}>Guardar Gasto</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
