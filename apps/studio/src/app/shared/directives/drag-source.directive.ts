import { Directive, Input, OnChanges, OnDestroy } from '@angular/core';
import { CdkDrag, CdkDragMove } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { DragMonitorService } from '@shared/utils/drag-monitor.service';

@Directive({
  selector: '[appDragSource]',
  standalone: true,
  hostDirectives: [CdkDrag],
})
export class DragSourceDirective implements OnChanges, OnDestroy {
  @Input('appDragSource') data!: unknown;
  @Input() appDragSourceDisabled = false;
  @Input() appDragRootElement: string | undefined;
  @Input() appDragBoundary: string | undefined;
  @Input() appDragCancelOnExit = false;
  @Input() appDragAutoReset = true;

  private subs: Subscription[] = [];
  private lastPointer: { x: number; y: number } | null = null;
  private rafId: number | null = null;

  constructor(private cdkDrag: CdkDrag<unknown>, private dragMonitor: DragMonitorService) {
    this.cdkDrag.previewClass = 'studio-drag-preview';

    this.subs.push(
      this.cdkDrag.started.subscribe(() => {
        this.setPlaceholderClass();
        this.setRootDragging(true);
        this.lastPointer = null;
        this.dragMonitor.startDrag(this.data);
      }),
      this.cdkDrag.ended.subscribe((ev) => {
        const event = ev.event as PointerEvent | MouseEvent;
        if (event) {
          this.cleanup({ x: event.clientX, y: event.clientY });
          return;
        }
        this.cleanup();
      }),
      this.cdkDrag.released.subscribe(() => this.cleanup()),
      this.cdkDrag.exited.subscribe(() => {
        if (this.appDragCancelOnExit) {
          this.cleanup();
        }
      }),
      this.cdkDrag.moved.subscribe((ev: CdkDragMove) => {
        this.lastPointer = ev.pointerPosition;
        if (this.rafId !== null) return;
        this.rafId = requestAnimationFrame(() => {
          this.rafId = null;
          if (this.lastPointer) {
            this.dragMonitor.updatePointer(this.lastPointer);
          }
        });
      })
    );
  }

  ngOnChanges(): void {
    this.cdkDrag.data = this.data;
    this.cdkDrag.disabled = this.appDragSourceDisabled;
  }

  ngOnDestroy(): void {
    this.setRootDragging(false);
    this.subs.forEach(s => s.unsubscribe());
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private cleanup(finalPointer?: { x: number; y: number }) {
    if (this.appDragAutoReset) {
      this.cdkDrag.reset();
    }
    this.setRootDragging(false);
    this.dragMonitor.endDrag(finalPointer ?? this.lastPointer ?? undefined);
    this.lastPointer = null;
  }

  private setPlaceholderClass() {
    const placeholder = this.cdkDrag.getPlaceholderElement?.();
    if (placeholder) {
      placeholder.classList.add('studio-drag-placeholder');
    }
  }

  private setRootDragging(active: boolean) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (active) {
      root.classList.add('dragging');
    } else {
      root.classList.remove('dragging');
    }
  }
}
