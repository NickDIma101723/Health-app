import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { SquaresFour, CalendarBlank, UsersThree, ChatCircle, UserCircle } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PlatformPressable } from './AnimatedPressable';

const { width } = Dimensions.get('window');

type CoachTabType = 'dashboard' | 'schedule' | 'chat' | 'requests' | 'profile';

interface CoachBottomNavigationProps {
  activeTab?: CoachTabType;
  onTabChange?: (tab: CoachTabType) => void;
}

const LIME = '#D4F940';
const DARK = '#111111';

const TABS: { key: CoachTabType; icon: React.ComponentType<any>; label: string }[] = [
  { key: 'dashboard', icon: SquaresFour, label: 'Board' },
  { key: 'schedule', icon: CalendarBlank, label: 'Plan' },
  { key: 'requests', icon: UsersThree, label: 'Clients' },
  { key: 'chat', icon: ChatCircle, label: 'Chat' },
  { key: 'profile', icon: UserCircle, label: 'Profile' },
];

const CoachTabIcon: React.FC<{
  tab: (typeof TABS)[number];
  isActive: boolean;
  onPress: () => void;
}> = ({ tab, isActive, onPress }) => {
  const scale = useSharedValue(isActive ? 1.05 : 1);

  React.useEffect(() => {
    scale.value = withSpring(isActive ? 1.05 : 1, { damping: 14, stiffness: 300 });
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const Icon = tab.icon;

  return (
    <PlatformPressable
      onPress={onPress}
      style={styles.tabItem}
      pressScale={0.85}
      rippleColor="rgba(212, 249, 64, 0.2)"
    >
      <Animated.View style={[styles.iconBox, isActive && styles.activeIconBox, animStyle]}>
        <Icon
          size={20}
          color={isActive ? DARK : '#71717A'}
          weight={isActive ? 'fill' : 'regular'}
        />
      </Animated.View>
      {isActive && <Text style={styles.tabLabel}>{tab.label}</Text>}
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

  const content = (
    <>
      {TABS.map((tab) => (
        <CoachTabIcon
          key={tab.key}
          tab={tab}
          isActive={activeTab === tab.key}
          onPress={() => handleTabChange(tab.key)}
        />
      ))}
    </>
  );

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom + 16, 32), paddingTop: 32 }]}
      pointerEvents="box-none"
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={60} tint="dark" style={styles.pill}>
          {content}
        </BlurView>
      ) : (
        <View style={[styles.pill, styles.androidPill]}>
          {content}
        </View>
      )}
    </View>
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
  pill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(17, 17, 17, 0.75)',
    width: width * 0.92,
    height: 72,
    borderRadius: 36,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  androidPill: {
    backgroundColor: DARK,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    borderRadius: 24,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeIconBox: {
    backgroundColor: LIME,
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  tabLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: LIME,
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
