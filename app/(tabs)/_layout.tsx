// El diseño de Home no usa una barra de tabs visible (solo el FAB flotante
// de la propia pantalla), así que la ocultamos y dejamos un único screen.
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" />
    </Tabs>
  );
}
