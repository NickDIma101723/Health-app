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
          {/* Header */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Recipe Browser</Text>
              <View style={{ width: 40 }} />
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
                  <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Type Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
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
          </LinearGradient>

          {/* Results */}
          <ScrollView style={styles.resultsScroll}>
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
                    <View style={styles.recipeCardHeader}>
                      <View style={styles.recipeCardInfo}>
                        <Text style={styles.recipeCardTitle}>{recipe.name}</Text>
                        <Text style={styles.recipeCardDescription} numberOfLines={2}>
                          {recipe.description}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.difficultyText,
                          { color: getDifficultyColor(recipe.difficulty) },
                        ]}
                      >
                        {recipe.difficulty}
                      </Text>
                    </View>

                    <View style={styles.recipeCardStats}>
                      <View style={styles.recipeCardStat}>
                        <MaterialIcons name="local-fire-department" size={16} color={colors.accent} />
                        <Text style={styles.recipeCardStatText}>{recipe.calories} cal</Text>
                      </View>
                      <View style={styles.recipeCardStat}>
                        <MaterialIcons name="timer" size={16} color={colors.primary} />
                        <Text style={styles.recipeCardStatText}>
                          {recipe.prepTime + recipe.cookTime} min
                        </Text>
                      </View>
                      <View style={styles.recipeCardStat}>
                        <MaterialIcons name="restaurant-menu" size={16} color={colors.teal} />
                        <Text style={styles.recipeCardStatText}>
                          P: {recipe.protein}g C: {recipe.carbs}g F: {recipe.fats}g
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recipeCardTags}>
                      {recipe.tags.slice(0, 3).map(tag => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_500Medium',
  },
  filterScroll: {
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.textLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContainer: {
    padding: spacing.lg,
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
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  recipeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recipeCardInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  recipeCardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: 'Poppins_700Bold',
  },
  recipeCardDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Quicksand_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recipeCardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  recipeCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipeCardStatText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  recipeCardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  tagText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
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
