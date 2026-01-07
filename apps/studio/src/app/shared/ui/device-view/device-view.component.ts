import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, effect, Signal } from '@angular/core';
import { CdkDropList } from '@angular/cdk/drag-drop';

import { Bounds, ControlElement, KeyElement, NormalizedLayout } from '@shared/utils/layout/models';
import { DropTargetDirective } from '@shared/directives/drop-target.directive';
import { DragMonitorService } from '@shared/utils/drag-monitor.service';
import { KeycodeLabel } from '@shared/utils/keycode-label';

export interface BindingIndicator {
  label: string;
}

export interface EncoderLabelSet {
  ccw: KeycodeLabel | null;
  cw: KeycodeLabel | null;
  press: KeycodeLabel | null;
}

@Component({
  selector: 'app-device-view',
  standalone: true,
  imports: [CommonModule, DropTargetDirective],
  templateUrl: './device-view.component.html',
  styleUrls: ['./device-view.component.scss'],
})
export class DeviceViewComponent implements OnInit, OnDestroy {
  @Input() layout: NormalizedLayout | null = null;
  @Input() selection: string | null = null;
  @Input() hoverId: string | null = null;
  @Input() unitPx = 50; // u ƒ+' px scale for rendered size when needed
  @Input() padding = 1; // u padding around computed bounds
  @Input() dropConnectedTo: Array<string | CdkDropList<unknown>> = [];
  @Input() dropEnabled = true;
  @Input() bindingIndicators: Record<string, BindingIndicator> = {};
  @Input() keycodeLabels: Record<string, KeycodeLabel> = {};
  @Input() encoderLabels: Record<string, EncoderLabelSet> = {};
  @Input() showDebugLabels = false;

  @Output() select = new EventEmitter<string>();
  @Output() hover = new EventEmitter<string | null>();
  @Output() controlAction = new EventEmitter<{ id: string; action: 'cw' | 'ccw' | 'press' | string }>();
  @Output() assignDrop = new EventEmitter<{ targetId: string; payload: unknown }>();
  @Output() deselect = new EventEmitter<void>();

  @ViewChild('svgRoot', { static: true }) svgRoot?: ElementRef<SVGSVGElement>;

  private dragHoverId: string | null = null;
  private dragPayload: unknown = null;
  private keyGapX = 0.14;
  private keyGapY = 0.20;
  private rowGap = 0.35;
  hoverTargetId: string | null = null;
  
  // Cache SVG transform matrix to prevent layout thrashing
  private cachedCTM: DOMMatrix | null = null;
  private rafId: number | null = null;

  constructor(private dragMonitor: DragMonitorService) {
    effect(() => {
      const state = this.dragMonitor.state();
      
      if (!state.active) {
        // Cancel pending RAF
        if (this.rafId !== null) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
        
        // Calculate hit test ONCE at drop (not continuously during drag)
        if (this.dragPayload != null && state.pointer) {
          // Refresh transforms at drop time to handle window resize/scale changes.
          this.updateCachedTransforms();
          const pos = this.pointerToLayoutUnits(state.pointer);
          if (pos) {
            const target = this.hitTest(pos.x, pos.y);
            if (target) {
              console.info('[drag] drop hit', { dragId: state.dragId, target });
              this.assignDrop.emit({ targetId: target, payload: this.dragPayload });
            } else {
              console.info('[drag] drop miss', { dragId: state.dragId });
            }
          } else {
            console.info('[drag] drop miss', { dragId: state.dragId, reason: 'no-svg-coords' });
          }
        } else if (this.dragPayload != null) {
          console.info('[drag] drop miss', { dragId: state.dragId, reason: 'no-pointer' });
        }
        
        this.dragHoverId = null;
        this.dragPayload = null;
        this.hover.emit(null);
        return;
      }
      
      this.dragPayload = state.payload;
      // Skip continuous hover updates during drag for performance
    });
  }

