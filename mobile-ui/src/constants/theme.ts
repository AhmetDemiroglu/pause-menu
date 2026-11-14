/* Pause Menu paleti: murekkep moru zemin, krem yazi, gun batimi pembe > turuncu vurgu.
 * Web'deki globals.css token'lariyla ayni aile (ui/src/app/globals.css). */
export const Colors = {
  dark: {
    background: '#14101F',
    surface: '#1C1530',
    surfaceHighlight: '#251C3A',
    border: 'rgba(255,255,255,0.10)',
    text: '#FBF6EA',
    textSecondary: '#B8AFC9',
    textMuted: '#8A809E',
    primary: '#FF2E88',
    primaryLight: '#FF5FA6',
    accent: '#FF8A1F',
    // Gonderilerde uc etiket tipi RENKLE ayrilir: kisi primary/primaryLight
    // (yukarida), oyun kehribar, liste mor. Uc tip de ayni "@" ile yazildigi
    // icin renk tek ayirt edici isaret. Web'deki --mention-game / --mention-list
    // token'lariyla ayni tonlar.
    mentionGame: '#FBBF24',
    mentionList: '#B58CFF',
    success: '#22c55e',
    warning: '#F5B700',
    error: '#ef4444',
    info: '#FF5FA6',
    card: '#1C1530',
    tabBar: '#14101F',
    tabBarBorder: 'rgba(255,255,255,0.08)',
    inputBackground: '#1C1530',
    inputBorder: 'rgba(255,255,255,0.12)',
    placeholder: '#8A809E',
    overlay: 'rgba(8, 5, 16, 0.72)',
    badge: '#ef4444',
    skeleton: '#251C3A',
    star: '#F5B700',
  },
  light: {
    background: '#FFF8F1',
    surface: '#FFFFFF',
    surfaceHighlight: '#F6EEE6',
    border: 'rgba(20,16,31,0.10)',
    text: '#14101F',
    textSecondary: '#5C5470',
    textMuted: '#8A8299',
    primary: '#E8207A',
    primaryLight: '#FF5FA6',
    accent: '#E26D00',
    // Aydinlik zeminde koyu tonlar; koyu temadaki acik tonlar burada okunmuyor.
    mentionGame: '#D97706',
    mentionList: '#7A1FD0',
    success: '#16a34a',
    warning: '#C98F00',
    error: '#dc2626',
    info: '#E8207A',
    card: '#FFFFFF',
    tabBar: '#FFF8F1',
    tabBarBorder: 'rgba(20,16,31,0.08)',
    inputBackground: '#FFFFFF',
    inputBorder: 'rgba(20,16,31,0.12)',
    placeholder: '#8A8299',
    overlay: 'rgba(20, 16, 31, 0.5)',
    badge: '#ef4444',
    skeleton: '#F0E6DC',
    star: '#E8A200',
  },
};

/* Marka degradeleri (expo-linear-gradient colors dizisi). */
export const Gradients = {
  /** Gun batimi: pembe > turuncu. Ana CTA, hero, vurgu yuzeyleri. */
  sunset: ['#FF2E88', '#FF8A1F'] as const,
  /** Uc durakli gun batimi: mor > pembe > turuncu. Genis hero alanlari. */
  dusk: ['#7A1FD0', '#FF2E88', '#FF8A1F'] as const,
  /** Uyari/bakim: turuncu > kirmizi. */
  alert: ['#FF8A1F', '#ef4444'] as const,
};

export type ThemeColors = typeof Colors.dark;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 28,
  hero: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

/* ── Motion tokens ──
 * Tüm uygulama tutarlı animasyon hissi için tek nokta. Reanimated
 * spring/timing çağrıları bu değerleri referans alır.
 */
export const Durations = {
  fast: 180,
  normal: 260,
  slow: 400,
} as const;

export const Easings = {
  // Reanimated'in Easing karşılıkları (sayı factory değil, doğrudan eğri)
  out: 'easeOut' as const,
  inOut: 'easeInOut' as const,
  spring: 'spring' as const,
};

/* Reanimated withSpring config'leri */
export const Springs = {
  /** Yumuşak, doğal drawer/modal geçişleri */
  smooth: { damping: 26, stiffness: 280, mass: 0.8 },
  /** Snappy - buton/sekmeler için hızlı tepki */
  snappy: { damping: 18, stiffness: 380, mass: 0.6 },
  /** Bouncy - oyuncu platformu için hafif zıpzıp his (beğeni/takip) */
  bouncy: { damping: 12, stiffness: 420, mass: 0.7 },
} as const;

/* ── Elevation / Shadow tokens ──
 * iOS shadow + Android elevation ayrımı tutarlı kalıbında.
 */
export interface ShadowToken {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export const Shadows = {
  none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 8 },
  xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 14 },
} as const;
