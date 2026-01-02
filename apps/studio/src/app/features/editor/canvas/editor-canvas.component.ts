import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BindingIndicator, DeviceViewComponent } from '../../../shared/device-view/device-view';

@Component({
  selector: 'app-editor-canvas',
  standalone: true,
  imports: [CommonModule, DeviceViewComponent],
  templateUrl: './editor-canvas.component.html',
  styleUrl: './editor-canvas.component.scss',
})
export class EditorCanvasComponent {
  @Input() normalizedLayout: any | null = null;
  @Input() layoutMode: 'view' | 'edit' = 'view';
  @Input() layoutEditable = true;
  @Input() layoutUnitPx = 50;
  @Input() layoutSelectionId: string | null = null;
  @Input() hoveredElementId: string | null = null;
  @Input() bindingIndicators: Record<string, BindingIndicator> = {};
  @Input() canvasView: 'device' | 'sequence' = 'device';
  @Input() hasSequence = false;

  @Output() toggleLayoutMode = new EventEmitter<void>();
  @Output() select = new EventEmitter<string>();
  @Output() deselect = new EventEmitter<void>();
  @Output() hover = new EventEmitter<string | null>();
  @Output() moveDelta = new EventEmitter<{ id: string; dx: number; dy: number }>();
  @Output() moveEnd = new EventEmitter<{ id: string; x: number; y: number }>();
  @Output() assignDrop = new EventEmitter<{ targetId: string; payload: unknown }>();
  @Output() canvasViewChange = new EventEmitter<'device' | 'sequence'>();

  onAssignDrop(targetId: string, payload: unknown) {
    this.assignDrop.emit({ targetId, payload });
  }

  onMoveEnd(ev: { id: string; x: number; y: number }) {
    this.moveEnd.emit(ev);
  }

  setView(view: 'device' | 'sequence') {
    if (view === 'sequence' && !this.hasSequence) return;
    this.canvasViewChange.emit(view);
  }
}
