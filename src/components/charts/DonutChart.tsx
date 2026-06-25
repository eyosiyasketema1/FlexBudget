import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '@/theme/theme';

export interface DonutSlice {
  value: number;
  color: string;
}

// Lightweight donut using stroked circle arcs (react-native-svg). Slices are
// drawn as dash segments around the ring. `center` renders inside the hole.
export default function DonutChart({
  slices,
  size = 160,
  strokeWidth = 22,
  center,
}: {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  center?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);

  let offset = 0;
  const arcs =
    total > 0
      ? slices
          .filter((s) => s.value > 0)
          .map((s, i) => {
            const frac = s.value / total;
            const len = frac * circ;
            const arc = (
              <Circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                fill="none"
              />
            );
            offset += len;
            return arc;
          })
      : [];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* track */}
        <Circle cx={cx} cy={cy} r={r} stroke={colors.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
        {/* rotate so the first slice starts at top */}
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          {arcs}
        </G>
      </Svg>
      {center}
    </View>
  );
}
