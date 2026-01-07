import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';

import { BindingIndicator, DeviceViewComponent } from '@shared/ui/device-view/device-view.component';
import type { NormalizedLayout } from '@shared/utils/layout/models';

@Component({
  selector: 'app-editor-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule, DeviceViewComponent, DragDropModule, NzSegmentedModule],
  templateUrl: './editor-canvas.component.html',
  styleUrl: './editor-canvas.component.scss',
})
export class EditorCanvasComponent {
  @Input() normalizedLayout: NormalizedLayout | null = null;
  @Input() layoutUnitPx = 50;
  @Input() layoutSelectionId: string | null = null;
  @Input() hoveredElementId: string | null = null;
  @Input() layerOptions: number[] = [];
  @Input() activeLayer = 1;
  @Input() bindingIndicators: Record<string, BindingIndicator> = {};
  @Input() canvasView: 'device' | 'sequence' = 'device';
  @Input() hasSequence = false;
  @Input() keycodeLabels: Record<string, { primary: string; secondary?: string }> = {};
  @Input() encoderLabels: Record<string, { ccw: { primary: string; secondary?: string } | null; cw: { primary: string; secondary?: string } | null; press: { primary: string; secondary?: string } | null }> = {};
  @Input() libraryOpen = true;

  @Output() toggleLibrary = new EventEmitter<boolean>();
  @Output() select = new EventEmitter<string>();
  @Output() deselect = new EventEmitter<void>();
  @Output() hover = new EventEmitter<string | null>();
  @Output() assignDrop = new EventEmitter<{ targetId: string; payload: unknown }>();
  @Output() canvasViewChange = new EventEmitter<'device' | 'sequence'>();
  @Output() selectLayer = new EventEmitter<number>();

  readonly viewOptions = [
    { label: 'Full', value: 'full' },
    { label: 'Hide Library', value: 'hide' },
  ];

  get segmentValue(): 'full' | 'hide' {
    return this.libraryOpen ? 'full' : 'hide';
  }

  onViewChange(value: 'full' | 'hide') {
    const wantOpen = value === 'full';
    this.toggleLibrary.emit(wantOpen);
  }

  onAssignDrop(targetId: string, payload: unknown) {
    this.assignDrop.emit({ targetId, payload });
  }

  setView(view: 'device' | 'sequence') {
    if (view === 'sequence' && !this.hasSequence) return;
    this.canvasViewChange.emit(view);
  }

  canvasEnterPredicate = (drag: { data?: unknown }) => {
    const data = drag?.data as any;
    return this.isAssignablePayload(data);
  };

  onCanvasDropped(event: CdkDragDrop<unknown>) {
    const payload = (event.item && (event.item as any).data) ?? null;
    if (!this.isAssignablePayload(payload)) return;
    const targetId = this.hoveredElementId;
    if (!targetId) return;
    this.assignDrop.emit({ targetId, payload });
  }

  private isAssignablePayload(payload: any): payload is { kind: string } {
    if (!payload || typeof payload !== 'object') return false;
    return payload.kind === 'block' || payload.kind === 'sequence';
  }
}
