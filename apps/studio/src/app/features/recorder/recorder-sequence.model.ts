/**
 * Recorder Sequence Data Model
 * 
 * UI-first representation of sequence items that mirrors the recorder UI 1:1.
 * This model is designed for easy editing, selection, and drag reordering.
 */

export type StrokeType = 'full' | 'down' | 'up';

export interface KeyItem {
  id: string;
  kind: 'key';
  /** Canonical key identifier (e.g., 'KC_A') */
  keyId: string;
  /** Human-readable label for UI */
  displayLabel: string;
  /** Device-facing keycode (e.g., VIA/QMK encoded) */
  deviceCode: number | null;
  /** Stroke type: full tap, key down only, or key up only */
  stroke: StrokeType;
  /** Hold duration in milliseconds (only applies to 'full' stroke) */
  holdMs?: number;
  /** Default hold duration for reset functionality */
  defaultHoldMs?: number;
}

export interface DelayItem {
  id: string;
  kind: 'delay';
  /** Delay duration in milliseconds */
  ms: number;
  /** Default delay for reset functionality */
  defaultMs?: number;
}

// Future extension point
export interface GroupItem {
  id: string;
  kind: 'group';
  label: string;
  items: SequenceItem[];
}

export type SequenceItem = KeyItem | DelayItem;

// Type guards
export function isKeyItem(item: SequenceItem): item is KeyItem {
  return item.kind === 'key';
}

export function isDelayItem(item: SequenceItem): item is DelayItem {
  return item.kind === 'delay';
}

// Factory functions
export function createKeyItem(
  keyId: string,
  displayLabel: string,
  stroke: StrokeType = 'full',
  holdMs?: number,
  deviceCode: number | null = null
): KeyItem {
  const resolvedHold = stroke === 'full' ? (holdMs ?? DEFAULT_HOLD_MS) : holdMs;
  return {
    id: generateId(),
    kind: 'key',
    keyId,
    displayLabel,
    deviceCode,
    stroke,
    holdMs: resolvedHold,
    defaultHoldMs: resolvedHold,
  };
}

export function createDelayItem(ms: number = 100): DelayItem {
  return {
    id: generateId(),
    kind: 'delay',
    ms,
    defaultMs: ms,
  };
}

let idCounter = 0;
export function generateId(): string {
  return `rec-${Date.now()}-${++idCounter}`;
}

// Default values
export const DEFAULT_DELAY_MS = 100;
export const DEFAULT_HOLD_MS = 50;








