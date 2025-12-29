import { Directive, Input, OnChanges, OnDestroy } from '@angular/core';
import { CdkDrag, CdkDragMove } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { DragMonitorService } from '../services/drag-monitor.service';

@Directive({
  selector: '[appDragSource]',
  standalone: true,
  hostDirectives: [CdkDrag],
})
export class DragSourceDirective implements OnChanges, OnDestroy {
  @Input('appDragSource') data!: unknown;
  @Input() appDragSourceDisabled = false;

  private subs: Subscription[] = [];

  constructor(private cdkDrag: CdkDrag<unknown>, private dragMonitor: DragMonitorService) {
    this.subs.push(
      this.cdkDrag.started.subscribe(() => {
        this.setRootDragging(true);
        this.dragMonitor.startDrag(this.data);
      }),
      this.cdkDrag.ended.subscribe(() => {
        this.setRootDragging(false);
        this.dragMonitor.endDrag();
      }),
      this.cdkDrag.released.subscribe(() => {
        this.setRootDragging(false);
        this.dragMonitor.endDrag();
      }),
      this.cdkDrag.exited.subscribe(() => {
        this.setRootDragging(false);
        this.dragMonitor.endDrag();
      }),
      this.cdkDrag.moved.subscribe((ev: CdkDragMove) => {
        this.dragMonitor.updatePointer(ev.pointerPosition);
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
