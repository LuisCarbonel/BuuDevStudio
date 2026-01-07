import { getOsProfile, OsProfile } from './os-profile';
import { getActiveCatalog } from './catalog-loader';

export interface KeycodeLabel {
  primary: string;
  secondary?: string;
}

export type KeycodeEntryType =
  | 'basic'
  | 'layer'
  | 'layerTap'
  | 'modTap';

/**
 * semanticId: optional canonical id used for deduping aliases/synonyms in the library.
 * display: optional OS-specific legend overrides (presentation only; encoding unchanged).
 */
interface BaseEntry {
  id: string;
  semanticId?: string;
  label: string;
  short?: string;
  group: string;
  level?: 'common' | 'advanced' | 'danger';
  aliases?: string[];
  requires?: string[];
  type: KeycodeEntryType;
  display?: DisplayOverrides;
  tags?: string[];
}

interface BasicEntry extends BaseEntry {
  type: 'basic';
  code: number;
}

interface LayerEntry extends BaseEntry {
  type: 'layer';
  base: number;
  params: ['layer'];
}

interface LayerTapEntry extends BaseEntry {
  type: 'layerTap';
  base: number;
  params: ['layer', 'tap'];
}

interface ModTapEntry extends BaseEntry {
  type: 'modTap';
  base: number;
  params: ['mod', 'tap'];
}

export type KeycodeEntry = BasicEntry | LayerEntry | LayerTapEntry | ModTapEntry;

export interface KeycodeParams {
  layer?: number;
  tap?: string;
  mod?: string;
}

export interface DecodedKeycode {
  id: string;
  params?: KeycodeParams;
  label: KeycodeLabel;
  requires?: string[];
}

export interface DisplayLegend {
  label: string;
  short?: string;
  symbol?: string;
}

export interface DisplayOverrides {
  default?: DisplayLegend;
  mac?: DisplayLegend;
  win?: DisplayLegend;
  linux?: DisplayLegend;
}

const catalogData = getActiveCatalog();
const entries: KeycodeEntry[] = catalogData.keycodes as KeycodeEntry[];
export const keycodeEntries: ReadonlyArray<KeycodeEntry> = entries;
const modMap: Record<string, number> = (catalogData as any).mods ?? {};
const entriesById = new Map<string, KeycodeEntry>(entries.map(e => [e.id, e]));
const entriesByAlias = new Map<string, KeycodeEntry>();
entries.forEach(e => {
  e.aliases?.forEach(a => entriesByAlias.set(a, e));
});

interface KeycodeRange {
  name: string;
  min: number;
  max: number;
  format: (code: number) => KeycodeLabel;
}

const KEYCODE_RANGES: KeycodeRange[] = [
  {
    name: 'User',
    min: 0xA0,
    max: 0xDF,
    format: (code) => ({
      primary: `User ${code - 0xA0}`,
      secondary: `0x${code.toString(16).toUpperCase().padStart(4, '0')}`
    })
  },
  {
    name: 'Custom',
    min: 0x5F80,
    max: 0x7FFF,
    format: (code) => ({
      primary: 'Custom',
      secondary: `0x${code.toString(16).toUpperCase().padStart(4, '0')}`
    })
  }
];

function findKeycodeRange(code: number): KeycodeRange | undefined {
  return KEYCODE_RANGES.find(range => code >= range.min && code <= range.max);
}

function modBits(mod: string | undefined): number {
  if (!mod) return 0;
  const bits = modMap[mod];
  return typeof bits === 'number' ? bits : 0;
}

function findEntry(action: string): KeycodeEntry | undefined {
  return entriesById.get(action) ?? entriesByAlias.get(action);
}

export function findKeycodeEntry(idOrAlias: string): KeycodeEntry | undefined {
  return findEntry(idOrAlias);
}

export function resolveLegend(entry: KeycodeEntry, osProfile: OsProfile = getOsProfile()): DisplayLegend {
  const display = entry.display;
  const specific = (display && (display as any)[osProfile]) as DisplayLegend | undefined;
  const fallback = display?.default;
  const label = specific?.label ?? fallback?.label ?? entry.label;
  const short = specific?.short ?? fallback?.short ?? entry.short;
  const symbol = specific?.symbol ?? fallback?.symbol;
  return { label, short, symbol };
}

