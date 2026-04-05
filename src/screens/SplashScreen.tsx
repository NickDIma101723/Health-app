import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Circle, Path } from 'react-native-svg';

interface SplashScreenProps {
  onFinish: () => void;
}

const { width } = Dimensions.get('window');

const C = {
  bg: '#FAFAFA', card: '#FFFFFF', cardDark: '#111111',
  accent: '#10B981', accentSoft: '#ECFDF5', lime: '#D4F940',
  warmBg: '#F5F0EB', text: '#1A1A1A', dim: '#8C8C8C',
  border: '#EEEEEE',
};
const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
};

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exitAnimation, setExitAnimation] = useState(false);

  const handleGetStarted = () => {
    setExitAnimation(true);
    setTimeout(() => onFinish(), 400);
  };

  const RING_R = 52;
  const RING_CIRC = 2 * Math.PI * RING_R;

  return (
    <View style={s.container}>
      <MotiView
        style={s.content}
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: exitAnimation ? 0 : 1, scale: exitAnimation ? 0.95 : 1 }}
        transition={{ type: 'timing', duration: exitAnimation ? 300 : 700 }}
      >
        {/* Logo Area */}
        <MotiView
          style={s.logoWrap}
          from={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 200, damping: 12 }}
        >
          {/* Outer ring */}
          <Svg width={130} height={130} style={{ position: 'absolute' }}>
            <Circle cx={65} cy={65} r={RING_R} stroke={C.border} strokeWidth={4} fill="none" />
            <Circle cx={65} cy={65} r={RING_R} stroke={C.accent} strokeWidth={4} fill="none"
              strokeDasharray={`${0.75 * RING_CIRC} ${RING_CIRC}`}
              strokeLinecap="round" transform="rotate(-90, 65, 65)" />
          </Svg>
          <View style={s.logoCircle}>
            <Text style={s.logoLetter}>A</Text>
          </View>

          {/* Decorative dots */}
          <MotiView style={[s.dot, { top: -4, right: 10 }]}
            from={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 600, damping: 8 }}>
            <View style={[s.dotInner, { backgroundColor: C.lime, width: 10, height: 10 }]} />
          </MotiView>
          <MotiView style={[s.dot, { bottom: 4, left: 6 }]}
            from={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 700, damping: 8 }}>
            <View style={[s.dotInner, { backgroundColor: C.accent, width: 8, height: 8 }]} />
          </MotiView>
          <MotiView style={[s.dot, { top: 20, left: -2 }]}
            from={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 800, damping: 8 }}>
            <View style={[s.dotInner, { backgroundColor: C.warmBg, width: 12, height: 12 }]} />
          </MotiView>
        </MotiView>

        {/* Text Content */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', delay: 500, duration: 600 }}
        >
          <Text style={s.brand}>Aria</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', delay: 600, duration: 600 }}
        >
          <Text style={s.tagline}>HEALTH & WELLNESS</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 25 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 800, damping: 15 }}
        >
          <Text style={s.headline}>{'Your wellness\njourney starts here'}</Text>
          <Text style={s.sub}>{'Track health, connect with coaches,\nand reach your goals'}</Text>
        </MotiView>
      </MotiView>

      {/* Bottom CTA */}
      <MotiView
        style={s.bottomArea}
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 1000, damping: 14 }}
      >
        <TouchableOpacity style={s.ctaBtn} onPress={handleGetStarted} activeOpacity={0.85}>
          <Text style={s.ctaText}>Get Started</Text>
          <View style={s.ctaArrow}>
            <Text style={s.ctaArrowText}>{'\u2192'}</Text>
          </View>
        </TouchableOpacity>
        <Text style={s.footer}>Tap to begin your journey</Text>
      </MotiView>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: C.bg,
    justifyContent: 'space-between', paddingVertical: 60,
  },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32,
  },

  logoWrap: {
    width: 130, height: 130,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 36, position: 'relative',
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.cardDark,
    justifyContent: 'center', alignItems: 'center',
  },
  logoLetter: {
    fontSize: 40, fontFamily: F.bold, color: C.lime,
    letterSpacing: -1,
  },
  dot: { position: 'absolute' },
  dotInner: { borderRadius: 99 },

  brand: {
    fontSize: 38, fontFamily: F.bold, color: C.text,
    letterSpacing: -1.5, textAlign: 'center', marginBottom: 4,
  },
  tagline: {
    fontSize: 11, fontFamily: F.semi, color: C.dim,
    letterSpacing: 3, textAlign: 'center', marginBottom: 28,
  },
  headline: {
    fontSize: 22, fontFamily: F.bold, color: C.text,
    textAlign: 'center', lineHeight: 30, marginBottom: 10,
  },
  sub: {
    fontSize: 14, fontFamily: F.regular, color: C.dim,
    textAlign: 'center', lineHeight: 21,
  },

  bottomArea: {
    alignItems: 'center', paddingHorizontal: 32, paddingBottom: 16,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.cardDark, paddingVertical: 18,
    paddingHorizontal: 40, borderRadius: 100,
    width: '100%', maxWidth: 320, gap: 10,
  },
  ctaText: {
    fontSize: 17, fontFamily: F.bold, color: '#FFF',
  },
  ctaArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.lime,
    justifyContent: 'center', alignItems: 'center',
  },
  ctaArrowText: {
    fontSize: 16, color: C.cardDark, fontFamily: F.bold,
  },
  footer: {
    fontSize: 12, fontFamily: F.medium, color: C.dim,
    marginTop: 14, letterSpacing: 0.3,
  },
});
