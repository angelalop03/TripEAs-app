// Barra de navegación inferior del detalle de viaje, medidas replicadas del
// diseño de Figma (5 pestañas, activa resaltada en turquesa con línea inferior).
// Componente presentacional puro: no depende de estar dentro del Tabs
// navigator, así que se puede usar tanto ahí (ver TripTabBar) como en
// pantallas "de fuera" (Docs, Álbum, Ajustes, Cuentas) para que también
// tengan la barra sin convertirse en una pestaña más.
// "More" no navega a una pantalla propia: despliega un popup con Documentos,
// Álbum y Ajustes justo encima de la barra.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';

const TABS = [
  { nombre: 'gastos', icono: 'cash-outline' as const, etiqueta: 'Tricount' },
  { nombre: 'calendario', icono: 'calendar-outline' as const, etiqueta: 'Calendar' },
  { nombre: 'index', icono: 'home' as const, etiqueta: 'Home' },
  { nombre: 'elegir', icono: 'pie-chart-outline' as const, etiqueta: 'Choose' },
  { nombre: 'mas', icono: 'ellipsis-horizontal-outline' as const, etiqueta: 'More' },
];

const OPCIONES_MAS = [
  {
    icono: 'document-text-outline' as const,
    color: '#98D3FD',
    colorIcono: '#145C80',
    titulo: 'Documentos',
    ruta: '/viaje/docs' as const,
  },
  {
    icono: 'checkbox-outline' as const,
    color: '#A8E6CF',
    colorIcono: '#046C4E',
    titulo: 'Listas',
    ruta: '/viaje/listas' as const,
  },
  {
    icono: 'images-outline' as const,
    color: '#F0A8C4',
    colorIcono: '#8A2151',
    titulo: 'Álbum',
    ruta: '/viaje/album' as const,
  },
  {
    icono: 'settings-outline' as const,
    color: '#E3E2E0',
    colorIcono: '#3B4A43',
    titulo: 'Ajustes del viaje',
    ruta: '/viaje/ajustes' as const,
  },
];

interface Props {
  activo: string;
  idViaje: string;
  onPressTab: (nombre: string) => void;
}

export function BarraInferiorViaje({ activo, idViaje, onPressTab }: Props) {
  const insets = useSafeAreaInsets();
  const [menuMasAbierto, setMenuMasAbierto] = useState(false);

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#FFFFFF',
          paddingTop: 12,
          paddingBottom: insets.bottom + 6,
          paddingHorizontal: 12,
          shadowColor: '#000000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 20,
          elevation: 12,
        }}>
        {TABS.map((tab) => {
          const esMas = tab.nombre === 'mas';
          const marcado = esMas ? menuMasAbierto : activo === tab.nombre && !menuMasAbierto;
          const color = marcado ? Colors.turquesa : '#484C52';

          return (
            <Pressable
              key={tab.nombre}
              onPress={() => {
                if (esMas) {
                  setMenuMasAbierto((v) => !v);
                  return;
                }
                setMenuMasAbierto(false);
                onPressTab(tab.nombre);
              }}
              style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Ionicons name={tab.icono} size={24} color={color} />
              <Text style={{ fontSize: 12, fontWeight: marcado ? '600' : '400', color }}>{tab.etiqueta}</Text>
              <View style={{ width: 24, height: 2, borderRadius: 2, backgroundColor: marcado ? Colors.turquesa : 'transparent' }} />
            </Pressable>
          );
        })}
      </View>

      <Modal visible={menuMasAbierto} transparent animationType="fade" onRequestClose={() => setMenuMasAbierto(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenuMasAbierto(false)}>
          <View
            style={{
              position: 'absolute',
              right: 12,
              left: 12,
              bottom: insets.bottom + 78,
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              paddingVertical: 8,
              shadowColor: '#000000',
              shadowOpacity: 0.2,
              shadowOffset: { width: 0, height: 8 },
              shadowRadius: 20,
              elevation: 10,
            }}>
            {OPCIONES_MAS.map((opcion) => (
              <Pressable
                key={opcion.titulo}
                onPress={() => {
                  setMenuMasAbierto(false);
                  router.push({ pathname: opcion.ruta, params: { id: idViaje } });
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    backgroundColor: opcion.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name={opcion.icono} size={18} color={opcion.colorIcono} />
                </View>
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: Colors.azulProfundo }}>
                  {opcion.titulo}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
