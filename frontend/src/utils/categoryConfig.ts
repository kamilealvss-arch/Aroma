import { Product, ProductCategory } from '../../../shared/types/index.ts';

export const DEFAULT_CATEGORIES: ProductCategory[] = [
  'Cafés Especiais',
  'Bebidas Geladas',
  'Doces & Bolos',
  'Salgados Artesanais',
  'Combos & Brunch',
];

export const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  'Cafés Especiais': [
    'Espressos & Puros',
    'Com Leite Vaporizado',
    'Filtrados Especiais',
    'Cold Brews & Gelados',
  ],
  'Bebidas Geladas': [
    'Sucos Naturais',
    'Frappés & Shakes',
    'Chás & Infusões Geladas',
    'Sodas Italianas',
  ],
  'Doces & Bolos': [
    'Fatias de Bolo',
    'Tortas & Cheesecakes',
    'Docinhos & Brigadeiros',
    'Cookies & Waffles',
  ],
  'Salgados Artesanais': [
    'Pães de Queijo Tradicionais',
    'Folhados & Croissants',
    'Quiches & Empadas',
    'Sanduíches & Toasts',
  ],
  'Combos & Brunch': [
    'Brunch & Matinal',
    'Combos da Tarde',
    'Café da Manhã Duplo',
  ],
};

export const CUSTOM_CATEGORIES_KEY = 'aroma_custom_product_categories_v1';
export const CUSTOM_SUBCATEGORIES_KEY = 'aroma_custom_subcategories_v1';
export const HIDDEN_DEFAULT_CATEGORIES_KEY = 'aroma_hidden_default_categories_v1';
export const HIDDEN_DEFAULT_SUBCATEGORIES_KEY = 'aroma_hidden_default_subcategories_v1';
export const CATEGORIES_UPDATED_EVENT = 'aroma-categories-updated';

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

function emitCategoriesUpdated(): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event(CATEGORIES_UPDATED_EVENT));
    }
  } catch {
    // ignore
  }
}

export function getStoredCustomCategories(): string[] {
  const list = readJson<unknown>(CUSTOM_CATEGORIES_KEY, []);
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
}

export function getStoredCustomSubcategories(): Record<string, string[]> {
  const map = readJson<unknown>(CUSTOM_SUBCATEGORIES_KEY, {});
  return map && typeof map === 'object' && !Array.isArray(map) ? (map as Record<string, string[]>) : {};
}

function getHiddenDefaultCategories(): string[] {
  const list = readJson<unknown>(HIDDEN_DEFAULT_CATEGORIES_KEY, []);
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}

function getHiddenDefaultSubcategories(): Record<string, string[]> {
  const map = readJson<unknown>(HIDDEN_DEFAULT_SUBCATEGORIES_KEY, {});
  return map && typeof map === 'object' && !Array.isArray(map) ? (map as Record<string, string[]>) : {};
}

export function getAllCategories(products: Product[] = []): string[] {
  const hiddenSet = new Set(getHiddenDefaultCategories());
  const visibleDefaults = DEFAULT_CATEGORIES.filter((cat) => !hiddenSet.has(cat));
  const customs = getStoredCustomCategories();
  const fromProducts = products
    .map((p) => p.category)
    .filter((cat): cat is string => typeof cat === 'string' && cat.trim().length > 0);
  return Array.from(new Set([...visibleDefaults, ...customs, ...fromProducts]));
}

export function getAllSubcategoriesForCategory(category: string, products: Product[] = []): string[] {
  if (!category) return [];
  const hiddenCats = new Set(getHiddenDefaultCategories());
  const isHiddenDefaultCategory = hiddenCats.has(category);
  const defaults = isHiddenDefaultCategory ? [] : DEFAULT_SUBCATEGORIES[category] || [];
  const hiddenSet = new Set(getHiddenDefaultSubcategories()[category] || []);
  const visibleDefaults = defaults.filter((sub) => !hiddenSet.has(sub));
  const customs = getStoredCustomSubcategories()[category] || [];
  const fromProducts = products
    .filter((p) => p.category === category && typeof p.subcategory === 'string' && p.subcategory.trim().length > 0)
    .map((p) => (p.subcategory as string).trim());
  return Array.from(new Set([...visibleDefaults, ...customs, ...fromProducts]));
}

