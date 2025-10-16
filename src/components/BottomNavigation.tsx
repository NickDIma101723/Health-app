import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, fontSizes } from '../constants/theme';

type TabType = 'home' | 'mindfulness' | 'chat' | 'schedule' | 'nutrition';

interface TabItem {
  key: TabType;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const tabs: TabItem[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'mindfulness', label: 'Mind', icon: 'self-improvement' },
  { key: 'chat', label: 'Chat', icon: 'chat' },
  { key: 'schedule', label: 'Plan', icon: 'calendar-today' },
  { key: 'nutrition', label: 'Food', icon: 'restaurant' },
];

interface BottomNavigationProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTab = 'home',
  onTabChange 
}) => {
  const [active, setActive] = useState<TabType>(activeTab);

  const handleTabPress = (tab: TabType) => {
    console.log('[BottomNavigation] Tab pressed:', tab);
    setActive(tab);
    if (onTabChange) {
      console.log('[BottomNavigation] Calling onTabChange with:', tab);
      onTabChange(tab);
    } else {
      console.log('[BottomNavigation] WARNING: onTabChange is not defined!');
    }
  };

  return (
    <View style={[styles.container, shadows.lg]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
              <MaterialIcons
                name={tab.icon}
                size={24}
                color={isActive ? colors.surface : colors.textSecondary}
              />
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconContainer: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Quicksand_500Medium',
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
});
