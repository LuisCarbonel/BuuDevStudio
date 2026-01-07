import { Injectable, signal, computed } from '@angular/core';

interface DragState {
  active: boolean;
  payload: unknown;
  pointer: { x: number; y: number } | null;
  dragId: number | null;
}

@Injectable({ providedIn: 'root' })
export class DragMonitorService {
  // Convert to signals
  private readonly _state = signal<DragState>({ active: false, payload: null, pointer: null, dragId: null });
  private dragSeq = 0;
  
  // Expose readonly signals
  readonly state = this._state.asReadonly();
  readonly isDragging = computed(() => this._state().active);

  startDrag(payload: unknown) {
    this.dragSeq += 1;
    const dragId = this.dragSeq;
    console.info('[drag] start', { dragId });
    this._state.set({ active: true, payload, pointer: null, dragId });
  }

  updatePointer(pointer: { x: number; y: number }) {
    const current = this._state();
    if (!current.active) return;
    this._state.set({ ...current, pointer });
  }

  endDrag(finalPointer?: { x: number; y: number }) {
    const current = this._state();
    // Preserve final pointer position for drop calculation
    const pointer = finalPointer || current.pointer;
    console.info('[drag] end', { dragId: current.dragId, hasPointer: !!pointer });
    this._state.set({ active: false, payload: current.payload, pointer, dragId: current.dragId });
    
    // Clear after a brief delay to allow drop handlers to run
    setTimeout(() => {
      this._state.set({ active: false, payload: null, pointer: null, dragId: null });
    }, 50);
  }
}
