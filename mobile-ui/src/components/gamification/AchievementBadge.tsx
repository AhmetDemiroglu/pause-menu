import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { findBadge } from '@/src/gamification/catalog';
import { renderBadgeSvg, renderLevelSvg } from '@/src/gamification/badge-art';

type AchievementBadgeProps = {
  /** Rozet kodu; eski API yanitlarinda yoksa legacyTitle'dan eslenir. */
  code?: string | null;
  legacyTitle?: string | null;
  label?: string;
  locked?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Rozet: web ile AYNI cizim (src/gamification/badge-art.ts, scripts/gamification-sync kopyalar).
 * Bilinmeyen kod bile bos kalmaz (genel yildiz rozeti).
 */
export function AchievementBadge({ code, legacyTitle, label, locked, size = 48, style }: AchievementBadgeProps) {
  const badge = findBadge(code, legacyTitle);
  const xml = useMemo(
    () =>
      badge
        ? renderBadgeSvg(badge, { locked, idPrefix: 'b' })
        : renderBadgeSvg({ family: 'unknown', category: 'special', tier: 0, threshold: 0 }, { locked, idPrefix: 'b' }),
    [badge, locked],
  );

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
    >
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}

type LevelEmblemProps = {
  level: number;
  label?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function LevelEmblem({ level, label, size = 32, style }: LevelEmblemProps) {
  const xml = useMemo(() => renderLevelSvg(level, { idPrefix: 'l' }), [level]);
  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
    >
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}
