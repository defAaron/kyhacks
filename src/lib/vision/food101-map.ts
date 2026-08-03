import { visionResultSchema, type VisionResult } from "@/lib/schemas";

export type FoodPrediction = {
  label: string;
  score: number;
};

/** Turn Food-101 snake_case labels into a short title. */
export function humanizeFoodLabel(label: string): string {
  return label
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function uniq(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean))];
}

/**
 * Map Food-101 classifier output → listing vision fields.
 * Allergen lists are conservative heuristics from the dish name (not visual detection).
 */
export function visionResultFromFood101(
  predictions: FoodPrediction[],
): VisionResult {
  const top = predictions[0];
  if (!top?.label) {
    throw new Error("No food predictions");
  }

  const label = top.label.trim().toLowerCase().replace(/\s+/g, "_");
  const title = humanizeFoodLabel(label);
  const categories = inferCategories(label);
  const allergens = inferAllergens(label);
  const suggestedQuantity = inferQuantity(label, categories);
  const confidence = Math.min(1, Math.max(0, top.score));

  const runnerUp = predictions
    .slice(1, 3)
    .filter((p) => p.score >= 0.08)
    .map((p) => humanizeFoodLabel(p.label).toLowerCase());

  const description = runnerUp.length
    ? `${title} (also looks like ${runnerUp.join(", ")}). Confirm before publishing.`
    : `${title} identified from photo. Confirm allergens and portions before publishing.`;

  return visionResultSchema.parse({
    title,
    description,
    categories,
    allergens,
    suggestedQuantity,
    confidence,
    offline: false,
  });
}

function inferCategories(label: string): string[] {
  const cats = new Set<string>(["prepared"]);

  if (
    /salad|edamame|guacamole|hummus|falafel|beet|seaweed|ceviche|carpaccio|tartare/.test(
      label,
    )
  ) {
    cats.add("produce");
  }
  if (
    /cake|donut|baklava|macaron|pudding|mousse|tiramisu|beignet|churro|cannoli|cheesecake|creme|panna|shortcake|cup_cakes|waffles|pancakes|french_toast|ice_cream|frozen_yogurt|bread_pudding|carrot_cake|chocolate|red_velvet|strawberry/.test(
      label,
    )
  ) {
    cats.add("bakery");
  }
  if (
    /cheese|ice_cream|frozen_yogurt|panna_cotta|creme_brulee|tiramisu|macaroni_and_cheese|croque|omelette|eggs_benedict|deviled_eggs|huevos/.test(
      label,
    )
  ) {
    cats.add("dairy");
  }
  if (
    /sushi|sashimi|ramen|pho|pad_thai|bibimbap|dumplings|gyoza|takoyaki|miso|edamame|spring_rolls|peking_duck|fried_rice|hot_and_sour|samosa/.test(
      label,
    )
  ) {
    cats.add("asian");
  }
  if (
    /salad|edamame|falafel|hummus|guacamole|beet_salad|seaweed_salad|fruit|vegetable|caprese|greek_salad|caesar_salad/.test(
      label,
    ) ||
    /apple_pie|baklava|beignets|bread_pudding|cannoli|carrot_cake|cheesecake|chocolate_cake|chocolate_mousse|churros|creme_brulee|cup_cakes|donuts|falafel|french_fries|french_onion_soup|french_toast|frozen_yogurt|garlic_bread|gnocchi|guacamole|hummus|ice_cream|macarons|miso_soup|onion_rings|pad_thai|pancakes|panna_cotta|pizza|ravioli|red_velvet_cake|risotto|samosa|seaweed_salad|spaghetti_carbonara|spring_rolls|strawberry_shortcake|tiramisu|waffles/.test(
      label,
    )
  ) {
    // Caprese/caesar often have cheese/eggs — still useful as a soft vegetarian hint
    // only when clearly plant-forward.
    if (
      /edamame|falafel|hummus|guacamole|beet_salad|seaweed_salad|french_fries|onion_rings|samosa|spring_rolls|miso_soup|apple_pie|baklava|beignets|churros|donuts|macarons|pancakes|waffles|french_toast|garlic_bread/.test(
        label,
      )
    ) {
      cats.add("vegetarian");
    }
  }

  return uniq([...cats]);
}