export function addCategoryInConfig(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  const hidden = getHiddenDefaultCategories();
  const custom = getStoredCustomCategories();

  if (DEFAULT_CATEGORIES.includes(trimmed)) {
    writeJson(
      HIDDEN_DEFAULT_CATEGORIES_KEY,
      hidden.filter((c) => c !== trimmed)
    );
  } else if (!custom.includes(trimmed)) {
    writeJson(CUSTOM_CATEGORIES_KEY, [...custom, trimmed]);
  }

  emitCategoriesUpdated();
}

export function renameCategoryInConfig(oldName: string, newName: string): void {
  const oldTrimmed = oldName.trim();
  const newTrimmed = newName.trim();
  if (!oldTrimmed || !newTrimmed || oldTrimmed === newTrimmed) return;

  const visibleSubsToMigrate = getAllSubcategoriesForCategory(oldTrimmed);

  let hidden = getHiddenDefaultCategories();
  let custom = getStoredCustomCategories();
  const hiddenSubMap = getHiddenDefaultSubcategories();
  const customSubMap = getStoredCustomSubcategories();

  if (DEFAULT_CATEGORIES.includes(oldTrimmed)) {
    if (!hidden.includes(oldTrimmed)) hidden = [...hidden, oldTrimmed];
  }
  custom = custom.filter((c) => c !== oldTrimmed);

  if (DEFAULT_CATEGORIES.includes(newTrimmed)) {
    hidden = hidden.filter((c) => c !== newTrimmed);
  } else if (!custom.includes(newTrimmed)) {
    custom = [...custom, newTrimmed];
  }

  // Migra subcategorias visíveis da categoria antiga para a nova
  const newDefaults = DEFAULT_SUBCATEGORIES[newTrimmed] || [];
  let newHiddenSubs = [...(hiddenSubMap[newTrimmed] || [])];
  const newCustomSubs = [...(customSubMap[newTrimmed] || [])];

  for (const sub of visibleSubsToMigrate) {
    if (newDefaults.includes(sub)) {
      newHiddenSubs = newHiddenSubs.filter((s) => s !== sub);
    } else if (!newCustomSubs.includes(sub)) {
      newCustomSubs.push(sub);
    }
  }

  delete customSubMap[oldTrimmed];
  delete hiddenSubMap[oldTrimmed];

  if (newCustomSubs.length > 0) {
    customSubMap[newTrimmed] = newCustomSubs;
  }
  if (newHiddenSubs.length > 0) {
    hiddenSubMap[newTrimmed] = newHiddenSubs;
  } else {
    delete hiddenSubMap[newTrimmed];
  }

  writeJson(HIDDEN_DEFAULT_CATEGORIES_KEY, hidden);
  writeJson(CUSTOM_CATEGORIES_KEY, custom);
  writeJson(CUSTOM_SUBCATEGORIES_KEY, customSubMap);
  writeJson(HIDDEN_DEFAULT_SUBCATEGORIES_KEY, hiddenSubMap);
  emitCategoriesUpdated();
}

export function deleteCategoryInConfig(categoryName: string): void {
  const trimmed = categoryName.trim();
  if (!trimmed) return;

  let hidden = getHiddenDefaultCategories();
  if (DEFAULT_CATEGORIES.includes(trimmed) && !hidden.includes(trimmed)) {
    hidden = [...hidden, trimmed];
  }
  const custom = getStoredCustomCategories().filter((c) => c !== trimmed);

  const customSubMap = getStoredCustomSubcategories();
  const hiddenSubMap = getHiddenDefaultSubcategories();
  delete customSubMap[trimmed];
  delete hiddenSubMap[trimmed];

  writeJson(HIDDEN_DEFAULT_CATEGORIES_KEY, hidden);
  writeJson(CUSTOM_CATEGORIES_KEY, custom);
  writeJson(CUSTOM_SUBCATEGORIES_KEY, customSubMap);
  writeJson(HIDDEN_DEFAULT_SUBCATEGORIES_KEY, hiddenSubMap);
  emitCategoriesUpdated();
}