  get viewBox(): string {
    const b = this.layout?.bounds;
    if (!b) return '0 0 10 10';
    const minX = b.minX - this.padding;
    const minY = b.minY - this.padding;
    const width = b.width + this.padding * 2;
    const height = b.height + this.padding * 2 + this.maxRowOffset();
    return `${minX} ${minY} ${width} ${height}`;
  }

  keyClasses(key: KeyElement): Record<string, boolean> {
    const selection = this.normalizeTargetId(this.selection);
    const hoverId = this.normalizeTargetId(this.hoverId);
    return {
      selected: selection === key.elementId,
      hovered: hoverId === key.elementId,
      bound: !!this.bindingIndicators?.[key.elementId],
    };
  }

  logCatalogStats(): void {
    import('@shared/utils/keycodes/catalog').then(catalog => {
      const stats = catalog.getCatalogStats();
      console.log('📚 Keycode Catalog Stats:', stats);
    });
  }

  controlClasses(ctrl: ControlElement): Record<string, boolean> {
    const selection = this.normalizeTargetId(this.selection);
    const hoverId = this.normalizeTargetId(this.hoverId);
    return {
      selected: selection === ctrl.elementId,
      hovered: hoverId === ctrl.elementId,
      bound: this.hasBindingIndicator(ctrl.elementId),
    };
  }

  onSelectControl(ev: PointerEvent, ctrl: ControlElement) {
    this.select.emit(this.controlTargetId(ctrl, ev));
  }

  onSelect(id: string) {
    this.select.emit(id);
  }

  onHover(id: string | null) {
    this.hoverTargetId = id;
    this.hover.emit(this.normalizeTargetId(id));
  }

  onAssign(targetId: string, payload: unknown) {
    this.assignDrop.emit({ targetId, payload });
  }

  onBackgroundClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const hit = target.closest('.key, .control, .drop-hit');
    if (hit) return;

    const b = this.layout?.bounds;
    const pos = this.pointerToLayoutUnits({ x: ev.clientX, y: ev.clientY });
    if (b && pos) {
      const insideBounds = pos.x >= b.minX && pos.x <= b.maxX && pos.y >= b.minY && pos.y <= b.maxY;
      if (insideBounds) return;
    }

