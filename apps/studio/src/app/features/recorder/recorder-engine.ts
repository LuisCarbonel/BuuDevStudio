import { Injectable, signal, computed, NgZone, inject } from '@angular/core';
import {
  SequenceItem,
  KeyItem,
  DelayItem,
  createKeyItem,
  createDelayItem,
  DEFAULT_DELAY_MS,
} from './recorder-sequence.model';
import { parseKeyFromEvent } from './recorder-keycode.util';

export interface RecordingOptions {
  /** Minimum gap (ms) between events to insert an automatic delay */
  minGapForDelay: number;
  /** Capture key down/up separately (with delays between) or as taps */
  captureMode: 'tap' | 'separate';
  /** Filter out modifier-only keys */
  filterModifiers: boolean;
}

const DEFAULT_OPTIONS: RecordingOptions = {
  minGapForDelay: 20,
  captureMode: 'separate',
  filterModifiers: false,
};

interface KeyState {
  keyId: string;
  displayLabel: string;
  deviceCode: number | null;
  downTime: number;
}

@Injectable()
export class RecorderEngine {
  private readonly zone = inject(NgZone);

  // State
  private readonly _recording = signal(false);
  private readonly _items = signal<SequenceItem[]>([]);
  private readonly _options = signal<RecordingOptions>(DEFAULT_OPTIONS);

  // Track key states for timing
  private keyStates = new Map<string, KeyState>();
  private lastEventTime = 0;

  // Bound handlers for cleanup
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;

  // Public signals
  readonly recording = this._recording.asReadonly();
  readonly items = this._items.asReadonly();
  readonly options = this._options.asReadonly();
  readonly itemCount = computed(() => this._items().length);

  /**
   * Start recording keyboard events
   */
  start(options?: Partial<RecordingOptions>) {
    if (this._recording()) return;

    // TODO: Support global hooks so recording works when the app isn't focused.

    // Merge options
    this._options.set({ ...DEFAULT_OPTIONS, ...options });
    
    // Reset state
    this._items.set([]);
    this.keyStates.clear();
    this.lastEventTime = 0;

    // Create bound handlers
    this.boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.boundKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);

    // Add listeners (outside Angular zone for performance)
    this.zone.runOutsideAngular(() => {
      document.addEventListener('keydown', this.boundKeyDown!, true);
      document.addEventListener('keyup', this.boundKeyUp!, true);
    });

    this._recording.set(true);
  }

  /**
   * Stop recording and return captured items
   */
  stop(): SequenceItem[] {
    if (!this._recording()) return this._items();

    // Remove listeners
    if (this.boundKeyDown) {
      document.removeEventListener('keydown', this.boundKeyDown, true);
      this.boundKeyDown = null;
    }
    if (this.boundKeyUp) {
      document.removeEventListener('keyup', this.boundKeyUp, true);
      this.boundKeyUp = null;
    }

    // Flush any held keys
    this.flushHeldKeys();

    this._recording.set(false);
    return this._items();
  }

  /**
   * Clear recorded items
   */
  clear() {
    this._items.set([]);
  }

  /**
   * Get current items
   */
  getItems(): SequenceItem[] {
    return this._items();
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Skip if already tracking this key (repeat)
    if (event.repeat) return;
    if (this.keyStates.has(event.code)) return;

    // Filter modifiers if enabled
    const opts = this._options();
    if (opts.filterModifiers && this.isModifierOnly(event)) return;

    // Prevent default for most keys during recording
    if (!this.shouldAllowDefault(event)) {
      event.preventDefault();
      event.stopPropagation();
    }

    const now = performance.now();
    const { keyId, displayLabel, deviceCode } = parseKeyFromEvent(event);

    // Insert delay since last event if needed
    this.maybeInsertDelay(now);

    // Track key state
    this.keyStates.set(event.code, {
      keyId,
      displayLabel,
      deviceCode,
      downTime: now,
    });

    // In separate mode, emit key down immediately
    if (opts.captureMode === 'separate') {
      this.zone.run(() => {
        this.appendItem(createKeyItem(keyId, displayLabel, 'down', undefined, deviceCode));
      });
    }

    this.lastEventTime = now;
  }

  private handleKeyUp(event: KeyboardEvent) {
    const state = this.keyStates.get(event.code);
    if (!state) return;

    // Prevent default
    if (!this.shouldAllowDefault(event)) {
      event.preventDefault();
      event.stopPropagation();
    }

    const now = performance.now();
    const holdDuration = Math.round(now - state.downTime);
    const opts = this._options();

    this.keyStates.delete(event.code);

    this.zone.run(() => {
      if (opts.captureMode === 'tap') {
        // Emit as a full tap with hold duration
        const keyItem = createKeyItem(state.keyId, state.displayLabel, 'full', holdDuration, state.deviceCode);
        this.appendItem(keyItem);
      } else {
        // In separate mode:
        // 1. Insert delay (time key was held down)
        if (holdDuration >= opts.minGapForDelay) {
          this.appendItem(createDelayItem(holdDuration));
        }
        // 2. Emit key up
        this.appendItem(createKeyItem(state.keyId, state.displayLabel, 'up', undefined, state.deviceCode));
      }
    });

    this.lastEventTime = now;
  }

  private maybeInsertDelay(now: number) {
    if (this.lastEventTime === 0) return;

    const gap = Math.round(now - this.lastEventTime);
    const opts = this._options();

    if (gap >= opts.minGapForDelay) {
      this.zone.run(() => {
        this.appendItem(createDelayItem(gap));
      });
    }
  }

  private flushHeldKeys() {
    // Any keys still held when stopping
    const opts = this._options();
    const now = performance.now();
    
    this.keyStates.forEach((state) => {
      const holdDuration = Math.round(now - state.downTime);
      
      if (opts.captureMode === 'tap') {
        // Emit as tap
        this.appendItem(createKeyItem(state.keyId, state.displayLabel, 'full', holdDuration, state.deviceCode));
      } else {
        // In separate mode, key down was already emitted
        // Add delay and key up
        if (holdDuration >= opts.minGapForDelay) {
          this.appendItem(createDelayItem(holdDuration));
        }
        this.appendItem(createKeyItem(state.keyId, state.displayLabel, 'up', undefined, state.deviceCode));
      }
    });

    this.keyStates.clear();
  }

  private appendItem(item: SequenceItem) {
    this._items.update(items => [...items, item]);
  }

  private isModifierOnly(event: KeyboardEvent): boolean {
    const modifierCodes = [
      'ShiftLeft', 'ShiftRight',
      'ControlLeft', 'ControlRight',
      'AltLeft', 'AltRight',
      'MetaLeft', 'MetaRight',
    ];
    return modifierCodes.includes(event.code);
  }

  private shouldAllowDefault(event: KeyboardEvent): boolean {
    // Allow some system shortcuts
    if (event.metaKey || event.ctrlKey) {
      // Allow Cmd/Ctrl+R (refresh), Cmd/Ctrl+Shift+I (dev tools)
      if (event.key === 'r' || event.key === 'R') return true;
      if (event.key === 'i' || event.key === 'I') return true;
      if (event.key === 'c' || event.key === 'C') return true; // Copy
      if (event.key === 'v' || event.key === 'V') return true; // Paste
    }
    return false;
  }
}
