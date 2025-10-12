import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, fontSizes } from '../constants/theme';

type CoachTabType = 'coach-dashboard' | 'chat' | 'profile';

interface TabItem {
  key: CoachTabType;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const coachTabs: TabItem[] = [
  { key: 'coach-dashboard', label: 'Clients', icon: 'people' },
  { key: 'chat', label: 'Chat', icon: 'chat' },
  { key: 'profile', label: 'Profile', icon: 'person' },
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

  const handleTabPress = (tab: CoachTabType) => {
    setActive(tab);
    onTabChange?.(tab);
  };

  return (
    <View style={[styles.container, shadows.lg]}>
      {coachTabs.map((tab) => {
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
