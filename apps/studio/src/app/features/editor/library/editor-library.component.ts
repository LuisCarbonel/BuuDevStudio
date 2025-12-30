import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { DragSourceDirective } from '../../../directives/drag-source.directive';
import { Profile } from '../../../services/studio-state.service';

interface ProfileItem {
  id: string;
  name: string;
}

interface SequanceItem {
  id: string;
  name: string;
}

@Component({
  selector: 'app-editor-library',
  standalone: true,
  imports: [CommonModule, DragDropModule, DragSourceDirective],
  templateUrl: './editor-library.component.html',
  styleUrl: './editor-library.component.scss',
})
export class EditorLibraryComponent {
  @Input() profiles: ProfileItem[] = [];
  @Input() selectedProfileId: string | null = null;
  @Input() sequancesForProfile: SequanceItem[] = [];
  @Input() selectedSequanceId: string | null = null;
  @Input() actions: string[] = [];
  @Input() presets: string[] = [];
  @Input() focusMode = false;

  @Output() selectProfile = new EventEmitter<string>();
  @Output() selectSequance = new EventEmitter<string>();
  get selectedProfileName(): string {
    if (!this.selectedProfileId) {
      return '';
    }
    return this.profiles.find(p => p.id === this.selectedProfileId)?.name ?? '';
  }
}
