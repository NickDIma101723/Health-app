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
  Image,
  StatusBar,
} from 'react-native';
import {
  MagnifyingGlass,
  X,
  ForkKnife,
  Fire,
  Clock,
  CookingPot,
  Cookie,
  Sun,
  ArrowLeft,
  CheckCircle,
  Users,
  Timer,
  Plus,
  Star,
  ChartBar,
} from 'phosphor-react-native';
import { Recipe, RECIPE_DATABASE, filterRecipesByCalories, filterRecipesByType, searchRecipes } from '../data/recipes';

const { width } = Dimensions.get('window');

const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

const C = {
  bg: '#F8F8F8',
  card: '#FFFFFF',
  dark: '#111111',
  text: '#111111',
  dim: '#999999',
  border: '#F0F0F0',
  green: '#22C55E',
  amber: '#F59E0B',
  blue: '#3B82F6',
  red: '#EF4444',
  teal: '#14B8A6',
  lime: '#D4F940',
};

interface RecipeBrowserProps {
  visible: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  targetCalories?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

const MEAL_TYPE_CONFIG: Record<string, { icon: any; color: string; detailBg: string }> = {
  breakfast: { icon: Sun, color: C.amber, detailBg: '#FFF3E0' },
  lunch: { icon: ForkKnife, color: C.green, detailBg: '#E8F5E9' },
  dinner: { icon: CookingPot, color: C.blue, detailBg: '#F3E5F5' },
  snack: { icon: Cookie, color: '#A855F7', detailBg: '#F3E5F5' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: C.green,
  medium: C.amber,
  hard: C.red,
};

const CARD_THEMES = [
  { bg: '#F0F7E6', imgBg: '#D4C4E8' },
  { bg: '#FEF4E8', imgBg: '#C8DDBE' },
  { bg: '#FFF0F0', imgBg: '#F5C8C8' },
  { bg: '#EEF1FD', imgBg: '#C8D4F0' },
  { bg: '#FDF4FF', imgBg: '#E4C8F0' },
];

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
    if (selectedType !== 'all') {
      recipes = filterRecipesByType(recipes, selectedType);
    }
    if (searchQuery) {
      recipes = searchRecipes(recipes, searchQuery);
    }
    if (targetCalories) {
      recipes = filterRecipesByCalories(recipes, targetCalories);
    }
    return recipes;
  };

  const filteredRecipes = getFilteredRecipes();

  /* ═══════════════════════════════════════
     ── RECIPE DETAIL VIEW ──
     ═══════════════════════════════════════ */

  const renderRecipeDetail = () => {
    if (!selectedRecipe) return null;
    const cfg = MEAL_TYPE_CONFIG[selectedRecipe.type] || MEAL_TYPE_CONFIG.dinner;
    const MIcon = cfg.icon;
    const diffColor = DIFFICULTY_COLORS[selectedRecipe.difficulty] || C.amber;

    return (
      <Modal
        visible={!!selectedRecipe}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedRecipe(null)}
      >
        <View style={[st.dtContainer, { backgroundColor: cfg.detailBg }]}>
          <StatusBar barStyle="dark-content" />

          {/* Back button */}
          <TouchableOpacity style={st.dtBackBtn} onPress={() => setSelectedRecipe(null)}>
            <ArrowLeft size={22} color={C.dark} weight="bold" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Centered image */}
            <View style={st.dtImgWrap}>
              {selectedRecipe.imageUrl ? (
                <Image source={{ uri: selectedRecipe.imageUrl }} style={st.dtImg} />
              ) : (
                <View style={[st.dtImgFallback, { backgroundColor: cfg.color + '30' }]}>
                  <MIcon size={80} color={cfg.color} weight="duotone" />
                </View>
              )}
            </View>

            {/* Title + description */}
            <View style={st.dtInfo}>
              <Text style={st.dtTitle}>{selectedRecipe.name}, {selectedRecipe.calories} Kcal</Text>
              <Text style={st.dtDesc}>{selectedRecipe.description}</Text>
            </View>

            {/* Macro boxes */}
            <View style={st.dtMacroRow}>
              <View style={st.dtMacroBox}>
                <Text style={st.dtMacroLabel}>protein</Text>
                <Text style={st.dtMacroVal}>{selectedRecipe.protein} g</Text>
              </View>
              <View style={st.dtMacroBox}>
                <Text style={st.dtMacroLabel}>fat</Text>
                <Text style={st.dtMacroVal}>{selectedRecipe.fats} g</Text>
              </View>
              <View style={[st.dtMacroBox, { borderRightWidth: 1.5 }]}>
                <Text style={st.dtMacroLabel}>carbs</Text>
                <Text style={st.dtMacroVal}>{selectedRecipe.carbs} g</Text>
              </View>
            </View>

