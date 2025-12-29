import { Directive, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CdkDropList, CdkDragDrop } from '@angular/cdk/drag-drop';

@Directive({
  selector: '[appDropTarget]',
  standalone: true,
  hostDirectives: [
    {
      directive: CdkDropList,
      inputs: ['cdkDropListConnectedTo: appDropTargetConnectedTo', 'cdkDropListSortingDisabled: appDropTargetSortingDisabled'],
    },
  ],
})
export class DropTargetDirective implements OnChanges {
  @Input('appDropTarget') targetId!: unknown;
  @Output() appDropTargetAssign = new EventEmitter<unknown>();

  constructor(private dropList: CdkDropList<unknown>) {
    this.dropList.dropped.subscribe((ev: CdkDragDrop<unknown>) => {
      const payload = ev.item.data;
      if (payload !== undefined && payload !== null) {
        this.appDropTargetAssign.emit(payload);
      }
    });
  }

  ngOnChanges(): void {
    this.dropList.data = this.targetId;
  }
}
