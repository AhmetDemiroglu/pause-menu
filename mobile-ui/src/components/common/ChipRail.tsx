import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing } from '@/src/constants/theme';

/**
 * Yatay cip rayi (kategori, tarih, filtre cipleri).
 *
 * Duz `ScrollView horizontal` ile ayni; tek farki sag kenardaki "devami var" ipucu. Kullanici
 * cip serisinin yana kaydigini tahmin etmiyor: icerik ekrana sigmadigi surece sag kenarda
 * zemine karisan bir solma ve surekli saga suzulen cift ok durur. Sona kaydirinca ya da her sey
 * sigiyorsa ipucu kaybolur. (Luuq ChipRail ile ayni davranis, Pause Menu temasina uyarlandi.)
 *
 * Kullanim: `<ScrollView horizontal showsHorizontalScrollIndicator={false} ...>` yerine
 * `<ChipRail ...>`. Yalniz cip seritleri icin; sayfa govdesi ya da gorsel seridi icin degil.
 * Ray baska bir yuzeyin ustundeyse `fadeColor` ile o yuzeyin rengi verilir (varsayilan: sayfa zemini).
 */
export const ChipRail = forwardRef<ScrollView, ScrollViewProps & { fadeColor?: string }>(function ChipRail(
  { children, onLayout, onContentSizeChange, onScroll, fadeColor, style, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const viewportWidth = useRef(0);
  const contentWidth = useRef(0);
  const scrollX = useRef(0);
  const [hintVisible, setHintVisible] = useState(false);

  // Ipucu yalniz gercekten gorunmeyen cip varken: icerik tasiyor VE sona henuz gelinmedi.
  const update = useCallback(() => {
    const remaining = contentWidth.current - viewportWidth.current - scrollX.current;
    setHintVisible(contentWidth.current > viewportWidth.current + 2 && remaining > 12);
  }, []);

  return (
    // flexGrow 0: flex:1 bir kabin cocuguyken dikey alani kaplamasin.
    <View style={[styles.root, style]}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={32}
        {...rest}
        onLayout={(e) => {
          viewportWidth.current = e.nativeEvent.layout.width;
          update();
          onLayout?.(e);
        }}
        onContentSizeChange={(w, h) => {
          contentWidth.current = w;
          update();
          onContentSizeChange?.(w, h);
        }}
        onScroll={(e) => {
          scrollX.current = e.nativeEvent.contentOffset.x;
          update();
          onScroll?.(e);
        }}
      >
        {children}
      </ScrollView>
      {hintVisible ? <ScrollHint fade={fadeColor ?? colors.background} arrow={colors.primary} /> : null}
    </View>
  );
});

/**
 * Sag kenar "devami var" isareti: zemine karisan solma + surekli saga suzulup geri gelen cift ok.
 * Dokunuslari yutmaz (pointerEvents none), altindaki cip tiklanabilir kalir.
 */
function ScrollHint({ fade, arrow }: { fade: string; arrow: string }) {
  const shift = useSharedValue(0);
  useEffect(() => {
    shift.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 550, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 550, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [shift]);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }] }));

  return (
    <View style={styles.hint} pointerEvents="none">
      {FADE.map((o, i) => (
        <View key={i} style={[styles.fadeSlice, { opacity: o, backgroundColor: fade }]} />
      ))}
      <Animated.View style={[styles.arrows, arrowStyle]}>
        <Ionicons name="chevron-forward" size={14} color={arrow} style={styles.firstArrow} />
        <Ionicons name="chevron-forward" size={14} color={arrow} />
      </Animated.View>
    </View>
  );
}

const FADE = [0.12, 0.3, 0.5, 0.7, 0.85, 0.95];

const styles = StyleSheet.create({
  root: { flexGrow: 0, flexShrink: 0 },
  hint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fadeSlice: { flex: 1, height: '100%' },
  arrows: {
    position: 'absolute',
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  firstArrow: { marginRight: -8 },
});
