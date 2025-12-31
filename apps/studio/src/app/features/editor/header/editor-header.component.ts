import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { FormsModule } from '@angular/forms';
import { NgStyleInterface } from 'ng-zorro-antd/core/types';

@Component({
  selector: 'app-editor-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzDropDownModule,
    NzIconModule,
    NzMenuModule,
    NzSegmentedModule,
    NzToolTipModule,
  ],
  templateUrl: './editor-header.component.html',
  styleUrl: './editor-header.component.scss',
})
export class EditorHeaderComponent implements OnChanges, AfterViewInit {
  @Input() connected = false;
  @Input() busy = false;
  @Input() running = false;
  @Input() ramLoaded = false;
  @Input() dirty = false;
  @Input() appliedInSync = false;
  @Input() deviceName: string | null = null;
  @Input() sessionId: string | null = null;
  @Input() revision: number | null = null;
  @Input() layerOptions: number[] = [];
  @Input() activeLayer = 1;
  @Input() libraryOpen = true;
  @Input() devices: { id: string; name: string }[] = [];
  @Input() selectedDeviceId: string | null = null;

  @Output() toggleLibrary = new EventEmitter<void>();
  @Output() selectLayer = new EventEmitter<number>();
  @Output() connect = new EventEmitter<void>();
  @Output() connectDevice = new EventEmitter<string>();
  @Output() disconnect = new EventEmitter<void>();
  @Output() upload = new EventEmitter<void>();
  @Output() revert = new EventEmitter<void>();
  @Output() commit = new EventEmitter<void>();
  @Output() run = new EventEmitter<void>();
  @Output() stopAll = new EventEmitter<void>();

  viewOptions = [
    { label: 'Full', value: 'full' },
    { label: 'Hide Library', value: 'hide' },
  ];
  segmentValue: 'full' | 'hide' = 'full';
  layerOverlayStyle: NgStyleInterface = {};
  actionsOverlayStyle: NgStyleInterface = {};

  @ViewChild('layerBtn') layerBtn?: ElementRef<HTMLElement>;
  @ViewChild('actionsBtn') actionsBtn?: ElementRef<HTMLElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['libraryOpen']) {
      this.segmentValue = this.libraryOpen ? 'full' : 'hide';
    }
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.syncOverlayWidths());
  }

  @HostListener('window:resize')
  syncOverlayWidths() {
    this.layerOverlayStyle = this.computeOverlayStyle(this.layerBtn);
    this.actionsOverlayStyle = this.computeOverlayStyle(this.actionsBtn);
  }

  onViewChange(value: 'full' | 'hide') {
    const wantOpen = value === 'full';
    // Toggle library even if clicking the same option, since there are only two states.
    if (wantOpen === this.libraryOpen) {
      this.toggleLibrary.emit();
      return;
    }
    this.toggleLibrary.emit();
  }

  private computeOverlayStyle(el?: ElementRef<HTMLElement>): NgStyleInterface {
    const width = el?.nativeElement?.offsetWidth;
    return width ? { width: `${width}px`, 'min-width': `${width}px` } : {};
  }
}
