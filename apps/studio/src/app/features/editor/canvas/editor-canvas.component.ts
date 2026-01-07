import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
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
export class EditorCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
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

  @ViewChild('canvasViewport') canvasViewport?: ElementRef<HTMLDivElement>;

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

  fitToCanvas = false;
  private fitUnitPx = 0;
  private viewportSize = { width: 0, height: 0 };
  private resizeObserver?: ResizeObserver;

  get effectiveUnitPx(): number {
    return this.fitToCanvas && this.fitUnitPx ? this.fitUnitPx : this.layoutUnitPx;
  }

  get segmentValue(): 'full' | 'hide' {
    return this.libraryOpen ? 'full' : 'hide';
  }

  onViewChange(value: 'full' | 'hide') {
    const wantOpen = value === 'full';
    this.toggleLibrary.emit(wantOpen);
    this.fitToCanvas = wantOpen;
    this.recalculateFitUnitPx();
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

  ngAfterViewInit(): void {
    const viewport = this.canvasViewport?.nativeElement;
    if (!viewport || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.updateViewportSize());
    this.resizeObserver.observe(viewport);
    this.updateViewportSize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['libraryOpen']) {
      this.fitToCanvas = this.libraryOpen;
    }
    if (changes['libraryOpen'] || changes['normalizedLayout']) {
      this.recalculateFitUnitPx();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private updateViewportSize() {
    const viewport = this.canvasViewport?.nativeElement;
    if (!viewport) return;
    this.viewportSize = {
      width: viewport.clientWidth,
      height: viewport.clientHeight,
    };
    this.recalculateFitUnitPx();
  }

  private recalculateFitUnitPx() {
    if (!this.fitToCanvas || !this.normalizedLayout) {
      this.fitUnitPx = 0;
      return;
    }
    const { width, height } = this.viewportSize;
    if (!width || !height) {
      this.fitUnitPx = 0;
      return;
    }

    const viewport = this.canvasViewport?.nativeElement;
    const fitPadding = this.readCssNumber(viewport, '--device-fit-padding', 24);
    const unitMin = this.readCssNumber(viewport, '--device-unitpx-min', 14);
    const unitMax = this.readCssNumber(viewport, '--device-unitpx-max', 42);

    const bounds = this.normalizedLayout.bounds;
    const paddingUnits = 1;
    const rowGap = 0.35;
    const maxRow = this.maxRowIndex(this.normalizedLayout);
    const rowOffset = maxRow * rowGap;

    const layoutWUnits = bounds.width + paddingUnits * 2;
    const layoutHUnits = bounds.height + paddingUnits * 2 + rowOffset;
    const availableW = Math.max(0, width - fitPadding * 2);
    const availableH = Math.max(0, height - fitPadding * 2);
    const candidate = Math.floor(Math.min(availableW / layoutWUnits, availableH / layoutHUnits));

    if (!Number.isFinite(candidate) || candidate <= 0) {
      this.fitUnitPx = 0;
      return;
    }

    this.fitUnitPx = Math.max(unitMin, Math.min(candidate, unitMax));
  }

  private maxRowIndex(layout: NormalizedLayout): number {
    const elements = [...layout.keys, ...layout.controls];
    let maxRow = 0;
    elements.forEach(el => {
      const row = Math.max(0, Math.floor(el.y));
      if (row > maxRow) maxRow = row;
    });
    return maxRow;
  }

  private readCssNumber(el: HTMLElement | undefined, name: string, fallback: number): number {
    if (!el || typeof window === 'undefined') return fallback;
    const value = getComputedStyle(el).getPropertyValue(name).trim();
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
