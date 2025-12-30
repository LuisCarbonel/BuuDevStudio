import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { StudioStateService } from '../../services/studio-state.service';
import { DeviceService } from '../../services/device.service';
import { Binding } from '../../shared/models/device';
import { DragSourceDirective } from '../../directives/drag-source.directive';
import { DeviceViewComponent } from '../../shared/device-view/device-view';
import { ControlElement, KeyElement } from '../../shared/layout/models';

@Component({
  selector: 'app-editor-page',
  standalone: true,
  imports: [CommonModule, DragDropModule, DragSourceDirective, DeviceViewComponent],
  templateUrl: './editor.page.html',
  styleUrl: './editor.page.scss',
})
export class EditorPage {
  focusMode = false;
  libraryOpen = true;
  private prevLibraryOpen = true;
  bindingScriptId: string | null = null;
  bindingType: 'scriptRef' | 'simpleAction' | 'inlineSequence' | 'program' | 'none' = 'scriptRef';
  bindingAction = '';
  bindingActionArg = '';
  bindingInlineText = '';
  bindingProgramPath = '';
  layoutMode: 'view' | 'edit' = 'view';
  layoutUnitPx = 50;
  hoveredElementId: string | null = null;
  layoutSelectionId: string | null = null;

  actions = ['Wait', 'Key Down', 'Key Up', 'Tap', 'Mouse', 'If / Else', 'Set Variable', 'Loop'];

  presets = ['Micro-gap', 'Jitter pattern', 'Burst tap', 'Fast strafes'];

  constructor(private studio: StudioStateService, private device: DeviceService) {}

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
    this.layoutSelectionId = null;
    this.hoveredElementId = null;
    this.bindingType = 'scriptRef';
    this.bindingScriptId = null;
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

  get targets() {
    return this.studio.targets;
  }

  get normalizedLayout() {
    return this.studio.normalizedLayout;
  }

  get selectedTargetId() {
    return this.studio.selectedTargetId;
  }

  get scripts() {
    return this.studio.scripts;
  }

  get assignedTargetIds() {
    return this.studio.assignedTargetIds;
  }

  selectTarget(id: string) {
    this.studio.setTarget(id);
    const binding = this.selectedBinding;
    this.bindingType = binding?.type ?? 'none';
    this.bindingScriptId =
      binding && binding.type === 'scriptRef' ? binding.scriptId : this.selectedScriptId ?? null;
    if (binding?.type === 'simpleAction') {
      this.bindingAction = binding.action;
      this.bindingActionArg = binding.arg ?? '';
    } else {
      this.bindingAction = '';
      this.bindingActionArg = '';
    }
    if (binding?.type === 'inlineSequence') {
      this.bindingInlineText = binding.steps.map(s => `${s.op} ${s.arg ?? ''}`.trim()).join('\n');
    } else {
      this.bindingInlineText = '';
    }
    if (binding?.type === 'program') {
      this.bindingProgramPath = binding.path;
    } else {
      this.bindingProgramPath = '';
    }
  }

  assignSelectedScriptToTarget() {
    if (!this.selectedTargetId) return;
    if (this.bindingType !== 'none' && this.bindingErrors.length) return;
    const layerId = this.activeLayer;
    switch (this.bindingType) {
      case 'scriptRef': {
        const scriptId = this.bindingScriptId || this.selectedScript?.id;
        if (!scriptId) return;
        this.studio.assignScriptToTarget(scriptId);
        this.device.pushBinding(layerId, this.selectedTargetId, { type: 'scriptRef', scriptId });
        break;
      }
      case 'simpleAction': {
        if (!this.bindingAction.trim()) return;
        this.studio.assignSimpleAction(this.bindingAction.trim(), this.bindingActionArg.trim() || undefined);
        this.device.pushBinding(layerId, this.selectedTargetId, {
          type: 'simpleAction',
          action: this.bindingAction.trim(),
          arg: this.bindingActionArg.trim() || undefined,
        });
        break;
      }
      case 'program': {
        if (!this.bindingProgramPath.trim()) return;
        this.studio.assignProgram(this.bindingProgramPath.trim());
        this.device.pushBinding(layerId, this.selectedTargetId, {
          type: 'program',
          path: this.bindingProgramPath.trim(),
        });
        break;
      }
      case 'inlineSequence': {
        const steps = this.parseInlineSequence(this.bindingInlineText);
        if (!steps.length) return;
        this.studio.assignInlineSequence(steps);
        this.device.pushBinding(layerId, this.selectedTargetId, { type: 'inlineSequence', steps });
        break;
      }
      case 'none':
        this.studio.clearBinding();
        this.device.pushBinding(layerId, this.selectedTargetId, { type: 'none' });
        break;
    }
  }

