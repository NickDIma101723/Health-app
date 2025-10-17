export interface Recipe {
  id: string;
  name: string;
  description: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: string[];
  instructions: string[];
  tags: string[];
  imageUrl?: string;
  nutritionInfo?: {
    fiber?: number;
    sugar?: number;
    sodium?: number;
    cholesterol?: number;
  };
}

export const RECIPE_DATABASE: Recipe[] = [
  // Breakfast Recipes
  {
    id: 'recipe-1',
    name: 'Protein Power Smoothie Bowl',
    description: 'A nutrient-dense smoothie bowl packed with fruits and protein',
    type: 'breakfast',
    calories: 350,
    protein: 25,
    carbs: 45,
    fats: 8,
    prepTime: 10,
    cookTime: 0,
    servings: 1,
    difficulty: 'easy',
    ingredients: [
      '1 frozen banana',
      '1/2 cup frozen mixed berries',
      '1 scoop vanilla protein powder',
      '1/2 cup Greek yogurt',
      '1/4 cup almond milk',
      '1 tbsp chia seeds',
      'Toppings: granola, fresh berries, sliced almonds',
    ],
    instructions: [
      'Add frozen banana, berries, protein powder, Greek yogurt, and almond milk to blender',
      'Blend until smooth and creamy',
      'Pour into bowl',
      'Top with chia seeds, granola, fresh berries, and sliced almonds',
      'Serve immediately',
    ],
    tags: ['high-protein', 'vegetarian', 'quick', 'post-workout'],
  },
  {
    id: 'recipe-2',
    name: 'Avocado Toast with Poached Eggs',
    description: 'Classic healthy breakfast with healthy fats and protein',
    type: 'breakfast',
    calories: 420,
    protein: 18,
    carbs: 35,
    fats: 24,
    prepTime: 5,
    cookTime: 10,
    servings: 1,
    difficulty: 'easy',
    ingredients: [
      '2 slices whole grain bread',
      '1 ripe avocado',
      '2 eggs',
      'Cherry tomatoes',
      'Salt, pepper, red pepper flakes',
      'Lemon juice',
    ],
    instructions: [
      'Toast the bread until golden brown',
      'Bring water to boil for poaching eggs',
      'Mash avocado with lemon juice, salt, and pepper',
      'Poach eggs in simmering water for 3-4 minutes',
      'Spread avocado on toast',
      'Top with poached eggs and cherry tomatoes',
      'Season with red pepper flakes',
    ],
    tags: ['healthy-fats', 'vegetarian', 'balanced'],
  },
  {
    id: 'recipe-3',
    name: 'Overnight Oats with Berries',
    description: 'Make-ahead breakfast that\'s ready when you wake up',
    type: 'breakfast',
    calories: 320,
    protein: 12,
    carbs: 52,
    fats: 7,
    prepTime: 5,
    cookTime: 0,
    servings: 1,
    difficulty: 'easy',
    ingredients: [
      '1/2 cup rolled oats',
      '1/2 cup almond milk',
      '1/4 cup Greek yogurt',
      '1 tbsp chia seeds',
      '1 tbsp maple syrup',
      '1/2 cup mixed berries',
      '1 tbsp sliced almonds',
    ],
    instructions: [
      'In a jar, combine oats, almond milk, yogurt, chia seeds, and maple syrup',
      'Stir well to combine',
      'Cover and refrigerate overnight (or at least 4 hours)',
      'In the morning, top with berries and almonds',
      'Enjoy cold or heat slightly if preferred',
    ],
    tags: ['meal-prep', 'vegetarian', 'high-fiber', 'no-cook'],
  },

  // Lunch Recipes
  {
    id: 'recipe-4',
    name: 'Grilled Chicken Caesar Salad',
    description: 'A lighter take on the classic Caesar with grilled chicken',
    type: 'lunch',
    calories: 450,
    protein: 40,
    carbs: 25,
    fats: 22,
    prepTime: 15,
    cookTime: 15,
    servings: 2,
    difficulty: 'medium',
    ingredients: [
      '2 chicken breasts',
      '6 cups romaine lettuce',
      '1/4 cup parmesan cheese',
      '1 cup cherry tomatoes',
      '1/2 cup whole grain croutons',
      'Light Caesar dressing',
      'Olive oil, salt, pepper',
    ],
    instructions: [
      'Season chicken with salt, pepper, and olive oil',
      'Grill chicken for 6-7 minutes per side until cooked through',
      'Let chicken rest, then slice',
      'Chop romaine lettuce and add to large bowl',
      'Add cherry tomatoes, croutons, and parmesan',
      'Top with sliced chicken',
      'Drizzle with Caesar dressing',
      'Toss and serve',
    ],
    tags: ['high-protein', 'low-carb', 'grilled'],
  },
  {
    id: 'recipe-5',
    name: 'Quinoa Buddha Bowl',
    description: 'Colorful, nutrient-packed vegetarian bowl',
    type: 'lunch',
    calories: 480,
    protein: 18,
    carbs: 65,
    fats: 16,
    prepTime: 15,
    cookTime: 20,
    servings: 2,
    difficulty: 'easy',
    ingredients: [
      '1 cup quinoa',
      '2 cups vegetable broth',
      '1 cup chickpeas',
      '2 cups mixed vegetables (broccoli, bell peppers, carrots)',
      '1 avocado',
      '2 cups spinach',
      'Tahini dressing',
      'Sesame seeds',
    ],
    instructions: [
      'Cook quinoa in vegetable broth according to package directions',
      'Roast chickpeas and vegetables at 400°F for 20 minutes',
      'Massage spinach with a bit of dressing',
      'Divide quinoa between bowls',
      'Top with roasted vegetables, chickpeas, and spinach',
      'Add sliced avocado',
      'Drizzle with tahini dressing',
      'Sprinkle with sesame seeds',
    ],
    tags: ['vegetarian', 'vegan-option', 'high-fiber', 'meal-prep'],
  },
  {
    id: 'recipe-6',
    name: 'Mediterranean Wrap',
    description: 'Fresh and flavorful wrap inspired by Mediterranean cuisine',
    type: 'lunch',
    calories: 420,
    protein: 22,
    carbs: 48,
    fats: 16,
    prepTime: 10,
    cookTime: 0,
    servings: 1,
    difficulty: 'easy',
    ingredients: [
      '1 whole wheat tortilla',
      '1/3 cup hummus',
      '4 oz grilled chicken or falafel',
      '1/2 cup mixed greens',
      '1/4 cup cucumber, diced',
      '1/4 cup tomatoes, diced',
      '2 tbsp feta cheese',
      '2 tbsp tzatziki sauce',
    ],
    instructions: [
      'Lay tortilla flat on clean surface',
      'Spread hummus evenly over tortilla',
      'Layer with mixed greens',
      'Add grilled chicken or falafel',
      'Top with cucumber, tomatoes, and feta',
      'Drizzle with tzatziki',
      'Roll tightly, tucking in sides',
      'Cut in half and serve',
    ],
    tags: ['quick', 'mediterranean', 'portable'],
  },

  // Dinner Recipes
  {
    id: 'recipe-7',
    name: 'Baked Salmon with Roasted Vegetables',
    description: 'Omega-3 rich salmon with colorful roasted veggies',
    type: 'dinner',
    calories: 520,
    protein: 42,
    carbs: 35,
    fats: 24,
    prepTime: 15,
    cookTime: 25,
    servings: 2,
    difficulty: 'medium',
    ingredients: [
      '2 salmon fillets (6 oz each)',
      '2 cups broccoli florets',
      '2 cups Brussels sprouts, halved',
      '1 sweet potato, cubed',
      'Olive oil',
      'Lemon',
      'Garlic, herbs (dill, thyme)',
      'Salt and pepper',
    ],
    instructions: [
      'Preheat oven to 400°F',
      'Toss vegetables with olive oil, salt, and pepper',
      'Spread vegetables on baking sheet',
      'Season salmon with salt, pepper, garlic, and herbs',
      'Place salmon on vegetables',
      'Bake for 20-25 minutes until salmon is cooked through',
      'Squeeze fresh lemon juice over everything',
      'Serve immediately',
    ],
    tags: ['omega-3', 'anti-inflammatory', 'one-pan', 'gluten-free'],
  },
  {
    id: 'recipe-8',
    name: 'Turkey and Veggie Stir-Fry',
    description: 'Quick, protein-packed stir-fry with lean turkey',
    type: 'dinner',
    calories: 460,
    protein: 38,
    carbs: 42,
    fats: 14,
    prepTime: 15,
    cookTime: 15,
    servings: 2,
    difficulty: 'easy',
    ingredients: [
      '1 lb ground turkey',
      '2 cups mixed stir-fry vegetables',
      '1 bell pepper, sliced',
      '1 cup snap peas',
      '3 cloves garlic, minced',
      '2 tbsp low-sodium soy sauce',
      '1 tbsp sesame oil',
      '1 cup brown rice (cooked)',
      'Green onions for garnish',
    ],
    instructions: [
      'Heat sesame oil in large wok or skillet',
      'Add ground turkey, break up and cook until browned',
      'Remove turkey and set aside',
      'Add garlic and vegetables to pan',
      'Stir-fry for 5-7 minutes until tender-crisp',
      'Return turkey to pan',
      'Add soy sauce and toss to combine',
      'Serve over brown rice',
      'Garnish with green onions',
    ],
    tags: ['high-protein', 'quick', 'asian-inspired', 'low-fat'],
  },
  {
    id: 'recipe-9',
    name: 'Lentil and Vegetable Curry',
    description: 'Hearty vegetarian curry packed with protein and fiber',
    type: 'dinner',
    calories: 390,
    protein: 18,
    carbs: 62,
    fats: 8,
    prepTime: 10,
    cookTime: 30,
    servings: 4,
    difficulty: 'easy',
    ingredients: [
      '1 cup red lentils',
      '1 can coconut milk (light)',
      '2 cups vegetable broth',
      '1 onion, diced',
      '3 cloves garlic, minced',
      '1 tbsp curry powder',
      '1 tsp turmeric',
      '2 cups spinach',
      '1 can diced tomatoes',
      'Cauliflower florets',
      'Brown rice for serving',
    ],
    instructions: [
      'Sauté onion and garlic until softened',
      'Add curry powder and turmeric, cook for 1 minute',
      'Add lentils, coconut milk, broth, and tomatoes',
      'Bring to boil, then simmer for 15 minutes',
      'Add cauliflower and cook for 10 more minutes',
      'Stir in spinach until wilted',
      'Season with salt and pepper',
      'Serve over brown rice',
    ],
    tags: ['vegetarian', 'vegan', 'high-fiber', 'budget-friendly', 'meal-prep'],
  },

  // Snack Recipes
  {
    id: 'recipe-10',
    name: 'Energy Protein Balls',
    description: 'No-bake protein-rich snack perfect for on-the-go',
    type: 'snack',
    calories: 180,
    protein: 8,
    carbs: 22,
    fats: 7,
    prepTime: 15,
    cookTime: 0,
    servings: 12,
    difficulty: 'easy',
    ingredients: [
      '1 cup rolled oats',
      '1/2 cup natural peanut butter',
      '1/3 cup honey',
      '1/4 cup chocolate chips',
      '2 tbsp chia seeds',
      '1 scoop vanilla protein powder',
      '1 tsp vanilla extract',
    ],
    instructions: [
      'Mix all ingredients in a large bowl',
      'Refrigerate mixture for 30 minutes',
      'Roll into 12 balls',
      'Store in refrigerator for up to 1 week',
      'Enjoy as a quick snack or pre-workout fuel',
    ],
    tags: ['no-bake', 'meal-prep', 'portable', 'pre-workout'],
  },
  {
    id: 'recipe-11',
    name: 'Greek Yogurt Parfait',
    description: 'Layered parfait with protein and fresh fruit',
    type: 'snack',
    calories: 220,
    protein: 18,
    carbs: 28,
    fats: 4,
    prepTime: 5,
    cookTime: 0,
    servings: 1,
    difficulty: 'easy',
    ingredients: [
      '1 cup Greek yogurt',
      '1/2 cup mixed berries',
      '2 tbsp granola',
      '1 tbsp honey',
      '1 tbsp sliced almonds',
      'Fresh mint for garnish',
    ],
    instructions: [
      'Layer half the Greek yogurt in a glass',
      'Add half the berries',
      'Add remaining yogurt',
      'Top with remaining berries',
      'Sprinkle with granola and almonds',
      'Drizzle with honey',
      'Garnish with fresh mint',
    ],
    tags: ['high-protein', 'quick', 'no-cook', 'vegetarian'],
  },
];

export const filterRecipesByCalories = (
  recipes: Recipe[],
  targetCalories: number,
  tolerance: number = 150
): Recipe[] => {
  return recipes.filter(
    recipe => Math.abs(recipe.calories - targetCalories) <= tolerance
  );
};

export const filterRecipesByType = (
  recipes: Recipe[],
  type: Recipe['type']
): Recipe[] => {
  return recipes.filter(recipe => recipe.type === type);
};

export const filterRecipesByTags = (
  recipes: Recipe[],
  tags: string[]
): Recipe[] => {
  return recipes.filter(recipe =>
    tags.some(tag => recipe.tags.includes(tag))
  );
};

export const searchRecipes = (recipes: Recipe[], query: string): Recipe[] => {
  const lowerQuery = query.toLowerCase();
  return recipes.filter(
    recipe =>
      recipe.name.toLowerCase().includes(lowerQuery) ||
      recipe.description.toLowerCase().includes(lowerQuery) ||
      recipe.ingredients.some(ing => ing.toLowerCase().includes(lowerQuery))
  );
};
