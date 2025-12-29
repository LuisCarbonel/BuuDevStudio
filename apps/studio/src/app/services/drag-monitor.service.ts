import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface DragState {
  active: boolean;
  payload: unknown;
  pointer: { x: number; y: number } | null;
}

@Injectable({ providedIn: 'root' })
export class DragMonitorService {
  private stateSubject = new BehaviorSubject<DragState>({ active: false, payload: null, pointer: null });
  readonly state$ = this.stateSubject.asObservable();

  startDrag(payload: unknown) {
    this.stateSubject.next({ active: true, payload, pointer: null });
  }

  updatePointer(pointer: { x: number; y: number }) {
    const current = this.stateSubject.getValue();
    if (!current.active) return;
    this.stateSubject.next({ ...current, pointer });
  }

  endDrag() {
    this.stateSubject.next({ active: false, payload: null, pointer: null });
  }
}
