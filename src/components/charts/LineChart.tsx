import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline, Circle, Line as SvgLine } from 'react-native-svg';
import { colors, font } from '@/theme/theme';

// Minimal line/sparkline chart over a series of numbers (react-native-svg).
// Scales to the data range with a little headroom; optional baseline at zero.
export default function LineChart({
  values,
  labels,
  height = 120,
  color = colors.primary,
  showZero = true,
}: {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  showZero?: boolean;
}) {
  const [width, setWidth] = React.useState(0);
  if (values.length === 0) {
    return <Text style={{ color: colors.textFaint, fontSize: font.size.sm }}>Not enough data yet.</Text>;
  }

  const padX = 6;
  const padY = 10;
  const min = Math.min(...values, showZero ? 0 : Math.min(...values));
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const innerH = height - padY * 2;
  const innerW = Math.max(width - padX * 2, 1);

  const x = (i: number) => padX + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
  const y = (v: number) => padY + innerH - ((v - min) / span) * innerH;

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const zeroY = y(0);

  return (
    <View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {showZero && min < 0 && (
              <SvgLine x1={padX} y1={zeroY} x2={width - padX} y2={zeroY} stroke={colors.border} strokeWidth={1} strokeDasharray="3 4" />
            )}
            <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {values.map((v, i) => (
              <Circle key={i} cx={x(i)} cy={y(v)} r={3} fill={color} />
            ))}
          </Svg>
        )}
      </View>
      {labels && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          {labels.map((l, i) => (
            <Text key={i} style={{ color: colors.textFaint, fontSize: 10 }}>{l}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