  clearBinding() {
    this.studio.clearBinding();
    this.bindingScriptId = null;
    this.bindingAction = '';
    this.bindingActionArg = '';
    this.bindingInlineText = '';
    this.bindingProgramPath = '';
    this.bindingType = 'none';
  }

  setLayer(layer: number) {
    this.studio.setLayer(layer);
  }

  onBindingScriptChange(value: string) {
    this.bindingScriptId = value;
  }

  scriptName(id: string | null) {
    if (!id) return '';
    return this.scripts.find(s => s.id === id)?.name ?? '';
  }

  get scriptBindingId(): string | null {
    const b = this.selectedBinding;
    return b && b.type === 'scriptRef' ? b.scriptId : null;
  }

  onDropAssign(targetId: string, payload: unknown) {
    const scriptId = payload as string | null;
    if (!scriptId) return;
    this.selectTarget(targetId);
    this.bindingType = 'scriptRef';
    this.bindingScriptId = scriptId;
    this.studio.assignScriptToTarget(scriptId);
  }

  onTargetKeydown(event: KeyboardEvent, targetId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectTarget(targetId);
    }
  }

  onLayerKeydown(event: KeyboardEvent, layer: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.setLayer(layer);
    }
  }

  toggleLayoutMode() {
    this.layoutMode = this.layoutMode === 'view' ? 'edit' : 'view';
  }

  onDeviceSelect(id: string) {
    this.layoutSelectionId = id;
    this.selectTarget(id);
  }

  onDeviceDeselect() {
    this.layoutSelectionId = null;
    this.hoveredElementId = null;
    this.studio.setTarget(null);
  }

  onDeviceHover(id: string | null) {
    this.hoveredElementId = id;
  }

  onDeviceMove(ev: { id: string; dx: number; dy: number }) {
    this.studio.offsetLayoutElement(ev.id, ev.dx, ev.dy);
  }

  onCanvasDeselect() {
    this.onDeviceDeselect();
  }

  get bindingErrors(): string[] {
    const errors: string[] = [];
    switch (this.bindingType) {
      case 'scriptRef': {
        const scriptId = this.bindingScriptId || this.selectedScript?.id;
        if (!scriptId) errors.push('Select a script to assign.');
        break;
      }
      case 'simpleAction':
        if (!this.bindingAction.trim()) {
          errors.push('Action is required.');
        }
        break;
      case 'program':
        if (!this.bindingProgramPath.trim()) {
          errors.push('Program path is required.');
        }
        break;
      case 'inlineSequence': {
        const steps = this.parseInlineSequence(this.bindingInlineText);
        if (!steps.length) {
          errors.push('Add at least one macro line (e.g., TAP KC_SPACE).');
        }
        break;
      }
      case 'none':
        break;
    }
    return errors;
  }

  parseInlineSequence(text: string) {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    return lines.map((line, idx) => {
      const [op, ...rest] = line.split(' ');
      return { id: idx + 1, name: line, op: op.toUpperCase(), arg: rest.join(' ') };
    });
  }

  get selectedLayoutElement(): KeyElement | ControlElement | null {
    const layout = this.normalizedLayout;
    if (!layout || !this.layoutSelectionId) return null;
    return (
      layout.keys.find(k => k.elementId === this.layoutSelectionId) ??
      layout.controls.find(c => c.elementId === this.layoutSelectionId) ??
      null
    );
  }

  isControlElement(el: KeyElement | ControlElement): el is ControlElement {
    return (el as ControlElement).kind !== undefined;
  }
}
