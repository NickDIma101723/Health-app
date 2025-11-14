import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSizes, borderRadius } from '../constants/theme';
import { Recipe, RECIPE_DATABASE, filterRecipesByCalories, filterRecipesByType, searchRecipes } from '../data/recipes';

interface RecipeBrowserProps {
  visible: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  targetCalories?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

const { width } = Dimensions.get('window');

export const RecipeBrowser: React.FC<RecipeBrowserProps> = ({
  visible,
  onClose,
  onSelectRecipe,
  targetCalories,
  mealType,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>(
    mealType || 'all'
  );
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const getFilteredRecipes = (): Recipe[] => {
    let recipes = RECIPE_DATABASE;

    // Filter by type
    if (selectedType !== 'all') {
      recipes = filterRecipesByType(recipes, selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      recipes = searchRecipes(recipes, searchQuery);
    }

    // Filter by calories if provided
    if (targetCalories) {
      recipes = filterRecipesByCalories(recipes, targetCalories);
    }

    return recipes;
  };

  const filteredRecipes = getFilteredRecipes();

  const getDifficultyColor = (difficulty: Recipe['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return colors.success;
      case 'medium':
        return colors.accent;
      case 'hard':
        return colors.error;
    }
  };

  const renderRecipeDetail = () => {
    if (!selectedRecipe) return null;

    return (
      <Modal
        visible={!!selectedRecipe}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedRecipe(null)}
      >
        <View style={styles.detailContainer}>
          <ScrollView style={styles.detailScroll}>
            {/* Header */}
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.detailHeader}
            >
              <View style={styles.detailHeaderContent}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSelectedRecipe(null)}
                >
                  <MaterialIcons name="arrow-back" size={24} color={colors.textLight} />
                </TouchableOpacity>
                <Text style={styles.detailTitle}>{selectedRecipe.name}</Text>
                <View style={{ width: 40 }} />
              </View>
            </LinearGradient>

            {/* Description */}
            <View style={styles.detailSection}>
              <Text style={styles.detailDescription}>{selectedRecipe.description}</Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="local-fire-department" size={24} color={colors.accent} />
                <Text style={styles.statValue}>{selectedRecipe.calories}</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="timer" size={24} color={colors.primary} />
                <Text style={styles.statValue}>
                  {selectedRecipe.prepTime + selectedRecipe.cookTime}
                </Text>
                <Text style={styles.statLabel}>Minutes</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="restaurant" size={24} color={colors.teal} />
                <Text style={styles.statValue}>{selectedRecipe.servings}</Text>
                <Text style={styles.statLabel}>Servings</Text>
              </View>
            </View>

            {/* Macros */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Nutrition Per Serving</Text>
              <View style={styles.macrosGrid}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{selectedRecipe.protein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{selectedRecipe.carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{selectedRecipe.fats}g</Text>
                  <Text style={styles.macroLabel}>Fats</Text>
                </View>
              </View>
            </View>

            {/* Ingredients */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {selectedRecipe.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.listItem}>
                  <MaterialIcons name="check-circle" size={20} color={colors.success} />
                  <Text style={styles.listItemText}>{ingredient}</Text>
                </View>
              ))}
            </View>

            {/* Instructions */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              {selectedRecipe.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <Text style={styles.instructionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Add to Meal Button */}
          <View style={styles.detailFooter}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                onSelectRecipe(selectedRecipe);
                setSelectedRecipe(null);
                onClose();
              }}
            >
              <LinearGradient
                colors={[colors.success, colors.teal]}
                style={styles.addButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="add-circle" size={24} color={colors.textLight} />
                <Text style={styles.addButtonText}>Add to My Meals</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Compact Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerTitleSection}>
                <MaterialIcons name="restaurant-menu" size={28} color={colors.primary} />
                <Text style={styles.headerTitle}>Recipe Browser</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search recipes..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.textSecondary}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Type Filter - Below Header */}
          <View style={styles.filterSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
              {['all', 'breakfast', 'lunch', 'dinner', 'snack'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    selectedType === type && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedType(type as any)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedType === type && styles.filterChipTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.resultsCountBadge}>
              <Text style={styles.resultsCount}>{filteredRecipes.length}</Text>
            </View>
          </View>

          {/* Results */}
          <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsScrollContent}>
            <View style={styles.resultsContainer}>
              {filteredRecipes.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="search-off" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyStateText}>No recipes found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Try adjusting your filters or search terms
                  </Text>
                </View>
              ) : (
                filteredRecipes.map(recipe => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={styles.recipeCard}
                    onPress={() => setSelectedRecipe(recipe)}
                  >
                    <View style={styles.recipeCardTop}>
                      <Text style={styles.recipeCardTitle} numberOfLines={2}>
                        {recipe.name}
                      </Text>
                      <View style={styles.recipeCardBadges}>
                        <View
                          style={[
                            styles.difficultyChip,
                            { backgroundColor: getDifficultyColor(recipe.difficulty) + '20', borderColor: getDifficultyColor(recipe.difficulty) },
                          ]}
                        >
                          <Text style={[styles.difficultyChipText, { color: getDifficultyColor(recipe.difficulty) }]}>
                            {recipe.difficulty}
                          </Text>
                        </View>
                        <View style={styles.calorieChip}>
                          <MaterialIcons name="local-fire-department" size={16} color={colors.accent} />
                          <Text style={styles.calorieChipText}>{recipe.calories}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.recipeCardMeta}>
                      <View style={styles.recipeMetaItem}>
                        <View style={styles.metaIconCircle}>
                          <MaterialIcons name="schedule" size={14} color={colors.primary} />
                        </View>
                        <Text style={styles.recipeMetaText}>{recipe.prepTime + recipe.cookTime} min</Text>
                      </View>
                      <View style={styles.recipeMetaItem}>
                        <View style={styles.metaIconCircle}>
                          <MaterialIcons name="restaurant-menu" size={14} color={colors.teal} />
                        </View>
                        <Text style={styles.recipeMetaText}>{recipe.servings} servings</Text>
                      </View>
                    </View>

                    <View style={styles.recipeMacrosSection}>
                      <Text style={styles.macrosLabel}>Macros</Text>
                      <View style={styles.macrosGrid}>
                        <View style={styles.macroItem}>
                          <View style={[styles.macroIconBadge, { backgroundColor: colors.primary + '15' }]}>
                            <MaterialIcons name="fitness-center" size={14} color={colors.primary} />
                          </View>
                          <Text style={styles.macroValue}>{recipe.protein}g</Text>
                          <Text style={styles.macroLabel}>Protein</Text>
                        </View>
                        <View style={styles.macroItem}>
                          <View style={[styles.macroIconBadge, { backgroundColor: colors.secondary + '15' }]}>
                            <MaterialIcons name="grain" size={14} color={colors.secondary} />
                          </View>
                          <Text style={styles.macroValue}>{recipe.carbs}g</Text>
                          <Text style={styles.macroLabel}>Carbs</Text>
                        </View>
                        <View style={styles.macroItem}>
                          <View style={[styles.macroIconBadge, { backgroundColor: colors.purple + '15' }]}>
                            <MaterialIcons name="water-drop" size={14} color={colors.purple} />
                          </View>
                          <Text style={styles.macroValue}>{recipe.fats}g</Text>
                          <Text style={styles.macroLabel}>Fats</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {renderRecipeDetail()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_500Medium',
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScrollContent: {
    paddingRight: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  filterChipTextActive: {
    color: colors.textLight,
  },
  resultsCountBadge: {
    marginLeft: spacing.md,
    marginRight: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 32,
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
  },
  resultsScroll: {
    flex: 1,
  },
  resultsScrollContent: {
    padding: spacing.md,
  },
  resultsContainer: {
    gap: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyStateText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    fontFamily: 'Quicksand_600SemiBold',
  },
  emptyStateSubtext: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: 'Quicksand_500Medium',
  },
  recipeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  recipeCardTop: {
    marginBottom: spacing.sm,
  },
  recipeCardTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  recipeCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  difficultyChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  difficultyChipText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    fontFamily: 'Quicksand_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calorieChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  calorieChipText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.accent,
    fontFamily: 'Poppins_700Bold',
  },
  recipeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  recipeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeMetaText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  recipeMacrosSection: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  macrosLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: 'Quicksand_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  macroIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroValue: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  macroLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  macroBarDot: {
    fontSize: fontSizes.sm,
    color: colors.border,
    fontFamily: 'Quicksand_600SemiBold',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailScroll: {
    flex: 1,
  },
  detailHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  detailHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTitle: {
    flex: 1,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textLight,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
  },
  detailSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailDescription: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
    fontFamily: 'Quicksand_500Medium',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
    fontFamily: 'Poppins_700Bold',
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
    fontFamily: 'Quicksand_500Medium',
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    fontFamily: 'Quicksand_600SemiBold',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
  },
  macroLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: 'Quicksand_500Medium',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  listItemText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    lineHeight: 20,
    fontFamily: 'Quicksand_500Medium',
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  instructionText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    lineHeight: 20,
    fontFamily: 'Quicksand_500Medium',
  },
  detailFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  addButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  addButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
});
