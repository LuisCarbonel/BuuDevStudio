import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { Binding as StudioBinding, StudioStateService } from '../../services/studio-state.service';
import { DeviceService } from '../../services/device.service';
import { ControlElement, KeyElement } from '../../shared/layout/models';
import { BindingIndicator } from '../../shared/device-view/device-view';
import { EditorHeaderComponent } from './header/editor-header.component';
import { EditorLibraryComponent } from './library/editor-library.component';
import { EditorCanvasComponent } from './canvas/editor-canvas.component';
import { EditorInspectorComponent } from './inspector/editor-inspector.component';

@Component({
  selector: 'app-editor-page',
  standalone: true,
  imports: [
    CommonModule,
    EditorHeaderComponent,
    EditorLibraryComponent,
    EditorCanvasComponent,
    EditorInspectorComponent,
  ],
  templateUrl: './editor.page.html',
  styleUrl: './editor.page.scss',
})
export class EditorPage {
  libraryOpen = true;
  bindingSequanceId: string | null = null;
  bindingType: 'sequanceRef' | 'simpleAction' | 'inlineSequence' | 'program' | 'none' = 'sequanceRef';
  bindingAction = '';
  bindingActionArg = '';
  bindingInlineText = '';
  bindingProgramPath = '';
  layoutMode: 'view' | 'edit' = 'view';
  canvasView: 'device' | 'sequance' = 'device';
  hoveredElementId: string | null = null;
  layoutSelectionId: string | null = null;
  importBusy = false;

  actions = ['Wait', 'Key Down', 'Key Up', 'Tap', 'Mouse', 'If / Else', 'Set Variable', 'Loop'];

  presets = ['Micro-gap', 'Jitter pattern', 'Burst tap', 'Fast strafes'];

  constructor(public studio: StudioStateService, public device: DeviceService) {}

  toggleLibrary() {
    this.libraryOpen = !this.libraryOpen;
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
    this.bindingType = 'sequanceRef';
    this.bindingSequanceId = null;
    if (!this.selectedSequanceId) {
      this.canvasView = 'device';
    }
  }

  selectSequance(sequanceId: string) {
    this.studio.selectSequance(sequanceId);
  }

  get selectedProfile() {
    return this.studio.selectedProfile;
  }

  get sequancesForProfile() {
    return this.studio.sequancesForProfile;
  }

  get selectedSequance() {
    return this.studio.selectedSequance;
  }

  get currentSteps() {
    return this.studio.currentSteps;
  }

  get bindingIndicators(): Record<string, BindingIndicator> {
    const sequanceNames = new Map(this.sequancesForProfile.map(s => [s.id, s.name]));
    const indicators: Record<string, BindingIndicator> = {};
    Object.entries(this.studio.activeBindings).forEach(([targetId, binding]) => {
      if (!binding || binding.type === 'none') return;
      indicators[targetId] = this.bindingToIndicator(binding, sequanceNames);
    });
    return indicators;
  }

  get layoutUnitPx() {
    const bounds = this.normalizedLayout?.bounds;
    if (!bounds) return 60;
    const paddedWidth = bounds.width + 2; // padding already applied in device view
    const targetWidthPx = 900;
    const unit = targetWidthPx / paddedWidth;
    return Math.max(50, Math.min(unit, 110));
  }

  get profiles() {
    return this.studio.profiles;
  }

  get selectedProfileId() {
    return this.studio.selectedProfileId;
  }

  get selectedSequanceId() {
    return this.studio.selectedSequanceId;
  }

  get selectedStepId() {
    return this.studio.selectedStepId;
  }

  get activeLayer() {
    return this.studio.activeLayer;
  }

