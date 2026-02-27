import React, { useCallback } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInUp,
} from 'react-native-reanimated';
import { PlatformPressable } from './AnimatedPressable';

const { width } = Dimensions.get('window');

type CoachTabType = 'dashboard' | 'schedule' | 'chat' | 'requests' | 'profile';

interface CoachBottomNavigationProps {
  activeTab?: CoachTabType;
  onTabChange?: (tab: CoachTabType) => void;
}

const TABS: Array<{ key: CoachTabType; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'dashboard', icon: 'grid' },
  { key: 'schedule', icon: 'calendar' },
  { key: 'requests', icon: 'people' },
  { key: 'chat', icon: 'chatbubbles' },
  { key: 'profile', icon: 'person' },
];

/** Animated tab icon with reanimated spring scale */
const CoachTabIcon: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
}> = ({ icon, isActive, onPress }) => {
  const scale = useSharedValue(isActive ? 1.1 : 1);

  React.useEffect(() => {
    scale.value = withSpring(isActive ? 1.1 : 1, { damping: 14, stiffness: 300 });
  }, [isActive]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <PlatformPressable
      onPress={onPress}
      style={styles.tabItem}
      pressScale={0.85}
      rippleColor="rgba(204, 255, 0, 0.2)"
    >
      <Animated.View style={[styles.iconBox, isActive && styles.activeIconBox, iconAnimStyle]}>
        <Ionicons 
          name={icon} 
          size={24} 
          color={isActive ? '#121212' : '#A1A1AA'} 
        />
      </Animated.View>
    </PlatformPressable>
  );
};

export const CoachBottomNavigation: React.FC<CoachBottomNavigationProps> = ({ 
  activeTab = 'dashboard', 
  onTabChange 
}) => {
  const insets = useSafeAreaInsets();

  const handleTabChange = useCallback(
    (tab: CoachTabType) => onTabChange?.(tab),
    [onTabChange],
  );

  const tabContent = (
    <>
      {TABS.map((tab) => (
        <CoachTabIcon
          key={tab.key}
          icon={tab.icon}
          isActive={activeTab === tab.key}
          onPress={() => handleTabChange(tab.key)}
        />
      ))}
    </>
  );

  return (
    <Animated.View
      entering={FadeInUp.delay(400).duration(600).springify()}
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 24) }]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={60} tint="dark" style={styles.container}>
          {tabContent}
        </BlurView>
      ) : (
        <View style={[styles.container, styles.androidContainer]}>
          {tabContent}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18, 18, 18, 0.7)',
    width: width * 0.9,
    height: 72,
    borderRadius: 36,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 15,
  },
  androidContainer: {
    backgroundColor: '#121212',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    borderRadius: 26,
    overflow: 'hidden',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeIconBox: {
    backgroundColor: '#CCFF00',
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  }
});
