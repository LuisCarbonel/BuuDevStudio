import { Injectable, signal, computed } from '@angular/core';
import {
  SequenceItem,
  KeyItem,
  DelayItem,
  isKeyItem,
  isDelayItem,
  createDelayItem,
  DEFAULT_DELAY_MS,
} from './recorder-sequence.model';

export interface RecorderSequenceState {
  items: SequenceItem[];
  selectedId: string | null;
  dirty: boolean;
  sourceSequenceId: string | null;
}

const initialState: RecorderSequenceState = {
  items: [],
  selectedId: null,
  dirty: false,
  sourceSequenceId: null,
};

@Injectable()
export class RecorderSequenceStore {
  private readonly _state = signal<RecorderSequenceState>(initialState);

  // Readonly state access
  readonly state = this._state.asReadonly();

  // Computed selectors
  readonly items = computed(() => this._state().items);
  readonly selectedId = computed(() => this._state().selectedId);
  readonly dirty = computed(() => this._state().dirty);
  readonly sourceSequenceId = computed(() => this._state().sourceSequenceId);

  readonly selectedItem = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.items().find(item => item.id === id) ?? null;
  });

  readonly selectedIndex = computed(() => {
    const id = this.selectedId();
    if (!id) return -1;
    return this.items().findIndex(item => item.id === id);
  });

  readonly itemCount = computed(() => this.items().length);

  readonly hasSelection = computed(() => this.selectedId() !== null);

  // Actions

  /**
   * Replace all items (e.g., when loading a sequence)
   */
  setItems(items: SequenceItem[], sourceSequenceId: string | null = null) {
    this._state.set({
      items,
      selectedId: null,
      dirty: false,
      sourceSequenceId,
    });
  }

  /**
   * Select an item by ID
   */
  select(id: string | null) {
    this._state.update(state => ({
      ...state,
      selectedId: id,
    }));
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.select(null);
  }

  /**
   * Patch a single item by ID
   */
  patchItem(id: string, partial: Partial<KeyItem> | Partial<DelayItem>) {
    this._state.update(state => ({
      ...state,
      dirty: true,
      items: state.items.map(item => {
        if (item.id !== id) return item;
        return { ...item, ...partial } as SequenceItem;
      }),
    }));
  }

  /**
   * Move an item from one index to another
   */
  moveItem(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;

    this._state.update(state => {
      const items = [...state.items];
      const [removed] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, removed);
      return {
        ...state,
        dirty: true,
        items,
      };
    });
  }

  /**
   * Insert a delay after a specific item or at an index
   */
  insertDelay(afterId: string | null = null, ms: number = DEFAULT_DELAY_MS) {
    const delay = createDelayItem(ms);

    this._state.update(state => {
      let insertIndex = state.items.length;

      if (afterId) {
        const idx = state.items.findIndex(item => item.id === afterId);
        if (idx !== -1) {
          insertIndex = idx + 1;
        }
      }

      const items = [...state.items];
      items.splice(insertIndex, 0, delay);

      return {
        ...state,
        dirty: true,
        items,
        selectedId: delay.id,
      };
    });

    return delay.id;
  }

  /**
   * Insert a key item after a specific item or at an index
   */
  insertKey(keyItem: KeyItem, afterId: string | null = null) {
    this._state.update(state => {
      let insertIndex = state.items.length;

      if (afterId) {
        const idx = state.items.findIndex(item => item.id === afterId);
        if (idx !== -1) {
          insertIndex = idx + 1;
        }
      }

      const items = [...state.items];
      items.splice(insertIndex, 0, keyItem);

      return {
        ...state,
        dirty: true,
        items,
        selectedId: keyItem.id,
      };
    });

    return keyItem.id;
  }

  /**
   * Append an item to the end
   */
  appendItem(item: SequenceItem) {
    this._state.update(state => ({
      ...state,
      dirty: true,
      items: [...state.items, item],
    }));
  }

  /**
   * Remove an item by ID
   */
  removeItem(id: string) {
    this._state.update(state => {
      const idx = state.items.findIndex(item => item.id === id);
      if (idx === -1) return state;

      const items = state.items.filter(item => item.id !== id);

      // If removed item was selected, clear selection or select adjacent
      let selectedId = state.selectedId;
      if (selectedId === id) {
        if (items.length === 0) {
          selectedId = null;
        } else if (idx >= items.length) {
          selectedId = items[items.length - 1].id;
        } else {
          selectedId = items[idx].id;
        }
      }

      return {
        ...state,
        dirty: true,
        items,
        selectedId,
      };
    });
  }

  /**
   * Reset an item to its default values
   */
  resetToDefault(id: string) {
    this._state.update(state => ({
      ...state,
      dirty: true,
      items: state.items.map(item => {
        if (item.id !== id) return item;

        if (isKeyItem(item)) {
          return {
            ...item,
            holdMs: item.defaultHoldMs,
            stroke: 'full' as const,
          };
        }

        if (isDelayItem(item)) {
          return {
            ...item,
            ms: item.defaultMs ?? DEFAULT_DELAY_MS,
          };
        }

        return item;
      }),
    }));
  }

  /**
   * Clear all items
   */
  clear() {
    this._state.set({
      ...initialState,
      dirty: this._state().items.length > 0,
    });
  }

  /**
   * Duplicate selected item
   */
  duplicateSelected() {
    const selected = this.selectedItem();
    if (!selected) return;

    const duplicate: SequenceItem = {
      ...selected,
      id: `${selected.id}-dup-${Date.now()}`,
    };

    this._state.update(state => {
      const idx = state.items.findIndex(item => item.id === selected.id);
      const items = [...state.items];
      items.splice(idx + 1, 0, duplicate);

      return {
        ...state,
        dirty: true,
        items,
        selectedId: duplicate.id,
      };
    });
  }

  /**
   * Duplicate a specific item by ID
   */
  duplicateItem(id: string) {
    const item = this.items().find(i => i.id === id);
    if (!item) return;
    const duplicate: SequenceItem = {
      ...item,
      id: `${id}-dup-${Date.now()}`,
    };

    this._state.update(state => {
      const idx = state.items.findIndex(i => i.id === id);
      const items = [...state.items];
      items.splice(idx + 1, 0, duplicate);
      return {
        ...state,
        dirty: true,
        items,
        selectedId: duplicate.id,
      };
    });
  }

  /**
   * Mark as saved (clear dirty flag)
   */
  markSaved() {
    this._state.update(state => ({
      ...state,
      dirty: false,
    }));
  }

  /**
   * Update stroke type for a key item
   */
  setStroke(id: string, stroke: 'full' | 'down' | 'up') {
    const item = this.items().find(i => i.id === id);
    if (!item || !isKeyItem(item)) return;

    this.patchItem(id, { stroke });
  }

  /**
   * Update hold duration for a key item
   */
  setHoldMs(id: string, holdMs: number) {
    const item = this.items().find(i => i.id === id);
    if (!item || !isKeyItem(item)) return;

    this.patchItem(id, { holdMs });
  }

  /**
   * Update delay duration
   */
  setDelayMs(id: string, ms: number) {
    const item = this.items().find(i => i.id === id);
    if (!item || !isDelayItem(item)) return;

    this.patchItem(id, { ms });
  }
}