function inferAllergens(label: string): string[] {
  const allergens = new Set<string>();

  if (
    /pizza|pasta|spaghetti|lasagna|ravioli|sandwich|burger|bread|toast|waffle|pancake|donut|cake|dumpling|gyoza|spring_roll|samosa|burrito|quesadilla|nacho|macaroni|gnocchi|beignet|churro|baklava|macaron|bread_pudding|club_sandwich|garlic_bread|hot_dog|hamburger|poutine|onion_rings|fish_and_chips|french_fries|fried_rice|pad_thai|ramen|pho|bibimbap|croissant|cannoli|tiramisu|cheesecake|carrot_cake|chocolate_cake|red_velvet|cup_cakes|strawberry_shortcake|apple_pie|french_toast|croque|breakfast_burrito|pulled_pork|lobster_roll|grilled_cheese|bruschetta|tacos|huevos|paella|risotto|gnocchi|samosa/.test(
      label,
    )
  ) {
    allergens.add("gluten");
  }

  if (
    /cheese|pizza|lasagna|carbonara|croque|quesadilla|nachos|macaroni_and_cheese|cheesecake|tiramisu|creme_brulee|panna_cotta|ice_cream|frozen_yogurt|caesar|caprese|omelette|eggs_benedict|deviled_eggs|french_toast|pancakes|waffles|bread_pudding|chocolate_mousse|ravioli|gnocchi|risotto|grilled_cheese|breakfast_burrito|huevos|cannoli|carrot_cake|red_velvet|cup_cakes/.test(
      label,
    )
  ) {
    allergens.add("dairy");
  }

  if (
    /sushi|sashimi|ramen|pad_thai|bibimbap|gyoza|dumplings|miso|edamame|spring_rolls|pho|hot_and_sour|peking|fried_rice|teriyaki|soy/.test(
      label,
    )
  ) {
    allergens.add("soy");
  }

  if (/pad_thai|hummus|falafel|baklava|ramen|pho|sesame/.test(label)) {
    allergens.add("sesame");
  }

  if (/baklava|pad_thai|pesto|nuts|macaron/.test(label)) {
    allergens.add("nuts");
  }

  if (
    /egg|omelette|benedict|deviled|carbonara|tiramisu|mousse|french_toast|pancake|waffle|cake|cookie|mayo|caesar|ramen|fried_rice|pad_thai|bread_pudding|creme_brulee|ice_cream|donut|beignet|churro|macaron|cup_cakes/.test(
      label,
    )
  ) {
    allergens.add("eggs");
  }

  if (
    /shrimp|lobster|crab|clam|mussel|oyster|calamari|scallop|seafood|sushi|sashimi|takoyaki|paella|ceviche|bisque|chowder|fish_and_chips|grilled_salmon|tuna|shrimp_and_grits/.test(
      label,
    )
  ) {
    allergens.add("shellfish");
  }

  // Fish (non-shellfish) called out separately in many menus; keep under shellfish only when shellfish-like.
  // Salmon/tuna/sashimi: use a soft "fish" isn't in schema examples — schema uses shellfish.
  // Leave fish-only dishes without shellfish unless clearly shellfish.

  if (/salmon|tuna_tartare|sashimi|fish_and_chips/.test(label)) {
    // Prefer not inventing a non-schema allergen; donors can edit.
  }

  return uniq([...allergens]);
}

function inferQuantity(label: string, categories: string[]): number {
  if (/pizza|lasagna|tray|pan|paella|bibimbap|fried_rice|pho|ramen|pad_thai/.test(label)) {
    return 6;
  }
  if (/salad|soup|stew|chowder|bisque|miso|hot_and_sour/.test(label)) {
    return 4;
  }
  if (categories.includes("bakery") || /donut|cup_cakes|macaron|cookie|beignet|churro/.test(label)) {
    return 8;
  }
  if (/wings|ribs|nachos|fries|edamame|spring_rolls|dumplings|gyoza|samosa/.test(label)) {
    return 5;
  }
  return 2;
}