function makeLabel(entry: KeycodeEntry, params?: KeycodeParams): KeycodeLabel {
  const legend = resolveLegend(entry);
  if (entry.type === 'basic' && entry.group === 'number') {
    const shifted = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'];
    const idx = (entry as BasicEntry).code - 0x1e;
    const primary = shifted[idx] ?? legend.label;
    const secondary = `${(idx + 1) % 10}`;
    return { primary, secondary };
  }
  switch (entry.type) {
    case 'layer': {
      const layerNum = params?.layer ?? 0;
      return {
        primary: `Layer ${layerNum}`,
        secondary: legend.label
      };
    }
    case 'layerTap': {
      const layerNum = params?.layer ?? 0;
      return {
        primary: `L${layerNum}`,
        secondary: params?.tap
      };
    }
    case 'modTap':
      return { primary: `${legend.label}(${params?.mod ?? ''})`, secondary: params?.tap };
    default:
      return { primary: legend.label };
  }
}

export function encodeKeycode(id: string, params?: KeycodeParams): DecodedKeycode | null {
  const entry = findEntry(id);
  if (!entry) return null;

  switch (entry.type) {
    case 'basic': {
      return { id: entry.id, label: makeLabel(entry, params), requires: entry.requires };
    }
    case 'layer': {
      const layer = params?.layer ?? 0;
      const code = entry.base + layer;
      return { id: entry.id, params: { layer }, label: makeLabel(entry, { layer }), requires: entry.requires };
    }
    case 'layerTap': {
      const layer = params?.layer ?? 0;
      const tapEntry = params?.tap ? findEntry(params.tap) : null;
      const tapCode = tapEntry && tapEntry.type === 'basic' ? tapEntry.code : 0;
      const code = entry.base | ((layer & 0x3f) << 8) | (tapCode & 0xff);
      return {
        id: entry.id,
        params: { layer, tap: tapEntry?.id },
        label: makeLabel(entry, { layer, tap: tapEntry?.label }),
        requires: entry.requires,
      };
    }
    case 'modTap': {
      const mod = params?.mod;
      const modValue = modBits(mod);
      const tapEntry = params?.tap ? findEntry(params.tap) : null;
      const tapCode = tapEntry && tapEntry.type === 'basic' ? tapEntry.code : 0;
      const code = entry.base | ((modValue & 0xff) << 8) | (tapCode & 0xff);
      return {
        id: entry.id,
        params: { mod, tap: tapEntry?.id },
        label: makeLabel(entry, { mod, tap: tapEntry?.label }),
        requires: entry.requires,
      };
    }
  }
}

export function encodeKeycodeToCode(id: string, params?: KeycodeParams): number | null {
  const encoded = encodeKeycode(id, params);
  if (!encoded) return null;
  const entry = findEntry(encoded.id);
  if (!entry) return null;
  if (entry.type === 'basic') return entry.code;
  if (entry.type === 'layer') return (entry as LayerEntry).base + (encoded.params?.layer ?? 0);
  if (entry.type === 'layerTap') {
    const layer = encoded.params?.layer ?? 0;
    const tapEntry = encoded.params?.tap ? findEntry(encoded.params.tap) : null;
    const tapCode = tapEntry && tapEntry.type === 'basic' ? tapEntry.code : 0;
    return (entry as LayerTapEntry).base | ((layer & 0x3f) << 8) | (tapCode & 0xff);
  }
  if (entry.type === 'modTap') {
    const modValue = modBits(encoded.params?.mod);
    const tapEntry = encoded.params?.tap ? findEntry(encoded.params.tap) : null;
    const tapCode = tapEntry && tapEntry.type === 'basic' ? tapEntry.code : 0;
    return (entry as ModTapEntry).base | ((modValue & 0xff) << 8) | (tapCode & 0xff);
  }
  return null;
}