export function addSubcategoryInConfig(category: string, subName: string): void {
  const cat = category.trim();
  const sub = subName.trim();
  if (!cat || !sub) return;

  const defaults = DEFAULT_SUBCATEGORIES[cat] || [];
  const hiddenSubMap = getHiddenDefaultSubcategories();
  const customSubMap = getStoredCustomSubcategories();

  if (defaults.includes(sub)) {
    const updatedHidden = (hiddenSubMap[cat] || []).filter((s) => s !== sub);
    if (updatedHidden.length > 0) {
      hiddenSubMap[cat] = updatedHidden;
    } else {
      delete hiddenSubMap[cat];
    }
    writeJson(HIDDEN_DEFAULT_SUBCATEGORIES_KEY, hiddenSubMap);
  } else {
    const list = customSubMap[cat] || [];
    if (!list.includes(sub)) {
      customSubMap[cat] = [...list, sub];
      writeJson(CUSTOM_SUBCATEGORIES_KEY, customSubMap);
    }
  }

  emitCategoriesUpdated();
}

export function saveStoredCustomSubcategory(category: string, newSubcategory: string): void {
  addSubcategoryInConfig(category, newSubcategory);
}

export function renameSubcategoryInConfig(category: string, oldSub: string, newSub: string): void {
  const cat = category.trim();
  const oldTrim = oldSub.trim();
  const newTrim = newSub.trim();
  if (!cat || !oldTrim || !newTrim || oldTrim === newTrim) return;

  const defaults = DEFAULT_SUBCATEGORIES[cat] || [];
  const hiddenSubMap = getHiddenDefaultSubcategories();
  const customSubMap = getStoredCustomSubcategories();

  let hiddenList = [...(hiddenSubMap[cat] || [])];
  let customList = [...(customSubMap[cat] || [])];

  if (defaults.includes(oldTrim) && !hiddenList.includes(oldTrim)) {
    hiddenList.push(oldTrim);
  }
  customList = customList.filter((s) => s !== oldTrim);

  if (defaults.includes(newTrim)) {
    hiddenList = hiddenList.filter((s) => s !== newTrim);
  } else if (!customList.includes(newTrim)) {
    customList.push(newTrim);
  }

  if (hiddenList.length > 0) {
    hiddenSubMap[cat] = hiddenList;
  } else {
    delete hiddenSubMap[cat];
  }

  if (customList.length > 0) {
    customSubMap[cat] = customList;
  } else {
    delete customSubMap[cat];
  }

  writeJson(HIDDEN_DEFAULT_SUBCATEGORIES_KEY, hiddenSubMap);
  writeJson(CUSTOM_SUBCATEGORIES_KEY, customSubMap);
  emitCategoriesUpdated();
}

export function deleteSubcategoryInConfig(category: string, subName: string): void {
  const cat = category.trim();
  const sub = subName.trim();
  if (!cat || !sub) return;

  const defaults = DEFAULT_SUBCATEGORIES[cat] || [];
  const hiddenSubMap = getHiddenDefaultSubcategories();
  const customSubMap = getStoredCustomSubcategories();

  if (defaults.includes(sub)) {
    const hiddenList = hiddenSubMap[cat] || [];
    if (!hiddenList.includes(sub)) {
      hiddenSubMap[cat] = [...hiddenList, sub];
      writeJson(HIDDEN_DEFAULT_SUBCATEGORIES_KEY, hiddenSubMap);
    }
  }

  if (customSubMap[cat]) {
    const filtered = customSubMap[cat].filter((s) => s !== sub);
    if (filtered.length > 0) {
      customSubMap[cat] = filtered;
    } else {
      delete customSubMap[cat];
    }
    writeJson(CUSTOM_SUBCATEGORIES_KEY, customSubMap);
  }

  emitCategoriesUpdated();
}
