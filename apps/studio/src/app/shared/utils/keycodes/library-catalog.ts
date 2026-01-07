import { keycodeEntries, KeycodeEntry, resolveLegend } from './catalog';

/**
 * Represents a single keycode entry in the library UI.
 *
 * @property {string} id - Lower‑cased identifier of the keycode.
 * @property {string} label - Primary display text for the keycode.
 * @property {string} hint - Secondary text shown as a tooltip (optional).
 * @property {string} action - Drag action string, e.g., "KC:KC_A".
 * @property {boolean} [compact] - Flag indicating compact rendering mode.
 * @property {string} [symbol] - Optional display symbol for the legend.
 * @property {'common' | 'advanced' | 'danger'} [level] - Optional visibility level.
 * @property {string[]} [requires] - Optional capabilities required to support the key.
 */
export interface LibraryBlockItem {
  id: string;
  label: string;
  action: string;
  hint?: string;
  arg?: string;
  compact?: boolean;
  symbol?: string;
  level?: 'common' | 'advanced' | 'danger';
  requires?: string[];
  searchText?: string;
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
  predicate?: (entry: KeycodeEntry) => boolean;
};

export const CATEGORY_DEFS: CategoryDef[] = [
  { key: 'alphanumeric', label: 'Alphanumeric', groups: ['alpha', 'number', 'punc', 'control'], density: 'dense' },
  { key: 'modifier', label: 'Modifiers', groups: ['mod'] },
  { key: 'navigation', label: 'Navigation', groups: ['nav'] },
  { key: 'layers', label: 'Layers & Advanced', groups: ['layer', 'layerTap', 'modTap', 'oneshot'] },
  { key: 'lighting', label: 'Lighting', groups: ['rgb', 'backlight'], density: 'dense' },
  { key: 'function', label: 'Function Keys', groups: ['function'], density: 'dense' },
  { key: 'numpad', label: 'Numpad', groups: ['numpad'], density: 'dense' },
  { key: 'media-volume', label: 'Media: Volume', groups: ['media', 'audio'], predicate: entry => (entry.semanticId ?? entry.id).startsWith('media.volume') },
  { key: 'media-track', label: 'Media: Playback', groups: ['media', 'audio'], predicate: entry => (entry.semanticId ?? entry.id).startsWith('media.track') },
  { key: 'media-web', label: 'Media: Browser', groups: ['media', 'audio'], predicate: entry => (entry.semanticId ?? entry.id).startsWith('web.') },
  { key: 'media-display', label: 'Media: Display', groups: ['media', 'audio'], predicate: entry => (entry.semanticId ?? entry.id).startsWith('display.') },
  { key: 'media-other', label: 'Media: Other', groups: ['media', 'audio'], predicate: entry => {
      const key = entry.semanticId ?? entry.id;
      return !(
        key.startsWith('media.volume') ||
        key.startsWith('media.track') ||
        key.startsWith('web.') ||
        key.startsWith('display.')
      );
    } },
  { key: 'mouse', label: 'Mouse', groups: ['mouse'] },
  { key: 'system', label: 'System', groups: ['system'] },
  { key: 'macros', label: 'Macros & User', groups: ['macro', 'user'] },
  { key: 'special', label: 'Special', groups: ['special'] },
];

