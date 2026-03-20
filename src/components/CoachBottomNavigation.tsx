import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export const CoachBottomNavigation: React.FC<CoachBottomNavigationProps> = ({ 
  activeTab = 'dashboard', 
  onTabChange 
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabChange?.(tab.key)}
              style={styles.tabItem}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, isActive && styles.activeIconBox]}>
                <Ionicons 
                  name={tab.icon} 
                  size={24} 
                  color={isActive ? '#121212' : '#A1A1AA'} 
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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
    backgroundColor: '#121212',
    width: width * 0.9,
    height: 72,
    borderRadius: 36,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 15,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
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
