import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-editor-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor.page.html',
  styleUrl: './editor.page.scss',
})
export class EditorPage {
  libraryOpen = true;

  profiles = [
    { name: 'Default', active: true },
    { name: 'Apex', active: false },
    { name: 'TacOps', active: false },
  ];

  scripts = [
    { name: 'Sprint + Strafe', profile: 'Apex' },
    { name: 'Loot Routine', profile: 'Apex' },
    { name: 'Bunnyhop', profile: 'Default' },
  ];

  actions = ['Wait', 'Key Down', 'Key Up', 'Tap', 'Mouse', 'If / Else', 'Set Variable', 'Loop'];

  presets = ['Micro-gap', 'Jitter pattern', 'Burst tap', 'Fast strafes'];

  activeProfile = this.profiles.find(p => p.active) ?? this.profiles[0];
  activeScript = this.scripts[0];

  steps = [
    { id: 1, name: 'Wait 120ms', op: 'WAIT', arg: '120', class: 1 },
    { id: 2, name: 'Key Down: W', op: 'KD', arg: 'W' },
    { id: 3, name: 'Tap: E', op: 'TAP', arg: 'E' },
  ];

  selectedStepId: number | null = null;

  toggleLibrary() {
    this.libraryOpen = !this.libraryOpen;
  }

  selectStep(id: number) {
    this.selectedStepId = id;
  }

  get selectedStep() {
    return this.steps.find(s => s.id === this.selectedStepId) ?? null;
  }
}
