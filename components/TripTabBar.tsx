// Adaptador entre el Tabs navigator de expo-router y BarraInferiorViaje
// (el componente presentacional que dibuja la barra de verdad). Aquí solo
// vive la lógica específica de react-navigation (emitir tabPress, navigate).
import { useLocalSearchParams } from 'expo-router';
import { BottomTabBarProps } from 'expo-router/tabs';

import { BarraInferiorViaje } from '@/components/BarraInferiorViaje';

export function TripTabBar({ state, navigation }: BottomTabBarProps) {
  // Los tabs son screens hermanos dentro de app/viaje/[id]/: al cambiar de
  // pestaña con navigation.navigate hay que reenviar el id a mano, si no la
  // pantalla destino se queda con id undefined para siempre.
  const { id } = useLocalSearchParams<{ id: string }>();
  const activo = state.routes[state.index].name;

  return (
    <BarraInferiorViaje
      activo={activo}
      idViaje={id}
      onPressTab={(nombre) => {
        const route = state.routes.find((r) => r.name === nombre);
        if (!route) return;
        const evento = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (activo !== nombre && !evento.defaultPrevented) {
          navigation.navigate(nombre, { id });
        }
      }}
    />
  );
}
