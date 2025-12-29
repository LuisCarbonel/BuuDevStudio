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
  focusMode = false;
  libraryOpen = true;
  private prevLibraryOpen = true;

  profiles = [
    { id: 'p-default', name: 'Default', active: true },
    { id: 'p-apex', name: 'Apex', active: false },
    { id: 'p-tacops', name: 'TacOps', active: false },
  ];

  scripts = [
    {
      id: 's-sprint',
      profileId: 'p-apex',
      name: 'Sprint + Strafe',
      steps: [
        { id: 1, name: 'Wait 120ms', op: 'WAIT', arg: '120', class: 1 },
        { id: 2, name: 'Key Down: W', op: 'KD', arg: 'W' },
        { id: 3, name: 'Tap: E', op: 'TAP', arg: 'E' },
      ],
    },
    {
      id: 's-loot',
      profileId: 'p-apex',
      name: 'Loot Routine',
      steps: [
        { id: 1, name: 'Wait 80ms', op: 'WAIT', arg: '80', class: 1 },
        { id: 2, name: 'Tap: F', op: 'TAP', arg: 'F' },
      ],
    },
    {
      id: 's-bhop',
      profileId: 'p-default',
      name: 'Bunnyhop',
      steps: [
        { id: 1, name: 'Tap: SPACE', op: 'TAP', arg: 'SPACE' },
        { id: 2, name: 'Wait 30ms', op: 'WAIT', arg: '30', class: 1 },
        { id: 3, name: 'Tap: SPACE', op: 'TAP', arg: 'SPACE' },
      ],
    },
  ];

  actions = ['Wait', 'Key Down', 'Key Up', 'Tap', 'Mouse', 'If / Else', 'Set Variable', 'Loop'];

  presets = ['Micro-gap', 'Jitter pattern', 'Burst tap', 'Fast strafes'];

  selectedProfileId = (this.profiles.find(p => p.active) ?? this.profiles[0]).id;
  selectedScriptId = this.scripts.find(s => s.profileId === this.selectedProfileId)?.id ?? this.scripts[0].id;
  selectedStepId: number | null = null;

  toggleLibrary() {
    this.libraryOpen = !this.libraryOpen;
  }

  toggleFocus() {
    const next = !this.focusMode;
    if (next) {
      this.prevLibraryOpen = this.libraryOpen;
      this.libraryOpen = false;
    } else {
      this.libraryOpen = this.prevLibraryOpen;
    }
    this.focusMode = next;
  }

  selectStep(id: number) {
    this.selectedStepId = id;
  }

  get selectedStep() {
    return this.currentSteps.find(s => s.id === this.selectedStepId) ?? null;
  }

  selectProfile(profileId: string) {
    this.selectedProfileId = profileId;
    const firstScript = this.scriptsForProfile[0];
    this.selectedScriptId = firstScript?.id ?? null;
    this.selectedStepId = null;
  }

  selectScript(scriptId: string) {
    this.selectedScriptId = scriptId;
    this.selectedStepId = null;
  }

  get selectedProfile() {
    return this.profiles.find(p => p.id === this.selectedProfileId) ?? null;
  }

  get scriptsForProfile() {
    return this.scripts.filter(s => s.profileId === this.selectedProfileId);
  }

  get selectedScript() {
    return this.scripts.find(s => s.id === this.selectedScriptId) ?? null;
  }

  get currentSteps() {
    return this.selectedScript?.steps ?? [];
  }
}
