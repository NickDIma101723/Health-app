import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

interface LottieAnimationProps {
  /** Lottie JSON source — use require('./path.json') */
  source: any;
  /** Width/height of the animation container */
  size?: number;
  /** Autoplay on mount (default true) */
  autoPlay?: boolean;
  /** Loop the animation (default true) */
  loop?: boolean;
  /** Playback speed multiplier (default 1) */
  speed?: number;
  style?: StyleProp<ViewStyle>;
  /** Ref for imperative control (play/pause/reset) */
  lottieRef?: React.RefObject<LottieView>;
}

/**
 * Lottie animation wrapper for high-fidelity vector animations.
 *
 * Usage:
 *   <LottieAnimation source={require('../assets/animations/success.json')} size={120} />
 *
 * For imperative control:
 *   const ref = useRef<LottieView>(null);
 *   ref.current?.play();
 *   ref.current?.reset();
 */
export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  source,
  size = 120,
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
  lottieRef,
}) => {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <LottieView
        ref={lottieRef}
        source={source}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{ width: size, height: size }}
      />
    </View>
  );
};