function semanticKey(entry: KeycodeEntry): string {
  return entry.semanticId ?? entry.id;
}


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
function toBlockItem(entry: KeycodeEntry, aliases: string[], tags: string[]): LibraryBlockItem {
  const legend = resolveLegend(entry);
  const label = {
    primary: legend.label,
    secondary: legend.short,
  };

  const isCompact =
    (isBasic(entry) && (
      entry.group === 'alpha' ||
      entry.group === 'number' ||
      entry.group === 'punc' ||
      entry.group === 'function' ||
      entry.group === 'numpad'
    ));

  const symbol = legend.symbol;
  const searchText = [entry.id, label.primary, label.secondary, entry.group, ...aliases, ...tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    id: entry.id.toLowerCase(),
    label: label.primary,
    hint: label.secondary,
    action: `KC:${entry.id}`,
    compact: isCompact,
    symbol,
    level: entry.level,
    requires: entry.requires,
    searchText,
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

export interface MacroSafeOptions {
  includeKeyboardActions?: boolean;
  includeUserKeys?: boolean;
  includeDanger?: boolean;
  includeAdvanced?: boolean;
  includeMouse?: boolean;
}

export function isMacroSafeEntry(entry: KeycodeEntry, options: MacroSafeOptions = {}): boolean {
  const {
    includeKeyboardActions = false,
    includeUserKeys = false,
    includeDanger = false,
    includeAdvanced = false,
    includeMouse = false,
  } = options;

  if (entry.id === 'KC_NO' || entry.id === 'KC_TRNS') return false;
  if (entry.group === 'special' || entry.group === 'macro') return false;
  if (entry.level === 'danger' && !includeDanger) return false;
  if (entry.level === 'advanced' && !includeAdvanced) return false;
  if (entry.group === 'user' && !includeUserKeys) return false;
  if (entry.group === 'mouse' && !includeMouse) return false;

  if (entry.group === 'layer' || entry.group === 'layerTap' || entry.group === 'modTap' || entry.group === 'oneshot') {
    return includeKeyboardActions;
  }

  if (entry.type !== 'basic') {
    return includeKeyboardActions;
  }

  const code = (entry as any).code;
  if (typeof code !== 'number') return false;
  if (code <= 0x00ff) return true;

  return includeAdvanced || includeDanger || includeUserKeys;
}

export function buildKeycodeBlockCategories(options?: BuildKeycodeBlockCategoriesOptions): LibraryBlockCategory[] {
  const allowedCategories = options?.allowedCategoryKeys
    ? new Set(options.allowedCategoryKeys)
    : null;
  const excludedIds = options?.excludeKeyIds?.map(id => id.toUpperCase()) ?? [];
  const entryFilter = options?.itemFilter;
  const knownGroups = new Set(CATEGORY_DEFS.flatMap(def => def.groups));
  const includeOther = !allowedCategories || allowedCategories.has('other');

  const sortItems = (items: LibraryBlockItem[]) => {
    items.sort((a, b) => {
      const labelA = a.label.toLowerCase();
      const labelB = b.label.toLowerCase();
      if (labelA < labelB) return -1;
      if (labelA > labelB) return 1;
      return a.id.localeCompare(b.id);
    });
  };

  const groups = new Map<string, KeycodeEntry[]>();
  keycodeEntries.forEach(entry => {
    const key = semanticKey(entry);
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  });

  const pickPrimary = (list: KeycodeEntry[], key: string): KeycodeEntry => {
    const exact = list.find(entry => entry.id === key);
    return exact ?? list[0];
  };

  const allEntries: Array<{ entry: KeycodeEntry; aliases: string[]; tags: string[] }> = [];
  groups.forEach((list, key) => {
    const primary = pickPrimary(list, key);
    const aliases = new Set<string>();
    const tags = new Set<string>();
    aliases.add(key);
    list.forEach(entry => {
      (entry.aliases ?? []).forEach(alias => aliases.add(alias));
      (entry.tags ?? []).forEach((tag: string) => tags.add(tag));
      if (entry.id !== primary.id) {
        aliases.add(entry.id);
      }
    });
    allEntries.push({ entry: primary, aliases: Array.from(aliases), tags: Array.from(tags) });
  });

  const categories = CATEGORY_DEFS
    .filter(def => !allowedCategories || allowedCategories.has(def.key))
    .map(def => {
      const items: LibraryBlockItem[] = allEntries
        .filter(({ entry }) => def.groups.includes(entry.group))
        .filter(({ entry }) => (def.predicate ? def.predicate(entry) : true))
        .filter(({ entry }) => !excludedIds.includes(entry.id.toUpperCase()))
        .filter(({ entry }) => (entryFilter ? entryFilter(entry) : true))
        .map(({ entry, aliases, tags }) => toBlockItem(entry, aliases, tags));

      sortItems(items);
      return items.length
        ? {
            key: def.key,
            label: def.label,
            items,
            density: def.density ?? 'normal',
          }
        : null;
    }).filter((cat): cat is LibraryBlockCategory => cat !== null);

  if (includeOther) {
    const otherItems = allEntries
      .filter(({ entry }) => !knownGroups.has(entry.group))
      .filter(({ entry }) => !excludedIds.includes(entry.id.toUpperCase()))
      .filter(({ entry }) => (entryFilter ? entryFilter(entry) : true))
      .map(({ entry, aliases, tags }) => toBlockItem(entry, aliases, tags));
    sortItems(otherItems);
    if (otherItems.length) {
      categories.push({
        key: 'other',
        label: 'Other / Uncategorized',
        items: otherItems,
        density: 'normal',
      });
    }
  }

  return categories;
}
