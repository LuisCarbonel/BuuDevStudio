import type { Step } from '@shared/models/device';
import {
  SequenceItem,
  KeyItem,
  DelayItem,
  StrokeType,
  isKeyItem,
  isDelayItem,
  generateId,
  DEFAULT_DELAY_MS,
  DEFAULT_HOLD_MS,
} from './recorder-sequence.model';
import {
  resolveKeycode,
  toHexCode,
} from './recorder-keycode.util';

/**
 * Recorder Sequence Adapter
 * 
 * Converts between the canonical Step[] format used by StudioStateService
 * and the UI-first SequenceItem[] format used by the Recorder.
 */

/**
 * Convert canonical steps to recorder items
 */
export function fromSteps(steps: Step[]): SequenceItem[] {
  const items: SequenceItem[] = [];

  for (const step of steps) {
    const op = step.op.toUpperCase();

    switch (op) {
      case 'WAIT':
      case 'DELAY': {
        const ms = parseInt(step.arg || '100', 10);
        items.push({
          id: generateId(),
          kind: 'delay',
          ms: isNaN(ms) ? DEFAULT_DELAY_MS : ms,
          defaultMs: isNaN(ms) ? DEFAULT_DELAY_MS : ms,
        } as DelayItem);
        break;
      }

      case 'TAP':
      case 'KEY':
      case 'PRESS': {
        items.push(createKeyItemFromArg(step.arg || '', 'full'));
        break;
      }

      case 'KD':
      case 'KEY_DOWN':
      case 'KEYDOWN':
      case 'DOWN': {
        items.push(createKeyItemFromArg(step.arg || '', 'down'));
        break;
      }

      case 'KU':
      case 'KEY_UP':
      case 'KEYUP':
      case 'UP': {
        items.push(createKeyItemFromArg(step.arg || '', 'up'));
        break;
      }

      default: {
        // Unknown op - treat as a key tap with the op as label
        const fallback = resolveKeycode(op);
        items.push({
          id: generateId(),
          kind: 'key',
          keyId: fallback.keyId,
          displayLabel: step.name || fallback.displayLabel,
          deviceCode: fallback.deviceCode,
          stroke: 'full',
          holdMs: DEFAULT_HOLD_MS,
          defaultHoldMs: DEFAULT_HOLD_MS,
        } as KeyItem);
        break;
      }
    }
  }

  return items;
}

/**
 * Convert recorder items back to canonical steps
 */
export function toSteps(items: SequenceItem[]): Step[] {
  const steps: Step[] = [];
  let stepId = 1;

  for (const item of items) {
    if (isDelayItem(item)) {
      steps.push({
        id: stepId++,
        name: `Wait ${item.ms}ms`,
        op: 'WAIT',
        arg: String(item.ms),
        class: 1, // Class 1 indicates timing-related step
      });
    } else if (isKeyItem(item)) {
      const op = strokeToOp(item.stroke);
      const name = buildStepName(op, item.displayLabel);
      const arg =
        item.deviceCode != null
          ? toHexCode(item.deviceCode)
          : item.keyId;

      steps.push({
        id: stepId++,
        name,
        op,
        arg,
      });

      // If it's a full tap with custom hold time, add delay after
      if (item.stroke === 'full' && item.holdMs && item.holdMs > 0) {
        // Note: For now we don't insert hold delays as they're implicit
        // in the TAP operation. This could be extended if needed.
      }
    }
  }

  return steps;
}

/**
 * Helper to create a KeyItem from a step argument
 */
function createKeyItemFromArg(arg: string, stroke: StrokeType): KeyItem {
  const { keyId, displayLabel, deviceCode } = resolveKeycode(arg.trim() || 'UNKNOWN');

  return {
    id: generateId(),
    kind: 'key',
    keyId,
    displayLabel,
    deviceCode,
    stroke,
    holdMs: stroke === 'full' ? DEFAULT_HOLD_MS : undefined,
    defaultHoldMs: stroke === 'full' ? DEFAULT_HOLD_MS : undefined,
  };
}

/**
 * Convert stroke type to canonical op
 */
function strokeToOp(stroke: StrokeType): string {
  switch (stroke) {
    case 'full':
      return 'TAP';
    case 'down':
      return 'KD';
    case 'up':
      return 'KU';
    default:
      return 'TAP';
  }
}

/**
 * Build step name from op and label
 */
function buildStepName(op: string, label: string): string {
  switch (op) {
    case 'TAP':
      return `Tap: ${label}`;
    case 'KD':
      return `Key Down: ${label}`;
    case 'KU':
      return `Key Up: ${label}`;
    default:
      return `${op}: ${label}`;
  }
}






