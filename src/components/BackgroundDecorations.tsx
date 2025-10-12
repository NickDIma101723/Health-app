import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Path, Ellipse, Line } from 'react-native-svg';
import { colors } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export const BackgroundDecorations: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      <Svg style={styles.topRight} width={200} height={200}>
        <Circle cx="150" cy="50" r="60" fill={colors.primaryPale} opacity={0.6} />
        <Circle cx="180" cy="80" r="30" fill={colors.primaryLight} opacity={0.5} />
      </Svg>

      <Svg style={styles.topLeft} width={150} height={150}>
        <Path
          d="M 0 50 Q 50 30, 100 50"
          stroke={colors.primary}
          strokeWidth="2"
          fill="none"
          opacity={0.35}
        />
        <Path
          d="M 0 70 Q 50 50, 100 70"
          stroke={colors.primaryLight}
          strokeWidth="2"
          fill="none"
          opacity={0.4}
        />
      </Svg>

      <Svg style={styles.middleWave} width={width} height={100}>
        <Path
          d={`M 0 50 Q ${width / 4} 20, ${width / 2} 50 T ${width} 50`}
          stroke={colors.primaryPale}
          strokeWidth="3"
          fill="none"
          opacity={0.45}
        />
      </Svg>

      <Svg style={styles.bottomLeft} width={180} height={180}>
        <Ellipse cx="60" cy="120" rx="70" ry="50" fill={colors.mint} opacity={0.3} />
        <Circle cx="90" cy="100" r="40" fill={colors.primaryLight} opacity={0.35} />
      </Svg>

      <Svg style={styles.bottomRight} width={120} height={120}>
        <Circle cx="20" cy="80" r="8" fill={colors.primary} opacity={0.35} />
        <Circle cx="60" cy="60" r="6" fill={colors.primaryLight} opacity={0.4} />
        <Circle cx="90" cy="90" r="10" fill={colors.mint} opacity={0.35} />
        <Circle cx="40" cy="100" r="5" fill={colors.primary} opacity={0.3} />
      </Svg>

      <Svg style={styles.scatteredDots} width={width} height={height}>
        <Circle cx={width * 0.3} cy={height * 0.25} r="4" fill={colors.primary} opacity={0.3} />
        <Circle cx={width * 0.7} cy={height * 0.35} r="3" fill={colors.mint} opacity={0.35} />
        <Circle cx={width * 0.15} cy={height * 0.5} r="5" fill={colors.primaryLight} opacity={0.32} />
        <Circle cx={width * 0.85} cy={height * 0.6} r="4" fill={colors.primary} opacity={0.28} />
        <Circle cx={width * 0.4} cy={height * 0.7} r="3" fill={colors.mint} opacity={0.3} />
      </Svg>

      <Svg style={styles.connectingLines} width={width} height={height}>
        <Line
          x1={width * 0.2}
          y1={height * 0.3}
          x2={width * 0.4}
          y2={height * 0.35}
          stroke={colors.primary}
          strokeWidth="1"
          opacity={0.25}
        />
        <Line
          x1={width * 0.6}
          y1={height * 0.4}
          x2={width * 0.8}
          y2={height * 0.42}
          stroke={colors.primaryLight}
          strokeWidth="1"
          opacity={0.28}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  topRight: {
    position: 'absolute',
    top: -30,
    right: -50,
  },
  topLeft: {
    position: 'absolute',
    top: 80,
    left: -20,
  },
  middleWave: {
    position: 'absolute',
    top: '35%',
    left: 0,
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 150,
    left: -40,
  },
  bottomRight: {
    position: 'absolute',
    bottom: 100,
    right: -20,
  },
  scatteredDots: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  connectingLines: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
