import { createTamagui } from 'tamagui';
import { config as defaultConfig } from '@tamagui/config/v3';

// ═══════════════════════════════════════════════
// PREMIUM HEALTH APP — Tamagui Theme Configuration
// ═══════════════════════════════════════════════
//
// Rich, modern palette inspired by premium fitness apps
// (Apple Health, Oura, Whoop, Arc) with lush gradients.

const healthTokens = {
  ...defaultConfig.tokens,
  color: {
    ...defaultConfig.tokens.color,

    // ── Core brand ──
    brand:           '#6C5CE7',   // Deep iris purple
    brandLight:      '#A29BFE',   // Lavender
    brandDark:       '#4A3CB5',   // Deep purple
    brandMuted:      '#EDE9FE',   // Very light lavender bg

    // ── Surface & Background ──
    bgCanvas:        '#F8F7FC',   // Warm off-white with purple tint
    bgCard:          '#FFFFFF',   // Pure white cards
    bgCardDark:      '#1E1B4B',   // Deep indigo dark cards
    bgCardElevated:  '#FEFEFF',   // Slightly elevated white
    bgOverlay:       'rgba(30, 27, 75, 0.55)', // Modal overlay

    // ── Text ──
    textPrimary:     '#1A1640',   // Near-black with warm blue
    textSecondary:   '#8B8AA7',   // Muted lavender-gray
    textOnDark:      '#FFFFFF',
    textOnDarkMuted: 'rgba(255,255,255,0.5)',

    // ── Accent palette — each widget gets its own rich color ──
    heartRed:        '#FF6B8A',   // Warm coral-red for HR
    heartRedLight:   '#FFB3C6',   // Soft pink for HR bars
    heartRedBg:      'rgba(255,107,138,0.12)',

    emerald:         '#34D399',   // Rich emerald for weight/success
    emeraldDark:     '#059669',   // Deep emerald
    emeraldBg:       'rgba(52,211,153,0.12)',

    amber:           '#FBBF24',   // Warm amber for streaks
    amberDark:       '#D97706',
    amberBg:         'rgba(251,191,36,0.12)',

    violet:          '#8B5CF6',   // Vivid violet for sleep
    violetDark:      '#6D28D9',
    violetDeep:      '#4C1D95',   // Deepest purple accent
    violetBg:        'rgba(139,92,246,0.12)',

    coral:           '#F472B6',   // Warm coral-pink for calories
    coralDark:       '#EC4899',
    coralBg:         'rgba(244,114,182,0.12)',

    sky:             '#38BDF8',   // Bright sky blue for steps
    skyDark:         '#0EA5E9',
    skyBg:           'rgba(56,189,248,0.12)',

    teal:            '#2DD4BF',   // Rich teal for body comp
    tealDark:        '#14B8A6',
    tealBg:          'rgba(45,212,191,0.12)',

    lime:            '#A3E635',   // Vivid lime for progress
    limeDark:        '#84CC16',

    // ── Status ──
    success:         '#34D399',
    warning:         '#FBBF24',
    error:           '#FB7185',
    info:            '#60A5FA',

    // ── Zones (HR) ──
    zoneFatBurn:     '#FCD34D',
    zoneCardio:      '#FB923C',
    zonePeak:        '#EF4444',
    zoneRest:        '#34D399',

    // ── Misc ──
    ghost:           '#E2E0F0',   // LED ghost digit color
    separator:       '#F0EEF7',
    glass:           'rgba(255,255,255,0.7)',
  },
};

const healthTheme = {
  light: {
    background: healthTokens.color.bgCanvas,
    backgroundHover: healthTokens.color.brandMuted,
    backgroundPress: healthTokens.color.brandMuted,
    backgroundFocus: healthTokens.color.brandMuted,
    color: healthTokens.color.textPrimary,
    colorHover: healthTokens.color.brand,
    colorPress: healthTokens.color.brandDark,
    colorFocus: healthTokens.color.brand,
    borderColor: healthTokens.color.separator,
    borderColorHover: healthTokens.color.brandLight,
    shadowColor: 'rgba(108, 92, 231, 0.08)',
    placeholderColor: healthTokens.color.textSecondary,
  },
  dark: {
    background: healthTokens.color.bgCardDark,
    backgroundHover: '#2A2660',
    backgroundPress: '#2A2660',
    backgroundFocus: '#2A2660',
    color: '#FFFFFF',
    colorHover: healthTokens.color.brandLight,
    colorPress: healthTokens.color.brand,
    colorFocus: healthTokens.color.brandLight,
    borderColor: 'rgba(255,255,255,0.08)',
    borderColorHover: 'rgba(255,255,255,0.15)',
    shadowColor: 'rgba(0,0,0,0.3)',
    placeholderColor: 'rgba(255,255,255,0.4)',
  },
};

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  tokens: healthTokens,
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      ...healthTheme.light,
    },
    dark: {
      ...defaultConfig.themes.dark,
      ...healthTheme.dark,
    },
  },
});

export default tamaguiConfig;

// Export color tokens for direct use in RN StyleSheet
export const T = healthTokens.color;

export type AppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
