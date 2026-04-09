import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';

// Global memory of where the navigation bar was across screen transitions.
// Since each screen mounts a fresh BottomNavigation component, this allows
// the animation to seamlessly continue from the previous screen's position.
let globalPreviousTabIndex = 0;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH * 0.92;
const TAB_WIDTH = BAR_WIDTH / 5;

type TabType = 'home' | 'schedule' | 'chat' | 'nutrition' | 'mindfulness';

interface BottomNavigationProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

const TABS: Array<{ key: TabType; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { key: 'home', icon: 'home' },
  { key: 'schedule', icon: 'pie-chart-outline' },
  { key: 'chat', icon: 'chat-bubble-outline' },
  { key: 'nutrition', icon: 'access-time' }, // Similar to the clock in the image
  { key: 'mindfulness', icon: 'notifications-none' }, // Similar to the bell in the image
];

/**
 * Single Tab Item Component
 * Handles the bouncing up/down of the icon and crossfades its color
 */
const TabItem = ({ tab, isActive, onPress, tabIndex }: { tab: any; isActive: boolean; onPress: () => void; tabIndex: number }) => {
  // If moving between screens, init the animation from what it was PREVIOUSLY,
  // so the user actually sees the physical icons dropping and popping up on the new screen.
  const initialState = (globalPreviousTabIndex === tabIndex) ? 1 : 0;
  const anim = useRef(new Animated.Value(initialState)).current;

  // Spring animation for the icon jumping into the circle or dropping down
  useEffect(() => {
    Animated.spring(anim, {
      toValue: isActive ? 1 : 0,
      friction: 6,
      tension: 50,
      useNativeDriver: true, // Native driver for opacity and transform
    }).start();
  }, [isActive]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -27] });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={1} style={styles.tabItem}>
      <Animated.View style={{ transform: [{ translateY }], justifyContent: 'center', alignItems: 'center' }}>
        
        {/* Inactive state: Soft grey (textDim) icon */}
        <Animated.View style={{ position: 'absolute', opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <MaterialIcons name={tab.icon} size={26} color="#8A8A9D" />
        </Animated.View>
        
        {/* Active state: White icon */}
        <Animated.View style={{ opacity: anim }}>
          <MaterialIcons name={tab.icon} size={28} color="#FFFFFF" />
        </Animated.View>

      </Animated.View>
    </TouchableOpacity>
  );
};

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTab = 'home', 
  onTabChange 
}) => {
  const insets = useSafeAreaInsets();
  
  const activeIndex = TABS.findIndex((t) => t.key === activeTab);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  
  // INITIALIZE STARTING POSITION AT THE *PREVIOUS* TAB!
  // This physically forces the new screen to launch the animated bar exactly where the old screen left it,
  // creating the illusion of one seamless, continuous rolling animation.
  const slideAnim = useRef(new Animated.Value(globalPreviousTabIndex)).current;

  // Sliding animation for the cutout and the orange circle
  useEffect(() => {
    // A small initial delay makes sure the screen transition started before the ball rolls.
    // This removes any "scumminess" or stutter and keeps it completely buttery smooth.
    const timeout = setTimeout(() => {
      Animated.spring(slideAnim, {
        toValue: safeIndex,
        friction: 8, // smoothed out slightly
        tension: 50,
        // Crucial for performance: we now useNativeDriver completely. 100% 60FPS UI thread!
        useNativeDriver: true, 
      }).start();

      globalPreviousTabIndex = safeIndex;
    }, 50);

    return () => clearTimeout(timeout);
  }, [safeIndex]);

  // Center of the active tab
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [
      0 * TAB_WIDTH + TAB_WIDTH / 2,
      1 * TAB_WIDTH + TAB_WIDTH / 2,
      2 * TAB_WIDTH + TAB_WIDTH / 2,
      3 * TAB_WIDTH + TAB_WIDTH / 2,
      4 * TAB_WIDTH + TAB_WIDTH / 2,
    ]
  });

  // Since circle width is 52, offset by 26 to center it perfectly
  const circleTranslateX = slideAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [
      (0 * TAB_WIDTH + TAB_WIDTH / 2) - 26,
      (1 * TAB_WIDTH + TAB_WIDTH / 2) - 26,
      (2 * TAB_WIDTH + TAB_WIDTH / 2) - 26,
      (3 * TAB_WIDTH + TAB_WIDTH / 2) - 26,
      (4 * TAB_WIDTH + TAB_WIDTH / 2) - 26,
    ]
  });

  // Make the ball visually roll as it translates to create that liquid motion effect
  const circleRotate = slideAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ['0deg', '180deg', '360deg', '540deg', '720deg']
  });

  const BAR_COLOR = "#1A1A24"; // Sleek dark slate (matches app's main text color)

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 24) }]} pointerEvents="box-none">
      <View style={styles.barContainer}>
        
        {/* Hardware-accelerated clip container for the native driver */}
        <View style={styles.clipContainer}>
           <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, transform: [{ translateX }] }}>
              <Svg width={2104} height={70} viewBox="-1052 0 2104 70" style={{ position: 'absolute', left: -1052 }}>
                 {/* Left solid block */}
                 <Rect x={-1052} y={0} width={1000} height={70} fill={BAR_COLOR} />
                 
                 {/* The Curved "U" Cutout */}
                 <Path 
                    d="M -52 0 C -34 0 -22 40 0 40 C 22 40 34 0 52 0 L 52 70 L -52 70 Z" 
                    fill={BAR_COLOR} 
                 />
                 
                 {/* Right solid block */}
                 <Rect x={52} y={0} width={1000} height={70} fill={BAR_COLOR} />
              </Svg>
           </Animated.View>
        </View>

        {/* The Floating Sliding Orange Circle */}
        {/* This lives OVER the SVG (no clipping here) so it sticks out beautifully */}
        <Animated.View style={[styles.slidingCircle, { transform: [{ translateX: circleTranslateX }, { rotate: circleRotate }] }]}>
          <View style={styles.circleSolid}>
             {/* A tiny subtle highlight inside the ball so the user can visually see it "rolling" */}
             <View style={styles.rollHighlight} />
          </View>
        </Animated.View>

        {/* The Touch Areas and Icons */}
        <View style={StyleSheet.absoluteFillObject}>
          <View style={styles.tabsRow}>
             {TABS.map((tab, index) => (
               <TabItem 
                 key={tab.key} 
                 tab={tab} 
                 tabIndex={index}
                 isActive={activeTab === tab.key} 
                 onPress={() => onTabChange?.(tab.key)} 
               />
             ))}
          </View>
        </View>

      </View>
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
  barContainer: {
    width: BAR_WIDTH,
    height: 70,
    shadowColor: '#1A1A24', // Dark shadow
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 15,
  },
  clipContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24, // Maintains the perfect pill shape at the edges
    overflow: 'hidden',
  },
  slidingCircle: {
    position: 'absolute',
    top: -18, // Adjusted to match the image precisely
    left: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSolid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF477E', // Vibrant pink accent from HomeScreen
    borderRadius: 26,
    shadowColor: '#FF477E', // Glowing shadow matching the ball
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden', // Ensure the highlight stays inside the curve
  },
  rollHighlight: {
    position: 'absolute',
    top: 4,
    right: 8,
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Smooth glare point on the "ball" so you can watch it roll
    transform: [{ rotate: '25deg' }]
  },
  tabsRow: {
    flex: 1, 
    flexDirection: 'row',
  },
  tabItem: {
    width: TAB_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2, // Icons live inside here, they pop up into the circle
  }
});
