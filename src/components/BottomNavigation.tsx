import React, { useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInUp,
} from 'react-native-reanimated';
import { PlatformPressable } from './AnimatedPressable';

export type TabType = 'home' | 'schedule' | 'chat' | 'nutrition' | 'mindfulness';

interface BottomNavigationProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

const TABS: Array<{ key: TabType; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { key: 'home', icon: 'home' },
  { key: 'schedule', icon: 'pie-chart-outline' },
  { key: 'chat', icon: 'chat-bubble-outline' },
  { key: 'nutrition', icon: 'access-time' },
  { key: 'mindfulness', icon: 'notifications-none' },
];

/** Animated tab icon — scales up when active via reanimated spring */
const TabIcon: React.FC<{
  icon: keyof typeof MaterialIcons.glyphMap;
  isActive: boolean;
  onPress: () => void;
}> = ({ icon, isActive, onPress }) => {
  const scale = useSharedValue(isActive ? 1.15 : 1);

  React.useEffect(() => {
    scale.value = withSpring(isActive ? 1.15 : 1, { damping: 14, stiffness: 300 });
  }, [isActive]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <PlatformPressable
      onPress={onPress}
      style={styles.tabItem}
      pressScale={0.85}
      rippleColor="rgba(255, 255, 255, 0.15)"
    >
      <Animated.View style={iconAnimStyle}>
        <MaterialIcons
          name={icon}
          size={28}
          color={isActive ? '#FFFFFF' : '#8E8E93'}
        />
      </Animated.View>
      {isActive && <View style={styles.activeIndicator} />}
    </PlatformPressable>
  );
};

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab = 'home',
  onTabChange,
}) => {
  const insets = useSafeAreaInsets();

  const handleTabChange = useCallback(
    (tab: TabType) => onTabChange?.(tab),
    [onTabChange],
  );

  const pillContent = (
    <>
      {TABS.map((tab) => (
        <TabIcon
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
      pointerEvents="box-none"
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={60} tint="dark" style={styles.pillContainer}>
          {pillContent}
        </BlurView>
      ) : (
        <View style={[styles.pillContainer, styles.androidPill]}>
          {pillContent}
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  pillContainer: {
    flexDirection: 'row',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '85%',
    overflow: 'hidden',
    // iOS blur container — no opaque background needed
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 14,
  },
  androidPill: {
    backgroundColor: '#000000',
  },
  tabItem: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    overflow: 'hidden',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
});