            {/* Ingredients */}
            <View style={st.dtSection}>
              <Text style={st.dtSecTitle}>ingredients:</Text>
              {selectedRecipe.ingredients.map((ing, i) => (
                <View key={i} style={st.dtIngRow}>
                  <View style={st.dtIngDot} />
                  <Text style={st.dtIngText}>{ing}</Text>
                </View>
              ))}
            </View>

            {/* Instructions */}
            <View style={st.dtSection}>
              <Text style={st.dtSecTitle}>instructions:</Text>
              {selectedRecipe.instructions.map((step, i) => (
                <View key={i} style={st.dtStepRow}>
                  <View style={st.dtStepNum}>
                    <Text style={st.dtStepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={st.dtStepText}>{step}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Add button */}
          <View style={st.dtFooter}>
            <TouchableOpacity
              style={st.dtAddBtn}
              activeOpacity={0.85}
              onPress={() => {
                onSelectRecipe(selectedRecipe);
                setSelectedRecipe(null);
                onClose();
              }}
            >
              <Plus size={18} color="#FFF" weight="bold" />
              <Text style={st.dtAddBtnText}>Add to My Meals</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  /* ═══════════════════════════════════════
     ── MAIN BROWSER VIEW ──
     ═══════════════════════════════════════ */

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={st.container}>
          <StatusBar barStyle="dark-content" />

          {/* Recipe Grid */}
          <ScrollView
            style={st.list}
            contentContainerStyle={st.listContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={st.header}>
              <View style={st.headerRow}>
                <View>
                  <Text style={st.headerTitle}>Recipes</Text>
                  <Text style={st.headerSub}>{filteredRecipes.length} recipes found</Text>
                </View>
                <TouchableOpacity style={st.closeBtn} onPress={onClose}>
                  <X size={18} color="#666" weight="bold" />
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View style={st.searchBar}>
                <MagnifyingGlass size={18} color="#AAA" weight="bold" />
                <TextInput
                  style={st.searchInput}
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#BBB"
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color="#AAA" weight="bold" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter Chips */}
            <View style={st.filterBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={st.filterScroll}
              >
                {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => {
                  const active = selectedType === type;
                  const cfg = type !== 'all' ? MEAL_TYPE_CONFIG[type] : null;
                  const Icon = cfg?.icon || ForkKnife;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[st.filterChip, active && st.filterChipActive]}
                      onPress={() => setSelectedType(type)}
                      activeOpacity={0.7}
                    >
                      {type !== 'all' && (
                        <Icon
                          size={14}
                          color={active ? '#FFF' : '#888'}
                          weight={active ? 'fill' : 'regular'}
                        />
                      )}
                      <Text style={[st.filterChipText, active && st.filterChipTextActive]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {filteredRecipes.length === 0 ? (
              <View style={st.empty}>
                <MagnifyingGlass size={48} color="#DDD" weight="regular" />
                <Text style={st.emptyTitle}>No recipes found</Text>
                <Text style={st.emptySub}>Try different filters or search terms</Text>
              </View>
            ) : (
              filteredRecipes.map((recipe, idx) => {
                const cfg = MEAL_TYPE_CONFIG[recipe.type] || MEAL_TYPE_CONFIG.dinner;
                const MIcon = cfg.icon;
                const theme = CARD_THEMES[idx % CARD_THEMES.length];
                const diffColor = DIFFICULTY_COLORS[recipe.difficulty] || C.amber;
                return (
                  <TouchableOpacity
                    key={recipe.id}
                    style={[st.card, { backgroundColor: theme.bg }]}
                    onPress={() => setSelectedRecipe(recipe)}
                    activeOpacity={0.9}
                  >
                    {/* Image zone */}
                    <View style={st.cardImgZone}>
                      <View style={[st.cardImgTint, { backgroundColor: theme.imgBg }]} />
                      <View style={st.cardImgWrap}>
                        {recipe.imageUrl ? (
                          <Image source={{ uri: recipe.imageUrl }} style={st.cardImg} />
                        ) : (
                          <View style={[st.cardImgFallback, { backgroundColor: cfg.color + '18' }]}>
                            <MIcon size={48} color={cfg.color} weight="duotone" />
                          </View>
                        )}
                      </View>
                      {/* Category pill */}
                      <View style={st.cardCatPill}>
                        <MIcon size={14} color="#555" weight="fill" />
                        <Text style={st.cardCatPillText}>
                          {recipe.type.charAt(0).toUpperCase() + recipe.type.slice(1)}
                        </Text>
                      </View>
                    </View>

                    {/* Body */}
                    <View style={st.cardBody}>
                      <Text style={st.cardTitle} numberOfLines={2}>{recipe.name}</Text>
                      <Text style={st.cardDesc} numberOfLines={1}>
                        {recipe.description || `${recipe.type} · ${recipe.calories} calories`}
                      </Text>

                      {/* Bottom info pills */}
                      <View style={st.cardPillRow}>
                        <View style={[st.cardInfoPill, { backgroundColor: '#FFF5E0' }]}>
                          <Fire size={16} color="#F59E0B" weight="fill" />
                          <Text style={[st.cardInfoPillText, { color: '#B47408' }]}>{recipe.calories}</Text>
                        </View>
                        <View style={[st.cardInfoPill, { backgroundColor: '#E8F5E8' }]}>
                          <Clock size={16} color="#4CAF50" weight="fill" />
                          <Text style={[st.cardInfoPillText, { color: '#2E7D32' }]}>{recipe.prepTime + recipe.cookTime} mins</Text>
                        </View>
                        <View style={[st.cardInfoPill, { backgroundColor: diffColor + '15' }]}>
                          <ChartBar size={16} color={diffColor} weight="fill" />
                          <Text style={[st.cardInfoPillText, { color: diffColor }]}>{recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {renderRecipeDetail()}
    </>
  );
};

/* ═══════════════════════════════════════════════════
   ── STYLES ──
   ═══════════════════════════════════════════════════ */

const st = StyleSheet.create({
  /* Container */
  container: { flex: 1, backgroundColor: C.bg },

  /* Header */
  header: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: F.bold,
    fontSize: 28,
    color: C.text,
    letterSpacing: -0.8,
  },
  headerSub: {
    fontFamily: F.medium,
    fontSize: 13,
    color: C.dim,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F3F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 15,
    color: C.text,
    padding: 0,
  },

  /* Filter bar */
  filterBar: {
    paddingVertical: 12,
    marginBottom: 4,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: '#F3F3F3',
  },
  filterChipActive: {
    backgroundColor: C.dark,
  },
  filterChipText: {
    fontFamily: F.semi,
    fontSize: 13,
    color: '#888',
  },
  filterChipTextActive: {
    color: '#FFF',
  },

  /* Recipe list */
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },

  /* Empty state */
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontFamily: F.semi,
    fontSize: 17,
    color: '#BBB',
    marginTop: 16,
  },
  emptySub: {
    fontFamily: F.medium,
    fontSize: 13,
    color: '#CCC',
    marginTop: 4,
  },

  /* Recipe card — inspired by reference design */
  card: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 18,
  },
  cardImgZone: {
    width: '100%',
    height: 220,
    position: 'relative',
    padding: 12,
    paddingBottom: 0,
  },
  cardImgTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '50%',
    height: '100%',
    borderBottomLeftRadius: 60,
  },
  cardImgWrap: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
  },
  cardImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardImgFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCatPill: {
    position: 'absolute',
    top: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    zIndex: 2,
  },
  cardCatPillText: {
    fontFamily: F.semi,
    fontSize: 14,
    color: '#444',
  },
  cardBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  cardTitle: {
    fontFamily: F.bold,
    fontSize: 21,
    color: C.text,
    letterSpacing: -0.4,
    lineHeight: 27,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: F.medium,
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  cardPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  cardInfoPillText: {
    fontFamily: F.bold,
    fontSize: 14,
  },

  /* ═══════════════════════════════════════
     ── DETAIL VIEW STYLES ──
     ═══════════════════════════════════════ */

  dtContainer: { flex: 1 },

  dtBackBtn: {
    position: 'absolute',
    top: 48,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  /* Centered image */
  dtImgWrap: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 8,
  },
  dtImg: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    resizeMode: 'cover',
  },
  dtImgFallback: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Title + desc */
  dtInfo: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  dtTitle: {
    fontFamily: F.bold,
    fontSize: 28,
    color: C.dark,
    letterSpacing: -0.6,
    lineHeight: 34,
    marginBottom: 6,
  },
  dtDesc: {
    fontFamily: F.medium,
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },

  /* Macro boxes */
  dtMacroRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 0,
    marginBottom: 24,
  },
  dtMacroBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.dark,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRightWidth: 0,
  },
  dtMacroLabel: {
    fontFamily: F.medium,
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dtMacroVal: {
    fontFamily: F.bold,
    fontSize: 22,
    color: C.dark,
    letterSpacing: -0.4,
  },

  /* Sections */
  dtSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  dtSecTitle: {
    fontFamily: F.bold,
    fontSize: 22,
    color: C.dark,
    letterSpacing: -0.4,
    marginBottom: 16,
  },

  /* Ingredients */
  dtIngRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  dtIngDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.dark,
    marginTop: 7,
  },
  dtIngText: {
    fontFamily: F.medium,
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },

  /* Steps */
  dtStepRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  dtStepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  dtStepNumText: {
    fontFamily: F.bold,
    fontSize: 14,
    color: '#FFF',
  },
  dtStepText: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },

  /* Footer */
  dtFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
  },
  dtAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.dark,
    height: 56,
    borderRadius: 18,
  },
  dtAddBtnText: {
    fontFamily: F.bold,
    fontSize: 17,
    color: '#FFF',
    letterSpacing: -0.2,
  },
});
