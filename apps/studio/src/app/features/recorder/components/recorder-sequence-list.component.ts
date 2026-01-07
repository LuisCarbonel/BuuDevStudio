import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDrag, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { SequenceItem, isKeyItem, isDelayItem, KeyItem, DelayItem } from '../recorder-sequence.model';

@Component({
  selector: 'app-recorder-sequence-list',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    NzDropDownModule,
    NzMenuModule,
  ],
  templateUrl: './recorder-sequence-list.component.html',
  styleUrl: './recorder-sequence-list.component.scss',
})
export class RecorderSequenceListComponent {
  @Input() items: SequenceItem[] = [];
  @Input() selectedId: string | null = null;

  @Output() select = new EventEmitter<string | null>();
  @Output() reorder = new EventEmitter<{ fromIndex: number; toIndex: number }>();
  @Output() itemAction = new EventEmitter<{ item: SequenceItem; action: 'duplicate' | 'remove' }>();
  @Output() addDelay = new EventEmitter<void>();

  isKey = isKeyItem;
  isDelay = isDelayItem;

  asKey(item: SequenceItem): KeyItem {
    return item as KeyItem;
  }

  asDelay(item: SequenceItem): DelayItem {
    return item as DelayItem;
  }

  getStrokeIcon(stroke: string): string {
    switch (stroke) {
      case 'down': return '↓';
      case 'up': return '↑';
      default: return '⎆';
    }
  }

  trackById(index: number, item: SequenceItem): string {
    return item.id;
  }

  onDrop(event: CdkDragDrop<SequenceItem[]>) {
    if (event.previousIndex !== event.currentIndex) {
      this.reorder.emit({
        fromIndex: event.previousIndex,
        toIndex: event.currentIndex,
      });
    }
  }

  onSelect(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.select.emit(id);
  }

  onListClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('sequence-list')) {
      this.select.emit(null);
    }
  }

  onItemAction(item: SequenceItem, action: 'duplicate' | 'remove') {
    this.itemAction.emit({ item, action });
  }
}
