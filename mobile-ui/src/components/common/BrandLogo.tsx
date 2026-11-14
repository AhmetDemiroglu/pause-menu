import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';

const SOURCES = {
  horizontal: {
    dark: require('@/assets/images/brand/logo-horizontal-on-dark.png'),
    light: require('@/assets/images/brand/logo-horizontal-on-light.png'),
    ratio: 1200 / 256,
  },
  primary: {
    dark: require('@/assets/images/brand/logo-primary-on-dark.png'),
    light: require('@/assets/images/brand/logo-primary-on-light.png'),
    ratio: 1200 / 576,
  },
} as const;

export type BrandLogoVariant = keyof typeof SOURCES;

interface BrandLogoProps {
  /** horizontal: tek satir (ust bar). primary: el yazili "Menu" ile ana logo (tanitim alanlari). */
  variant?: BrandLogoVariant;
  /** Logo yuksekligi; genislik oranla hesaplanir. */
  height: number;
  /** Zemin rengine gore yazi tonu. Verilmezse aktif temaya uyar. */
  tone?: 'auto' | 'onDark' | 'onLight';
  style?: StyleProp<ImageStyle>;
}

/** Tema duyarli Pause Menu logosu. Koyu zeminde krem yazi, acik zeminde murekkep yazi. */
export function BrandLogo({ variant = 'horizontal', height, tone = 'auto', style }: BrandLogoProps) {
  const { isDark } = useTheme();
  const src = SOURCES[variant];
  const onDark = tone === 'auto' ? isDark : tone === 'onDark';
  return (
    <Image
      source={onDark ? src.dark : src.light}
      style={[{ height, width: Math.round(height * src.ratio) }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Pause Menu"
    />
  );
}
