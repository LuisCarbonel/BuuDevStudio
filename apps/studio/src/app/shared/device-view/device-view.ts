import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CdkDropList } from '@angular/cdk/drag-drop';

import { Bounds, ControlElement, KeyElement, NormalizedLayout } from '../layout/models';
import { SvgDragDirective } from './svg-drag.directive';
import { DropTargetDirective } from '../../directives/drop-target.directive';
import { DragMonitorService } from '../../services/drag-monitor.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-device-view',
  standalone: true,
  imports: [CommonModule, SvgDragDirective, DropTargetDirective],
  templateUrl: './device-view.html',
  styleUrls: ['./device-view.scss'],
})
export class DeviceViewComponent implements OnInit, OnDestroy {
  @Input() layout: NormalizedLayout | null = null;
  @Input() selection: string | null = null;
  @Input() hoverId: string | null = null;
  @Input() mode: 'view' | 'edit' = 'view';
  @Input() unitPx = 50; // u → px scale for rendered size when needed
  @Input() padding = 1; // u padding around computed bounds
  @Input() dropConnectedTo: Array<string | CdkDropList<unknown>> = [];
  @Input() dropEnabled = true;

  @Output() select = new EventEmitter<string>();
  @Output() hover = new EventEmitter<string | null>();
  @Output() moveDelta = new EventEmitter<{ id: string; dx: number; dy: number }>();
  @Output() controlAction = new EventEmitter<{ id: string; action: 'cw' | 'ccw' | 'press' | string }>();
  @Output() assignDrop = new EventEmitter<{ targetId: string; payload: unknown }>();
  @Output() deselect = new EventEmitter<void>();

  @ViewChild('svgRoot', { static: true }) svgRoot?: ElementRef<SVGSVGElement>;

  private dragSub?: Subscription;
  private dragHoverId: string | null = null;
  private dragPayload: unknown = null;

  constructor(private dragMonitor: DragMonitorService) {}

  get viewBox(): string {
    const b = this.layout?.bounds;
    if (!b) return '0 0 10 10';
    const minX = b.minX - this.padding;
    const minY = b.minY - this.padding;
    const width = b.width + this.padding * 2;
    const height = b.height + this.padding * 2;
    return `${minX} ${minY} ${width} ${height}`;
  }

  keyClasses(key: KeyElement): Record<string, boolean> {
    return {
      selected: this.selection === key.elementId,
      hovered: this.hoverId === key.elementId,
      dragging: false,
    };
  }

  controlClasses(ctrl: ControlElement): Record<string, boolean> {
    return {
      selected: this.selection === ctrl.elementId,
      hovered: this.hoverId === ctrl.elementId,
      dragging: false,
    };
  }

  onSelect(id: string) {
    this.select.emit(id);
  }

  onHover(id: string | null) {
    this.hover.emit(id);
  }

  onDragMove(ev: { id: string; dx: number; dy: number }) {
    this.moveDelta.emit(ev);
  }

  onAssign(targetId: string, payload: unknown) {
    this.assignDrop.emit({ targetId, payload });
  }

  onBackgroundClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const hit = target.closest('.key, .control, .drop-hit');
    if (hit) return;
    this.deselect.emit();
  }

  boundsStyle(b: Bounds | undefined) {
    if (!b) return {};
    return {
      width: `${(b.width + this.padding * 2) * this.unitPx}px`,
      height: `${(b.height + this.padding * 2) * this.unitPx}px`,
    };
  }

  controlLabel(ctrl: ControlElement): string {
    if (ctrl.flags?.encoder) {
      const encoders = this.layout?.controls.filter(c => c.flags?.encoder) ?? [];
      const idx = encoders.findIndex(c => c.elementId === ctrl.elementId);
      return idx >= 0 ? `E${idx + 1}` : 'ENC';
    }
    return 'CTRL';
  }

  dropStyle(el: KeyElement | ControlElement): Record<string, string> {
    const b = this.layout?.bounds;
    if (!b) return {};
    const left = (el.x - b.minX + this.padding) * this.unitPx;
    const top = (el.y - b.minY + this.padding) * this.unitPx;
    const width = el.w * this.unitPx;
    const height = el.h * this.unitPx;
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  }

  ngOnInit(): void {
    this.dragSub = this.dragMonitor.state$.subscribe(state => {
      if (!state.active) {
        if (this.dragHoverId && this.dragPayload != null) {
          this.assignDrop.emit({ targetId: this.dragHoverId, payload: this.dragPayload });
        }
        this.dragHoverId = null;
        this.dragPayload = null;
        this.hover.emit(null);
        return;
      }
      this.dragPayload = state.payload;
      if (!state.pointer) return;
      const pos = this.pointerToLayoutUnits(state.pointer);
      if (!pos) return;
      const target = this.hitTest(pos.x, pos.y);
      this.dragHoverId = target;
      this.hover.emit(target);
    });
  }

  ngOnDestroy(): void {
    this.dragSub?.unsubscribe();
  }

  private pointerToLayoutUnits(pointer: { x: number; y: number }): { x: number; y: number } | null {
    if (!this.svgRoot) return null;
    const svg = this.svgRoot.nativeElement;
    const pt = svg.createSVGPoint();
    pt.x = pointer.x;
    pt.y = pointer.y;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  private hitTest(x: number, y: number): string | null {
    if (!this.layout) return null;
    const { keys, controls } = this.layout;
    const all = [...keys, ...controls];
    for (const el of all) {
      const inside = x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h;
      if (inside) return el.elementId;
    }
    return null;
  }
}
