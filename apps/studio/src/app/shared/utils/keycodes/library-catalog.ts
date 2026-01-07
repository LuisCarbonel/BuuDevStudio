import { keycodeEntries, KeycodeEntry } from './catalog';

/**
 * Represents a single keycode entry in the library UI.
 *
 * @property {string} id - Lower‑cased identifier of the keycode.
 * @property {string} label - Primary display text for the keycode.
 * @property {string} hint - Secondary text shown as a tooltip (optional).
 * @property {string} action - Drag action string, e.g., "KC:KC_A".
 * @property {boolean} [compact] - Flag indicating compact rendering mode.
 * @property {string} [symbol] - Unicode symbol for modifier keys (e.g., ⌃).
 */
export interface LibraryBlockItem {
  id: string;
  label: string;
  action: string;
  hint?: string;
  arg?: string;
  compact?: boolean;
  symbol?: string;
}

/**
 * A category grouping multiple {@link LibraryBlockItem}s in the library UI.
 *
 * @property {string} key - Unique key used to identify the category.
 * @property {string} label - Human‑readable name shown in the UI.
 * @property {LibraryBlockItem[]} items - Array of items belonging to this category.
 * @property {'dense' | 'normal'} density - Layout density hint for rendering.
 * @property {string} [icon] - Optional icon identifier for the category.
 */
export interface LibraryBlockCategory {
  key: string;
  label: string;
  items: LibraryBlockItem[];
  density: 'dense' | 'normal';
  icon?: string;
}

type CategoryDef = {
  key: string;
  label: string;
  groups: string[];
  density?: 'dense' | 'normal';
};

export const CATEGORY_DEFS: CategoryDef[] = [
  { key: 'alphanumeric', label: 'Alphanumeric', groups: ['alpha', 'number', 'punc', 'control'], density: 'dense' },
  { key: 'modifier', label: 'Modifiers', groups: ['mod'] },
  { key: 'navigation', label: 'Navigation', groups: ['nav'] },
  { key: 'layers', label: 'Layers & Advanced', groups: ['layer', 'layerTap', 'modTap', 'oneshot'] },
  { key: 'lighting', label: 'Lighting', groups: ['rgb', 'backlight'], density: 'dense' },
  { key: 'function', label: 'Function Keys', groups: ['function'], density: 'dense' },
  { key: 'numpad', label: 'Numpad', groups: ['numpad'], density: 'dense' },
  { key: 'media', label: 'Media', groups: ['media', 'audio'] },
  { key: 'mouse', label: 'Mouse', groups: ['mouse'] },
  { key: 'system', label: 'System', groups: ['system'] },
  { key: 'macros', label: 'Macros & User', groups: ['macro', 'user'] },
  { key: 'special', label: 'Special', groups: ['special'] },
];

const MODIFIER_SYMBOLS: Record<string, string> = {
  'KC_LCTL': '⌃',
  'KC_RCTL': '⌃',
  'KC_LSFT': '⇧',
  'KC_RSFT': '⇧',
  'KC_LALT': '⌥',
  'KC_RALT': '⌥',
  'KC_LGUI': '⌘',
  'KC_RGUI': '⌘',
};

/**
 * Determines whether a keycode entry has an associated numeric `code` property,
 * indicating it represents a basic (non‑macro) key.
 *
 * @param {KeycodeEntry} entry - The keycode entry to test.
 * @returns {entry is KeycodeEntry & { code: number }} True if the entry contains a `code`.
 */
function isBasic(entry: KeycodeEntry): entry is KeycodeEntry & { code: number } {
  return (entry as any).code !== undefined;
}

/**
 * Converts a raw {@link KeycodeEntry} into a {@link LibraryBlockItem}
 * suitable for rendering in the library UI.
 *
 * @param {KeycodeEntry} entry - The raw keycode entry from the catalog.
 * @returns {LibraryBlockItem} A formatted block item with id, label, action, etc.
 */
function toBlockItem(entry: KeycodeEntry): LibraryBlockItem {
  const label = {
    primary: entry.label,
    secondary: (entry as any).short,
  };

  const isCompact =
    (isBasic(entry) && (
      entry.group === 'alpha' ||
      entry.group === 'number' ||
      entry.group === 'punc' ||
      entry.group === 'function' ||
      entry.group === 'numpad'
    ));

  const symbol = isBasic(entry) ? MODIFIER_SYMBOLS[entry.id] : undefined;

  return {
    id: entry.id.toLowerCase(),
    label: label.primary,
    hint: label.secondary,
    action: `KC:${entry.id}`,
    compact: isCompact,
    symbol,
  };
}

/**
 * Builds the array of {@link LibraryBlockCategory}s used by the library UI.
 *
 * @returns {LibraryBlockCategory[]} An array of populated categories, each containing
 *   items filtered from the raw keycode catalog. Empty categories are omitted.
 */
export interface BuildKeycodeBlockCategoriesOptions {
  allowedCategoryKeys?: string[];
  excludeKeyIds?: string[];
  itemFilter?: (entry: KeycodeEntry) => boolean;
}

export function buildKeycodeBlockCategories(options?: BuildKeycodeBlockCategoriesOptions): LibraryBlockCategory[] {
  const allowedCategories = options?.allowedCategoryKeys
    ? new Set(options.allowedCategoryKeys)
    : null;
  const excludedIds = options?.excludeKeyIds?.map(id => id.toUpperCase()) ?? [];
  const entryFilter = options?.itemFilter;

  return CATEGORY_DEFS
    .filter(def => !allowedCategories || allowedCategories.has(def.key))
    .map(def => {
      const items: LibraryBlockItem[] = keycodeEntries
        .filter(entry => def.groups.includes((entry as any).group))
        .filter(entry => !excludedIds.includes(entry.id.toUpperCase()))
        .filter(entry => (entryFilter ? entryFilter(entry) : true))
        .map(entry => toBlockItem(entry));

      return items.length
        ? {
            key: def.key,
            label: def.label,
            items,
            density: def.density ?? 'normal',
          }
        : null;
    }).filter((cat): cat is LibraryBlockCategory => cat !== null);
}