  get layerOptions(): number[] {
    return this.selectedProfile?.layers.map(l => l.id) ?? [];
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

  get deviceName() {
    return this.studio.snapshot.device.name;
  }

  get devices$() {
    return this.device.devices$;
  }

  get selectedDeviceId() {
    return this.device.currentDeviceId;
  }

  get syncStats() {
    return this.device.getSyncStats();
  }

  get vm$() {
    return this.device.vm$;
  }

  get appliedInSync(): boolean {
    const s = this.syncStats;
    return !!(s.applied && s.staged && s.applied.checksum === s.staged.checksum);
  }

  get sequances() {
    return this.studio.sequances;
  }

  get assignedTargetIds() {
    return this.studio.assignedTargetIds;
  }

  selectTarget(id: string) {
    this.studio.setTarget(id);
    const binding = this.selectedBinding;
    this.bindingType = binding?.type ?? 'none';
    this.bindingSequanceId =
      binding && binding.type === 'sequanceRef' ? binding.sequanceId : this.selectedSequanceId ?? null;
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

  assignSelectedSequanceToTarget() {
    if (!this.selectedTargetId) return;
    if (this.bindingType !== 'none' && this.bindingErrors.length) return;
    const layerId = this.activeLayer;
    switch (this.bindingType) {
      case 'sequanceRef': {
        const sequanceId = this.bindingSequanceId || this.selectedSequance?.id;
        if (!sequanceId) return;
        this.studio.assignSequanceToTarget(sequanceId);
        this.device.pushBinding(layerId, this.selectedTargetId, { type: 'sequanceRef', sequanceId });
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
    const targetId = this.selectedTargetId;
    if (targetId) {
      this.studio.clearBinding(targetId);
      this.device.pushBinding(this.activeLayer, targetId, { type: 'none' });
    }
    this.bindingSequanceId = null;
    this.bindingAction = '';
    this.bindingActionArg = '';
    this.bindingInlineText = '';
    this.bindingProgramPath = '';
    this.bindingType = 'none';
  }

  setLayer(layer: number) {
    this.studio.setLayer(layer);
  }

  onBindingSequanceChange(value: string) {
    this.bindingSequanceId = value;
  }

  sequanceName(id: string | null) {
    if (!id) return '';
    return this.sequances.find(s => s.id === id)?.name ?? '';
  }

  get sequanceBindingId(): string | null {
    const b = this.selectedBinding;
    return b && b.type === 'sequanceRef' ? b.sequanceId : null;
  }

  onDropAssign(targetId: string, payload: unknown) {
    const sequanceId = payload as string | null;
    if (!sequanceId) return;
    this.selectTarget(targetId);
    this.bindingType = 'sequanceRef';
    this.bindingSequanceId = sequanceId;
    this.studio.assignSequanceToTarget(sequanceId);
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

  setCanvasView(view: 'device' | 'sequance') {
    if (view === 'sequance' && !this.selectedSequanceId) return;
    this.canvasView = view;
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

  onDeviceMoveEnd(_ev: { id: string; x: number; y: number }) {
    this.device.persistLayout();
  }

  onCanvasDeselect() {
    this.onDeviceDeselect();
  }

  async onConnectDevice(deviceId: string) {
    if (!deviceId) return;
    await this.device.connect(deviceId);
  }

  async onImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.importBusy = true;
    try {
      const content = await file.text();
      await this.device.importViaBundle(content);
      this.layoutSelectionId = null;
      this.hoveredElementId = null;
      this.bindingType = 'sequanceRef';
      this.bindingSequanceId = null;
    } catch (e) {
      console.warn('Import failed', e);
    } finally {
      this.importBusy = false;
    }
  }

  ngOnInit() {
    this.device.refreshDevices();
  }

  get bindingErrors(): string[] {
    const errors: string[] = [];
    switch (this.bindingType) {
      case 'sequanceRef': {
        const sequanceId = this.bindingSequanceId || this.selectedSequance?.id;
        if (!sequanceId) errors.push('Select a sequance to assign.');
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

  private bindingToIndicator(binding: StudioBinding, sequanceNames: Map<string, string>): BindingIndicator {
    switch (binding.type) {
      case 'sequanceRef':
        return { label: `Sequance: ${this.truncateLabel(sequanceNames.get(binding.sequanceId) ?? 'Unknown')}` };
      case 'simpleAction':
        return { label: `Action: ${this.truncateLabel(binding.action || 'Action')}` };
      case 'inlineSequence':
        return { label: 'Inline macro' };
      case 'program':
        return { label: 'Program' };
      default:
        return { label: 'Set' };
    }
  }

  private truncateLabel(label: string, max = 10) {
    return label.length > max ? `${label.slice(0, max)}…` : label;
  }
}
