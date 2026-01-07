import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SequenceItem, isKeyItem, isDelayItem, KeyItem, DelayItem, StrokeType } from '../recorder-sequence.model';
import { RecorderKeyInspectorComponent } from './recorder-key-inspector.component';
import { RecorderDelayInspectorComponent } from './recorder-delay-inspector.component';
import { RecorderEmptyInspectorComponent } from './recorder-empty-inspector.component';

@Component({
  selector: 'app-recorder-inspector',
  standalone: true,
  imports: [
    CommonModule,
    RecorderKeyInspectorComponent,
    RecorderDelayInspectorComponent,
    RecorderEmptyInspectorComponent,
  ],
  templateUrl: './recorder-inspector.component.html',
  styleUrl: './recorder-inspector.component.scss',
})
export class RecorderInspectorComponent {
  @Input() selectedItem: SequenceItem | null = null;

  @Output() strokeChange = new EventEmitter<StrokeType>();
  @Output() holdMsChange = new EventEmitter<number>();
  @Output() delayMsChange = new EventEmitter<number>();
  @Output() resetItem = new EventEmitter<void>();
  @Output() removeItem = new EventEmitter<void>();

  isKey = isKeyItem;
  isDelay = isDelayItem;

  asKey(item: SequenceItem): KeyItem {
    return item as KeyItem;
  }

  asDelay(item: SequenceItem): DelayItem {
    return item as DelayItem;
  }

  onStrokeChange(stroke: StrokeType) {
    this.strokeChange.emit(stroke);
  }

  onHoldMsChange(ms: number) {
    this.holdMsChange.emit(ms);
  }

  onDelayMsChange(ms: number) {
    this.delayMsChange.emit(ms);
  }
}