    this.deselect.emit();
  }

  boundsStyle(b: Bounds | undefined) {
    if (!b) return {};
    return {
      width: `${(b.width + this.padding * 2) * this.unitPx}px`,
      height: `${(b.height + this.padding * 2 + this.maxRowOffset()) * this.unitPx}px`,
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

  encoderLabelText(label: KeycodeLabel | null | undefined): string {
    if (!label) return '--';
    return label.primary || label.secondary || '--';
  }

  topLabelForKey(key: KeyElement): string | null {
    return key.matrixId ?? null;
  }

  topLabelForControl(ctrl: ControlElement): string | null {
    // Encoder blocks: show direction arrows
    if (this.isEncoderControl(ctrl)) {
      const role = this.encoderRole(ctrl);
      if (role === 'ccw') return '<--';
      if (role === 'cw') return '-->';
      return null;
    }
    // Plain blocks: show matrix hint if present
    if (ctrl.kind === 'block' && ctrl.matrixHint) {
      return ctrl.matrixHint;
    }
    return null;
  }

  encoderRole(ctrl: ControlElement): 'ccw' | 'cw' | 'press' | null {
    if (!this.isEncoderControl(ctrl)) return null;
    const layout = this.layout;
    if (!layout) return null;
    const encoderId = ctrl.encoderId;
    if (encoderId === undefined || encoderId === null) return null;
    const group = layout.controls.filter(
      c => this.isEncoderControl(c) && c.encoderId === encoderId
    );
    if (group.length <= 1) return null;

    let press: ControlElement | null = null;
    if (group.length >= 3) {
      press = group.reduce((acc, item) => (item.y > acc.y ? item : acc), group[0]);
    }
    if (press && press.elementId === ctrl.elementId) return 'press';

    const remaining = press ? group.filter(c => c.elementId !== press?.elementId) : group;
    const left = remaining.reduce((acc, item) => (item.x < acc.x ? item : acc), remaining[0]);
    const right = remaining.reduce((acc, item) => (item.x > acc.x ? item : acc), remaining[0]);
    if (ctrl.elementId === left.elementId) return 'ccw';
    if (ctrl.elementId === right.elementId) return 'cw';
    return null;
  }

  encoderRoleLabel(ctrl: ControlElement, labels: EncoderLabelSet): string {
    const role = this.encoderRole(ctrl);
    if (!role) return '';
    const label =
      role === 'ccw' ? labels.ccw : role === 'cw' ? labels.cw : labels.press;
    return this.encoderLabelText(label);
  }

  encoderHoverLabel(targetId: string): string | null {
    const base = targetId.split('#')[0];
    const ctrl = this.layout?.controls.find(c => c.elementId === base);
    if (!ctrl || !this.isEncoderControl(ctrl)) return null;
    if (targetId.endsWith('#ccw')) return 'CCW';
    if (targetId.endsWith('#cw')) return 'CW';
    return 'Press';
  }

  dropStyle(el: KeyElement | ControlElement): Record<string, string> {
    const b = this.layout?.bounds;
    if (!b) return {};
    const rect = this.renderRect(el);
    const left = (rect.x - b.minX + this.padding) * this.unitPx;
    const top = (rect.y - b.minY + this.padding) * this.unitPx;
    const width = rect.w * this.unitPx;
    const height = rect.h * this.unitPx;
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  }

  encoderDropTargets(ctrl: ControlElement): Array<{ id: string; style: Record<string, string> }> {
    if (!this.isEncoderControl(ctrl)) return [];
    const role = this.encoderRole(ctrl);
    if (role) {
      const targetId = role === 'press' ? ctrl.elementId : `${ctrl.elementId}#${role}`;
      return [{ id: targetId, style: this.dropStyle(ctrl) }];
    }
    const rect = this.renderRect(ctrl);
    const b = this.layout?.bounds;
    if (!b) return [];

    // Widen CCW/CW hit areas to make drops easier (45% each, 10% press)
    const dirFraction = 0.45;
    const pressFraction = 1 - dirFraction * 2;
    const heights = [rect.h * dirFraction, rect.h * pressFraction, rect.h * dirFraction];

    const makeStyle = (segmentIdx: number): Record<string, string> => {
      const left = (rect.x - b.minX + this.padding) * this.unitPx;
      const top =
        (rect.y - b.minY + this.padding + heights.slice(0, segmentIdx).reduce((a, v) => a + v, 0)) *
        this.unitPx;
      const width = rect.w * this.unitPx;
      const height = heights[segmentIdx] * this.unitPx;
      return {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      };
    };

    return [
      { id: `${ctrl.elementId}#ccw`, style: makeStyle(0) },
      { id: ctrl.elementId, style: makeStyle(1) },
      { id: `${ctrl.elementId}#cw`, style: makeStyle(2) },
    ];
  }

  ngOnInit(): void {
    // Cache CTM on init and setup ResizeObserver
    this.updateCachedTransforms();
    
    if (typeof ResizeObserver !== 'undefined' && this.svgRoot) {
      const ro = new ResizeObserver(() => {
        this.updateCachedTransforms();
      });
      ro.observe(this.svgRoot.nativeElement);
    }
  }

  ngOnDestroy(): void {
    // Cancel any pending RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  // Cache SVG transform to prevent layout thrashing
  private updateCachedTransforms() {
    if (!this.svgRoot) return;
    const svg = this.svgRoot.nativeElement;
    this.cachedCTM = svg.getScreenCTM();
  }

  private pointerToLayoutUnits(pointer: { x: number; y: number }): { x: number; y: number } | null {
    // Use cached CTM instead of recalculating on every move
    if (!this.cachedCTM || !this.svgRoot) return null;
    
    const svg = this.svgRoot.nativeElement;
    const pt = svg.createSVGPoint();
    pt.x = pointer.x;
    pt.y = pointer.y;
    const transformed = pt.matrixTransform(this.cachedCTM.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  private hitTest(x: number, y: number): string | null {
    if (!this.layout) return null;
    const { keys, controls } = this.layout;
    const all = [...keys, ...controls];
    for (const el of all) {
      const rect = this.renderRect(el);
      const inside = x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
      if (!inside) continue;
        if (this.isEncoderControl(el as ControlElement)) {
          const role = this.encoderRole(el as ControlElement);
          if (role) {
            return role === 'press' ? el.elementId : `${el.elementId}#${role}`;
          }
        const dirFraction = 0.45;
        if (y < rect.y + rect.h * dirFraction) return `${el.elementId}#ccw`;
        if (y >= rect.y + rect.h * (1 - dirFraction)) return `${el.elementId}#cw`;
        return el.elementId;
        }
      return el.elementId;
    }
    return null;
  }

  renderRect(el: KeyElement | ControlElement): { x: number; y: number; w: number; h: number } {
    const gapYForSize = Math.min(this.keyGapY * 0.5, 0.20); // soften height reduction; main separation comes from SCSS margin
    const w = Math.max(0.25, el.w - this.keyGapX);
    const h = Math.max(0.25, el.h - gapYForSize);
    return {
      x: el.x + this.keyGapX / 2,
      y: el.y + this.keyGapY / 2 + this.rowOffset(el),
      w,
      h,
    };
  }

  private rowOffset(el: KeyElement | ControlElement): number {
    const row = Math.max(0, Math.floor(el.y));
    return row * this.rowGap;
  }

  private maxRowOffset(): number {
    if (!this.layout) return 0;
    const elements = [...this.layout.keys, ...this.layout.controls];
    let maxRow = 0;
    elements.forEach(el => {
      const row = Math.max(0, Math.floor(el.y));
      if (row > maxRow) maxRow = row;
    });
    return maxRow * this.rowGap;
  }

  private normalizeTargetId(id: string | null | undefined): string | null {
    if (!id) return null;
    const idx = id.indexOf('#');
    return idx >= 0 ? id.slice(0, idx) : id;
  }

  private isEncoderControl(ctrl: ControlElement): boolean {
    return !!ctrl.flags?.encoder || ctrl.kind === 'encoder-block' || ctrl.kind === 'encoder' || ctrl.kind === 'knob';
  }

  private hasBindingIndicator(baseId: string): boolean {
    if (this.bindingIndicators?.[baseId]) return true;
    if (this.bindingIndicators?.[`${baseId}#ccw`]) return true;
    if (this.bindingIndicators?.[`${baseId}#cw`]) return true;
    return false;
  }

  private controlTargetId(ctrl: ControlElement, ev: PointerEvent): string {
    if (!this.isEncoderControl(ctrl)) return ctrl.elementId;
    const role = this.encoderRole(ctrl);
    if (role) return role === 'press' ? ctrl.elementId : `${ctrl.elementId}#${role}`;
    const pos = this.pointerToLayoutUnits({ x: ev.clientX, y: ev.clientY });
    if (!pos) return ctrl.elementId;
    const rect = this.renderRect(ctrl);
    if (pos.x < rect.x || pos.x > rect.x + rect.w || pos.y < rect.y || pos.y > rect.y + rect.h) {
      return ctrl.elementId;
    }
    const relY = pos.y - rect.y;
    const dirFraction = 0.45;
    if (relY < rect.h * dirFraction) return `${ctrl.elementId}#ccw`;
    if (relY > rect.h * (1 - dirFraction)) return `${ctrl.elementId}#cw`;
    return ctrl.elementId;
  }
}
