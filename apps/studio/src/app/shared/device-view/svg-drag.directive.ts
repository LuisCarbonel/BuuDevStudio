import { Directive, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

interface DragState {
  active: boolean;
  id: string | null;
  lastX: number;
  lastY: number;
}

@Directive({
  selector: '[appSvgDrag]',
  standalone: true,
})
export class SvgDragDirective {
  @Input() appSvgDragEnabled = true;
  @Input() appSvgDragId = '';
  @Input() appSvgDragUnitPx = 50;
  @Input() appSvgDragSnapStep: number | null = null; // in u

  @Output() appSvgDragStart = new EventEmitter<{ id: string; x: number; y: number }>();
  @Output() appSvgDragMove = new EventEmitter<{ id: string; dx: number; dy: number; x: number; y: number }>();
  @Output() appSvgDragEnd = new EventEmitter<{ id: string; x: number; y: number }>();

  private state: DragState = { active: false, id: null, lastX: 0, lastY: 0 };

  constructor(private el: ElementRef<SVGGraphicsElement>) {}

  @HostListener('pointerdown', ['$event'])
  onPointerDown(ev: PointerEvent) {
    if (!this.appSvgDragEnabled) return;
    const svgCoords = this.toSvgCoords(ev);
    if (!svgCoords) return;
    this.state = { active: true, id: this.appSvgDragId, lastX: svgCoords.x, lastY: svgCoords.y };
    this.el.nativeElement.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    this.appSvgDragStart.emit({ id: this.appSvgDragId, x: svgCoords.x, y: svgCoords.y });
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(ev: PointerEvent) {
    if (!this.state.active) return;
    const svgCoords = this.toSvgCoords(ev);
    if (!svgCoords) return;
    const dx = svgCoords.x - this.state.lastX;
    const dy = svgCoords.y - this.state.lastY;
    const snapped = this.applySnap(dx, dy);
    this.state.lastX = svgCoords.x;
    this.state.lastY = svgCoords.y;
    ev.preventDefault();
    this.appSvgDragMove.emit({ id: this.appSvgDragId, dx: snapped.dx, dy: snapped.dy, x: svgCoords.x, y: svgCoords.y });
  }

  @HostListener('pointerup', ['$event'])
  @HostListener('pointercancel', ['$event'])
  onPointerEnd(ev: PointerEvent) {
    if (!this.state.active) return;
    const svgCoords = this.toSvgCoords(ev) || { x: this.state.lastX, y: this.state.lastY };
    this.state.active = false;
    this.el.nativeElement.releasePointerCapture(ev.pointerId);
    ev.preventDefault();
    this.appSvgDragEnd.emit({ id: this.appSvgDragId, x: svgCoords.x, y: svgCoords.y });
  }

  private toSvgCoords(ev: PointerEvent): { x: number; y: number } | null {
    const svg = (this.el.nativeElement.ownerSVGElement ||
      (this.el.nativeElement as any).closest?.('svg')) as SVGSVGElement | null;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  private applySnap(dx: number, dy: number): { dx: number; dy: number } {
    if (!this.appSvgDragSnapStep || this.appSvgDragSnapStep <= 0) {
      return { dx, dy };
    }
    const snap = this.appSvgDragSnapStep;
    const snapValue = (v: number) => Math.round(v / snap) * snap;
    return { dx: snapValue(dx), dy: snapValue(dy) };
  }
}
