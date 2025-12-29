import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { StudioStateService } from '../../services/studio-state.service';

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

  actions = ['Wait', 'Key Down', 'Key Up', 'Tap', 'Mouse', 'If / Else', 'Set Variable', 'Loop'];

  presets = ['Micro-gap', 'Jitter pattern', 'Burst tap', 'Fast strafes'];

  constructor(private studio: StudioStateService) {}

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
    this.studio.selectStep(id);
  }

  get selectedStep() {
    return this.studio.currentSteps.find(s => s.id === this.selectedStepId) ?? null;
  }

  selectProfile(profileId: string) {
    this.studio.selectProfile(profileId);
  }

  selectScript(scriptId: string) {
    this.studio.selectScript(scriptId);
  }

  get selectedProfile() {
    return this.studio.selectedProfile;
  }

  get scriptsForProfile() {
    return this.studio.scriptsForProfile;
  }

  get selectedScript() {
    return this.studio.selectedScript;
  }

  get currentSteps() {
    return this.studio.currentSteps;
  }

  get profiles() {
    return this.studio.profiles;
  }

  get selectedProfileId() {
    return this.studio.selectedProfileId;
  }

  get selectedScriptId() {
    return this.studio.selectedScriptId;
  }

  get selectedStepId() {
    return this.studio.selectedStepId;
  }

  get activeLayer() {
    return this.studio.activeLayer;
  }

  get selectedBinding() {
    return this.studio.selectedBinding;
  }
}
