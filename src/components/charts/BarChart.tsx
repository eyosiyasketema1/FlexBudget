import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Line as SvgLine } from 'react-native-svg';
import { colors, font } from '@/theme/theme';

// Simple vertical bar chart over a series of numbers (react-native-svg).
// Supports negative values (bars drop below a zero baseline).
export default function BarChart({
  values,
  labels,
  height = 130,
  color = colors.primary,
  negativeColor = colors.negative,
}: {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  negativeColor?: string;
}) {
  const [width, setWidth] = useState(0);
  if (values.length === 0) {
    return <Text style={{ color: colors.textFaint, fontSize: font.size.sm }}>Not enough data yet.</Text>;
  }

  const padY = 8;
  const innerH = height - padY * 2;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const zeroY = padY + (max / span) * innerH;

  const n = values.length;
  const slot = width / n;
  const barW = Math.min(slot * 0.55, 28);

  return (
    <View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <SvgLine x1={0} y1={zeroY} x2={width} y2={zeroY} stroke={colors.border} strokeWidth={1} />
            {values.map((v, i) => {
              const cx = slot * i + slot / 2;
              const h = (Math.abs(v) / span) * innerH;
              const y = v >= 0 ? zeroY - h : zeroY;
              return (
                <Rect key={i} x={cx - barW / 2} y={y} width={barW} height={Math.max(h, 1)} rx={3} fill={v >= 0 ? color : negativeColor} />
              );
            })}
          </Svg>
        )}
      </View>
      {labels && (
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {labels.map((l, i) => (
            <Text key={i} style={{ color: colors.textFaint, fontSize: 10, width: `${100 / labels.length}%`, textAlign: 'center' }}>{l}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
