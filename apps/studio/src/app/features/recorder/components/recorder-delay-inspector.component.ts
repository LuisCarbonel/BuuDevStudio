import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { DelayItem } from '../recorder-sequence.model';

@Component({
  selector: 'app-recorder-delay-inspector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzInputNumberModule,
    NzSliderModule,
    NzButtonModule,
  ],
  templateUrl: './recorder-delay-inspector.component.html',
  styleUrl: './recorder-delay-inspector.component.scss',
})
export class RecorderDelayInspectorComponent {
  @Input({ required: true }) item!: DelayItem;

  @Output() msChange = new EventEmitter<number>();
  @Output() reset = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  readonly presets = [20, 50, 100, 200, 500, 1000];

  readonly sliderMarks = {
    0: '0',
    500: '500',
    1000: '1s',
    2000: '2s',
  };

  get canReset(): boolean {
    return this.item.ms !== this.item.defaultMs;
  }

  onMsChange(ms: number) {
    this.msChange.emit(ms);
  }
}
