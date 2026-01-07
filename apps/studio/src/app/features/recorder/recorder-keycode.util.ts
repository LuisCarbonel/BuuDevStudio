import {
  decodeKeycode,
  encodeKeycodeToCode,
  getCatalogVersion,
  keycodeEntries,
  type KeycodeEntry,
} from '@shared/utils/keycodes/catalog';

export interface ResolvedRecorderKeycode {
  keyId: string;
  displayLabel: string;
  deviceCode: number | null;
}

const keycodeEntryMap = new Map<string, KeycodeEntry>();
keycodeEntries.forEach(entry => {
  keycodeEntryMap.set(entry.id, entry);
  entry.aliases?.forEach(alias => keycodeEntryMap.set(alias, entry));
});

const catalogVersion = getCatalogVersion();

function normalizeKeyId(keyId: string): string {
  const upper = keyId.trim().toUpperCase();
  return upper.startsWith('KC_') ? upper : `KC_${upper}`;
}

function fallbackLabel(keyId: string): string {
  const cleaned = keyId.replace(/^KC_/, '');
  if (cleaned.length === 1) return cleaned.toUpperCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

function formatLabelForEntry(entry: KeycodeEntry): string {
  const shortLabel = (entry as any).short as string | undefined;
  return shortLabel || entry.label;
}

export function resolveKeycode(input: string): ResolvedRecorderKeycode {
  const trimmed = input.trim();

  // Hex/decimal code path (e.g., 0x0044)
  const hexMatch = /^0x([0-9a-f]+)$/i.exec(trimmed);
  if (hexMatch) {
    const code = parseInt(hexMatch[1], 16);
    const decoded = decodeKeycode(code);
    if (decoded?.id) {
      return {
        keyId: decoded.id,
        displayLabel: decoded.label.primary || fallbackLabel(decoded.id),
        deviceCode: code,
      };
    }
    return {
      keyId: trimmed.toUpperCase(),
      displayLabel: trimmed.toUpperCase(),
      deviceCode: code,
    };
  }

  // Key id / alias path
  const entry =
    keycodeEntryMap.get(trimmed) ||
    keycodeEntryMap.get(trimmed.toUpperCase()) ||
    keycodeEntryMap.get(normalizeKeyId(trimmed));

  const keyId = entry?.id ?? normalizeKeyId(trimmed);
  const deviceCode = encodeKeycodeToCode(keyId);

  return {
    keyId,
    displayLabel: entry ? formatLabelForEntry(entry) : fallbackLabel(keyId),
    deviceCode,
  };
}

export function resolveLibraryAction(action: string): ResolvedRecorderKeycode | null {
  if (!action.startsWith('KC:')) return null;
  const keyId = action.slice(3);
  return resolveKeycode(keyId);
}

function mapKeyboardEventToKeyId(event: KeyboardEvent): string {
  const { code } = event;

  if (code.startsWith('Key')) {
    return `KC_${code.replace('Key', '')}`;
  } else if (code.startsWith('Digit')) {
    return `KC_${code.replace('Digit', '')}`;
  } else if (code === 'Space') {
    return 'KC_SPACE';
  } else if (code === 'Enter' || code === 'NumpadEnter') {
    return 'KC_ENTER';
  } else if (code === 'Backspace') {
    return 'KC_BSPC';
  } else if (code === 'Tab') {
    return 'KC_TAB';
  } else if (code === 'Escape') {
    return 'KC_ESC';
  } else if (code.startsWith('Arrow')) {
    return `KC_${code.replace('Arrow', '').toUpperCase()}`;
  } else if (code.startsWith('Shift')) {
    return code === 'ShiftLeft' ? 'KC_LSFT' : 'KC_RSFT';
  } else if (code.startsWith('Control')) {
    return code === 'ControlLeft' ? 'KC_LCTL' : 'KC_RCTL';
  } else if (code.startsWith('Alt')) {
    return code === 'AltLeft' ? 'KC_LALT' : 'KC_RALT';
  } else if (code.startsWith('Meta')) {
    return code === 'MetaLeft' ? 'KC_LGUI' : 'KC_RGUI';
  } else if (code.match(/^F\d+$/)) {
    return `KC_${code}`;
  }

  return normalizeKeyId(code || event.key);
}

export function parseKeyFromEvent(event: KeyboardEvent): ResolvedRecorderKeycode {
  const keyId = mapKeyboardEventToKeyId(event);
  return resolveKeycode(keyId);
}

export function formatKeyLabel(keyId: string): string {
  return resolveKeycode(keyId).displayLabel;
}

export function toHexCode(code: number): string {
  return `0x${code.toString(16).toUpperCase().padStart(4, '0')}`;
}

export function recorderKeyMeta(): Record<string, string> {
  return {
    keyEncoding: 'via',
    catalogVersion,
  };
}
