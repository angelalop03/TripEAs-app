// Rueda de la ruleta de decisiones — dibujada con SVG (react-native-svg) ya
// que el número de opciones es variable y no se puede maquetar con Views.
import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

const COLORES_SEGMENTO = ['#FF7043', '#4DB6AC', '#7986CB', '#F06292', '#AED581', '#FFD54F'];

interface Opcion {
  id_opcion: string;
  texto_opcion: string;
}

interface Props {
  opciones: Opcion[];
  tamano: number;
  rotacion: Animated.Value;
  girando: boolean;
  onGirar: () => void;
}

function puntoPolar(cx: number, cy: number, r: number, anguloGrados: number) {
  const rad = ((anguloGrados - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function trazadoSector(cx: number, cy: number, r: number, inicio: number, fin: number): string {
  const p1 = puntoPolar(cx, cy, r, inicio);
  const p2 = puntoPolar(cx, cy, r, fin);
  const arcoGrande = fin - inicio > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${arcoGrande} 1 ${p2.x} ${p2.y} Z`;
}

export function RuletaWheel({ opciones, tamano, rotacion, girando, onGirar }: Props) {
  const anguloPorOpcion = 360 / opciones.length;
  const rotacionInterpolada = rotacion.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ width: tamano, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: tamano,
          height: tamano,
          borderRadius: 999,
          backgroundColor: '#FFFFFF',
          borderWidth: 8,
          borderColor: '#FFFFFF',
          shadowColor: '#000000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 10 },
          shadowRadius: 20,
          elevation: 10,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Animated.View style={{ transform: [{ rotate: rotacionInterpolada }] }}>
          <Svg width={tamano - 16} height={tamano - 16} viewBox={`0 0 ${tamano - 16} ${tamano - 16}`}>
            {opciones.map((opcion, indice) => {
              const inicio = indice * anguloPorOpcion;
              const fin = inicio + anguloPorOpcion;
              const medio = inicio + anguloPorOpcion / 2;
              const r = (tamano - 16) / 2;
              const puntoTexto = puntoPolar(r, r, r * 0.62, medio);
              return (
                <G key={opcion.id_opcion}>
                  <Path d={trazadoSector(r, r, r, inicio, fin)} fill={COLORES_SEGMENTO[indice % COLORES_SEGMENTO.length]} stroke="#FFFFFF" strokeWidth={1} />
                  <SvgText
                    x={puntoTexto.x}
                    y={puntoTexto.y}
                    fill="#FFFFFF"
                    fontSize={12}
                    fontWeight="700"
                    textAnchor="middle"
                    rotation={medio}
                    origin={`${puntoTexto.x}, ${puntoTexto.y}`}>
                    {opcion.texto_opcion.length > 14 ? `${opcion.texto_opcion.slice(0, 13)}…` : opcion.texto_opcion}
                  </SvgText>
                </G>
              );
            })}
            <Circle cx={(tamano - 16) / 2} cy={(tamano - 16) / 2} r={2} fill="#FFFFFF" />
          </Svg>
        </Animated.View>
      </View>

      {/* Puntero fijo arriba */}
      <View style={{ position: 'absolute', top: -8, alignItems: 'center' }}>
        <View
          style={{
            width: 32,
            height: 40,
            borderRadius: 999,
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 4,
            backgroundColor: '#BA1A1A',
            borderWidth: 2,
            borderColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000000',
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 6,
            elevation: 6,
          }}>
          <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: '#FFFFFF' }} />
        </View>
      </View>

      {/* Botón central */}
      <Pressable
        onPress={onGirar}
        disabled={girando}
        style={{
          position: 'absolute',
          width: 96,
          height: 96,
          borderRadius: 999,
          backgroundColor: '#006C50',
          borderWidth: 4,
          borderColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000000',
          shadowOpacity: 0.2,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 10,
          elevation: 8,
          opacity: girando ? 0.8 : 1,
          overflow: 'hidden',
        }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '55%',
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderTopLeftRadius: 999,
            borderTopRightRadius: 999,
          }}
        />
        <Ionicons name="dice-outline" size={24} color="#FFFFFF" />
        <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '600', letterSpacing: 0.6, color: '#FFFFFF' }}>
          {girando ? '...' : 'SPIN!'}
        </Text>
      </Pressable>
    </View>
  );
}
