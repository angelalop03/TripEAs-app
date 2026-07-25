// Tabs del detalle de viaje (Tricount / Calendar / Home / Choose / More).
// El id del viaje viene del segmento dinámico [id] y llega a cada tab vía
// useLocalSearchParams().
import { Tabs } from 'expo-router';

import { TripTabBar } from '@/components/TripTabBar';

export default function ViajeTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TripTabBar {...props} />}>
      <Tabs.Screen name="gastos" />
      <Tabs.Screen name="calendario" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="elegir" />
      <Tabs.Screen name="mas" />
    </Tabs>
  );
}
