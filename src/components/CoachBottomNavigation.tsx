import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, shadows, fontSizes, animations, gradients } from '../constants/theme';

type CoachTabType = 'coach-dashboard' | 'chat' | 'profile';

interface TabItem {
  key: CoachTabType;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  gradient: string[];
}

const coachTabs: TabItem[] = [
  { key: 'coach-dashboard', label: 'Clients', icon: 'people', color: colors.primary, gradient: gradients.primary },
  { key: 'chat', label: 'Chat', icon: 'chat', color: colors.teal, gradient: gradients.ocean },
  { key: 'profile', label: 'Profile', icon: 'person', color: colors.purple, gradient: gradients.purple },
];

interface CoachBottomNavigationProps {
  activeTab?: CoachTabType;
  onTabChange?: (tab: CoachTabType) => void;
}

export const CoachBottomNavigation: React.FC<CoachBottomNavigationProps> = ({ 
  activeTab = 'coach-dashboard',
  onTabChange 
}) => {
  const [active, setActive] = useState<CoachTabType>(activeTab);
  const [containerWidth, setContainerWidth] = useState(0);
  const scaleAnims = useRef(coachTabs.map(() => new Animated.Value(1))).current;
  const rotateAnims = useRef(coachTabs.map(() => new Animated.Value(0))).current;
  const slideAnim = useRef(new Animated.Value(coachTabs.findIndex(t => t.key === activeTab))).current;

  // Sync with external activeTab changes
  useEffect(() => {
    if (activeTab !== active) {
      const newIndex = coachTabs.findIndex(tab => tab.key === activeTab);
      if (newIndex !== -1) {
        setActive(activeTab);
        Animated.spring(slideAnim, {
          toValue: newIndex,
          tension: 50,
          friction: 7,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [activeTab]);

  const handleTabPress = (tab: CoachTabType, index: number) => {
    // Bounce and rotate animation
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scaleAnims[index], {
          toValue: 1.2,
          tension: 100,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[index], {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(rotateAnims[index], {
          toValue: 1,
          duration: animations.medium,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnims[index], {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Slide indicator animation
    Animated.spring(slideAnim, {
      toValue: index,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();

    setActive(tab);
    onTabChange?.(tab);
  };

  const tabWidth = containerWidth / coachTabs.length;
  const indicatorTranslateX = slideAnim.interpolate({
    inputRange: coachTabs.map((_, i) => i),
    outputRange: coachTabs.map((_, i) => i * tabWidth),
  });

  return (
    <View 
      style={[styles.container, shadows.lg]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              width: tabWidth,
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />
      )}
      <View style={styles.innerContainer}>
        {coachTabs.map((tab, index) => {
          const isActive = active === tab.key;
          const rotate = rotateAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
          });
          
          return (
            <Animated.View
              key={tab.key}
              style={[styles.tabWrapper, { transform: [{ scale: scaleAnims[index] }] }]}
            >
              <TouchableOpacity
                style={styles.tab}
                onPress={() => handleTabPress(tab.key, index)}
                activeOpacity={0.9}
              >
                <Animated.View style={[styles.iconContainer, { transform: [{ rotate }] }]}>
                  {isActive ? (
                    <LinearGradient
                      colors={tab.gradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.gradientBackground}
                    >
                      <MaterialIcons
                        name={tab.icon}
                        size={26}
                        color={colors.surface}
                      />
                    </LinearGradient>
                  ) : (
                    <MaterialIcons
                      name={tab.icon}
                      size={24}
                      color={colors.textSecondary}
                    />
                  )}
                </Animated.View>
                <Text style={[styles.label, isActive && { color: tab.color }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  innerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  tabWrapper: {
    flex: 1,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    position: 'relative',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    backgroundColor: 'transparent',
  },
  gradientBackground: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: 'Quicksand_500Medium',
    marginTop: 2,
  },
  slidingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
});
