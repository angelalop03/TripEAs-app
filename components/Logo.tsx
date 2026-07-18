// Logo de marca: "Trip" en turquesa + "EAs" en azul profundo (negrita)
import { Text, TextStyle } from 'react-native';

import { Colors } from '@/constants/Colors';

interface LogoProps {
  size?: number;
  fontFamily?: string;
  style?: TextStyle;
}

export function Logo({ size = 36, fontFamily, style }: LogoProps) {
  return (
    <Text style={[{ fontSize: size, fontWeight: 'bold', fontFamily }, style]}>
      <Text style={{ color: Colors.turquesa }}>Trip</Text>
      <Text style={{ color: Colors.azulProfundo }}>EAs</Text>
    </Text>
  );
}
