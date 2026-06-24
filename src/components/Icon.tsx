import React from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/theme';

// Thin wrapper so every icon shares the same minimal stroke weight and a
// theme-aware default color. Usage: <Icon icon={Wallet} size={18} />
export default function Icon({
  icon: LucideComp,
  size = 20,
  color = colors.text,
  strokeWidth = 1.75,
}: {
  icon: LucideIcon;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return <LucideComp size={size} color={color} strokeWidth={strokeWidth} />;
}
