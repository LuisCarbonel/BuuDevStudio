import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { KeyItem, StrokeType } from '../recorder-sequence.model';

@Component({
  selector: 'app-recorder-key-inspector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSegmentedModule,
    NzInputNumberModule,
    NzButtonModule,
  ],
  templateUrl: './recorder-key-inspector.component.html',
  styleUrl: './recorder-key-inspector.component.scss',
})
export class RecorderKeyInspectorComponent {
  @Input({ required: true }) item!: KeyItem;

  @Output() strokeChange = new EventEmitter<StrokeType>();
  @Output() holdMsChange = new EventEmitter<number>();
  @Output() reset = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  readonly strokeOptions = [
    { label: 'Full', value: 'full' as StrokeType },
    { label: 'Down', value: 'down' as StrokeType },
    { label: 'Up', value: 'up' as StrokeType },
  ];

  get strokeHint(): string {
    switch (this.item.stroke) {
      case 'full':
        return 'Press and release the key (tap)';
      case 'down':
        return 'Press and hold the key';
      case 'up':
        return 'Release the key';
      default:
        return '';
    }
  }

  get canReset(): boolean {
    const strokeChanged = this.item.stroke !== 'full';
    const holdChanged = this.item.holdMs !== this.item.defaultHoldMs;
    return strokeChanged || holdChanged;
  }

  onStrokeChange(stroke: StrokeType) {
    this.strokeChange.emit(stroke);
  }

  onHoldMsChange(ms: number) {
    this.holdMsChange.emit(ms);
  }
}