export function decodeKeycode(code: number): DecodedKeycode | null {
  // Basic match first.
  const basic = entries.find(e => e.type === 'basic' && (e as BasicEntry).code === code);
  if (basic) {
    return { id: basic.id, label: makeLabel(basic), requires: basic.requires };
  }

  const layerEntry = entries.find(e => e.type === 'layer' && code >= (e as LayerEntry).base && code < (e as LayerEntry).base + 0x40) as LayerEntry | undefined;
  if (layerEntry) {
    const layer = code - layerEntry.base;
    return { id: layerEntry.id, params: { layer }, label: makeLabel(layerEntry, { layer }), requires: layerEntry.requires };
  }

  // Layer-tap: base 0x4000
  const layerTap = entries.find(e => e.type === 'layerTap' && (code & 0xF000) === (e as LayerTapEntry).base) as LayerTapEntry | undefined;
  if (layerTap) {
    const layer = (code >> 8) & 0x3f;
    const tapCode = code & 0xff;
    const tapEntry = entries.find(e => e.type === 'basic' && (e as BasicEntry).code === tapCode);
    return {
      id: layerTap.id,
      params: { layer, tap: tapEntry?.id },
      label: makeLabel(layerTap, { layer, tap: tapEntry?.label }),
      requires: layerTap.requires,
    };
  }

  // Mod-tap: base 0x6000
  const modTap = entries.find(e => e.type === 'modTap' && (code & 0xF000) === (e as ModTapEntry).base) as ModTapEntry | undefined;
  if (modTap) {
    const modValue = (code >> 8) & 0xff;
    const tapCode = code & 0xff;
    const modId = Object.entries(catalogData.mods ?? {}).find(([_id, bits]) => bits === modValue)?.[0];
    const tapEntry = entries.find(e => e.type === 'basic' && (e as BasicEntry).code === tapCode);
    return {
      id: modTap.id,
      params: { mod: modId, tap: tapEntry?.id },
      label: makeLabel(modTap, { mod: modId, tap: tapEntry?.label }),
      requires: modTap.requires,
    };
  }

  return null;
}

export function decodeKeycodeLabel(code: number): KeycodeLabel {
  const decoded = decodeKeycode(code);
  if (decoded) {
    if (decoded.id === 'KC_TRNS') {
      return { primary: '' };
    }
    return decoded.label;
  }
  
  const range = findKeycodeRange(code);
  if (range) {
    return range.format(code);
  }
  
  const hexCode = `0x${code.toString(16).toUpperCase().padStart(4, '0')}`;
  return {
    primary: 'Unknown',
    secondary: hexCode
  };
}

export interface KeyOption {
  code: number;
  label: KeycodeLabel;
  category: string;
}

export const allKeyOptions: KeyOption[] = entries
  .filter(e => e.type === 'basic')
  .map(entry => ({
    code: (entry as BasicEntry).code,
    label: makeLabel(entry),
    category: entry.group,
  }));

export function findKeyOption(code: number): KeyOption | undefined {
  const exact = allKeyOptions.find(k => k.code === code);
  if (exact) return exact;
  const decoded = decodeKeycode(code);
  if (decoded) {
    return { code, label: decoded.label, category: decoded.id };
  }
  return undefined;
}

export function getCatalogVersion(): string {
  return (catalogData as any).version ?? '1.0.0';
}

export interface CatalogStats {
  version: string;
  totalKeycodes: number;
  basicKeycodes: number;
  layerKeycodes: number;
  layerTapKeycodes: number;
  modTapKeycodes: number;
  groups: Record<string, number>;
}

export function getCatalogStats(): CatalogStats {
  const groups: Record<string, number> = {};
  const stats: CatalogStats = {
    version: getCatalogVersion(),
    totalKeycodes: entries.length,
    basicKeycodes: 0,
    layerKeycodes: 0,
    layerTapKeycodes: 0,
    modTapKeycodes: 0,
    groups
  };

  entries.forEach(entry => {
    switch (entry.type) {
      case 'basic':
        stats.basicKeycodes++;
        break;
      case 'layer':
        stats.layerKeycodes++;
        break;
      case 'layerTap':
        stats.layerTapKeycodes++;
        break;
      case 'modTap':
        stats.modTapKeycodes++;
        break;
    }
    groups[entry.group] = (groups[entry.group] || 0) + 1;
  });

  return stats;
}
