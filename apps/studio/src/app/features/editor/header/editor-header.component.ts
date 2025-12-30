import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editor-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor-header.component.html',
  styleUrl: './editor-header.component.scss',
})
export class EditorHeaderComponent {
  @Input() selectedProfileName: string | null = null;
  @Input() selectedScriptName: string | null = null;
  @Input() activeLayer = 1;
  @Input() libraryOpen = true;
  @Input() focusMode = false;

  @Output() toggleLibrary = new EventEmitter<void>();
  @Output() toggleFocus = new EventEmitter<void>();
}
