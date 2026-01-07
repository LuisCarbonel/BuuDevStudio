import { CommonModule } from '@angular/common';
import { Component, signal, computed, inject } from '@angular/core';

import type { Binding as StudioBinding } from '@shared/models/device';
import { ControlElement, KeyElement } from '@shared/utils/layout/models';
import { decodeKeycodeLabel, KeyOption, findKeyOption, findKeycodeEntry } from '@shared/utils/keycodes/catalog';
import { EditorHeaderComponent } from './header/editor-header.component';
import { EditorLibraryComponent } from './library/editor-library.component';
import { EditorCanvasComponent } from './canvas/editor-canvas.component';
import { EditorInspectorComponent } from './inspector/editor-inspector.component';
import { EditorFacade } from './editor.facade';

type LibraryMode = 'blocks' | 'sequences';
type DragPayload =
  | string
  | {
      kind: 'block';
      id: string;
      action: string;
      arg?: string;
    }
  | { kind: 'sequence'; id: string };

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
  providers: [EditorFacade],
})
export class EditorPage {
  readonly editor = inject(EditorFacade);
  readonly studio = this.editor.studio;
  readonly device = this.editor.device;
  // ✅ Convert to signals
  libraryOpen = signal(true);
  bindingSequenceId = signal<string | null>(null);
  bindingType = signal<'sequenceRef' | 'simpleAction' | 'inlineSequence' | 'program' | 'none'>('sequenceRef');
  bindingAction = signal('');
  bindingActionArg = signal('');
  bindingInlineText = signal('');
  bindingProgramPath = signal('');
  canvasView = signal<'device' | 'sequence'>('device');
  hoveredElementId = signal<string | null>(null);
  layoutSelectionId = signal<string | null>(null);
  importBusy = signal(false);
  pendingBindingLabelOverride = signal<string | null>(null);
  currentBindingSnapshot = signal<StudioBinding | null>(null);
  pendingTargets = signal<Set<string>>(new Set());
  private pendingOriginalBindings = new Map<string, StudioBinding | null>();
  viaKeyOptions = signal<KeyOption[]>([]);
  viaSelectedCode = signal<number | null>(null);
  viaTargetLabel = signal<string | null>(null);
  private viaCoords = signal<{ row: number; col: number } | null>(null);

  actions = ['Wait', 'Key Down', 'Key Up', 'Tap', 'Mouse', 'If / Else', 'Set Variable', 'Loop'];

  // ✅ Computed signals for derived state
  readonly profiles = this.editor.profiles;
  readonly sequences = this.editor.sequences;
  readonly selectedProfile = this.editor.selectedProfile;
  readonly selectedProfileId = this.editor.selectedProfileId;
  readonly sequencesForProfile = this.editor.sequencesForProfile;
  readonly selectedSequence = this.editor.selectedSequence;
  readonly selectedSequenceId = this.editor.selectedSequenceId;
  readonly currentSteps = this.editor.currentSteps;
  readonly activeLayer = this.editor.activeLayer;
  readonly selectedBinding = this.editor.selectedBinding;
  readonly targets = this.editor.targets;
  readonly normalizedLayout = this.editor.normalizedLayout;
  readonly selectedTargetId = this.editor.selectedTargetId;
  readonly libraryMode = this.editor.libraryMode;
  readonly librarySearch = this.editor.librarySearch;
  readonly selectedStepId = this.editor.selectedStepId;
  readonly assignedTargetIds = this.editor.assignedTargetIds;

  readonly sequenceViewEnabled = computed(() => 
    this.libraryMode() === 'sequences' && !!this.selectedSequenceId()
  );

  readonly bindingIndicators = this.editor.bindingIndicators;

  readonly layerOptions = computed(() => 
    this.selectedProfile()?.layers.map(l => l.id) ?? []
  );

  readonly keycodeLabels = this.editor.keycodeLabels;

  readonly encoderLabels = this.editor.encoderLabels;

  readonly layoutUnitPx = this.editor.layoutUnitPx;

  ngOnInit() {
    this.device.refreshDevices();
    this.ensureBindingTypeSupported();
    this.viaKeyOptions.set(this.buildViaKeyOptions());
  }

  toggleLibrary(value?: boolean) {
    if (value !== undefined) {
      this.libraryOpen.set(value);
    } else {
      this.libraryOpen.update(open => !open);
    }
  }

  selectStep(id: number) {
    this.studio.selectStep(id);
  }

  readonly selectedStep = computed(() => 
    this.currentSteps().find(s => s.id === this.selectedStepId()) ?? null
  );

  selectProfile(profileId: string) {
    this.studio.selectProfile(profileId);
    this.layoutSelectionId.set(null);
    this.hoveredElementId.set(null);
    this.bindingType.set('sequenceRef');
    this.bindingSequenceId.set(null);
    if (!this.selectedSequenceId()) {
      this.canvasView.set('device');
    }
  }

  selectSequence(sequenceId: string) {
    this.studio.selectSequence(sequenceId);
  }

  // Computed signals defined above replace these getters
  readonly deviceName = this.editor.deviceName;
  readonly capabilityLevel = this.editor.capabilityLevel;
  readonly devices = this.editor.devices;
  readonly selectedDeviceId = this.editor.selectedDeviceId;
  
  readonly readOnlyPreview = computed(() => {
    const lvl = this.studio.state().device.capabilityLevel;
    return !(lvl === 'Studio HID' || lvl === 'QMK Raw HID');
  });

  readonly syncStats = this.editor.syncStats;
  readonly vm = this.editor.vm;
  readonly capabilities = this.editor.capabilities;

  private supportedActionTypes(): string[] {
    const fromDevice = this.capabilities()?.actionTypes;
    if (fromDevice && fromDevice.length) {
      return fromDevice;
    }
    return ['sequenceRef', 'simpleAction', 'inlineSequence', 'program'];
  }

  readonly bindingTypeOptions = computed(() => {
    const supported = this.supportedActionTypes();
    const caps = this.capabilities();
    const opts: Array<{ value: 'sequenceRef' | 'simpleAction' | 'inlineSequence' | 'program' | 'none'; label: string }> = [];
    if (caps?.sequences && supported.includes('sequenceRef')) {
      opts.push({ value: 'sequenceRef', label: 'Sequence' });
    }
    if (supported.includes('program')) {
      opts.push({ value: 'program', label: 'Program' });
    }
    if (supported.includes('inlineSequence')) {
      opts.push({ value: 'inlineSequence', label: 'Text macro' });
    }
    if (supported.includes('simpleAction')) {
      opts.push({ value: 'simpleAction', label: 'Simple action' });
    }
    opts.push({ value: 'none', label: 'None' });
    return opts;
  });

  readonly appliedInSync = computed(() => {
    const s = this.syncStats();
    return !!(s.applied && s.staged && s.applied.checksum === s.staged.checksum);
  });

  readonly hasPendingChanges = computed(() => {
    return this.pendingTargets().size > 0 || this.syncStats().dirty;
  });

  selectTarget(id: string) {
    this.studio.setTarget(id);
    const binding = this.selectedBinding();
    const pendingOriginal = this.pendingOriginalBindings.get(id);
    this.currentBindingSnapshot.set(pendingOriginal ?? binding ?? null);
    this.bindingType.set(binding?.type ?? 'none');
    this.bindingSequenceId.set(
      binding && binding.type === 'sequenceRef' ? binding.sequenceId : this.selectedSequenceId() ?? null
    );
    if (binding?.type === 'simpleAction') {
      this.bindingAction.set(binding.action);
      this.bindingActionArg.set(binding.arg ?? '');
    } else {
      this.bindingAction.set('');
      this.bindingActionArg.set('');
    }
    if (binding?.type === 'inlineSequence') {
      this.bindingInlineText.set(binding.steps.map(s => `${s.op} ${s.arg ?? ''}`.trim()).join('\n'));
    } else {
      this.bindingInlineText.set('');
    }
    if (binding?.type === 'program') {
      this.bindingProgramPath.set(binding.path);
    } else {
      this.bindingProgramPath.set('');
    }
    this.ensureBindingTypeSupported();
    this.updateViaSelection();
  }

  private stageBindingForTarget(targetId: string): boolean {
    const bindType = this.bindingType();
    if (bindType !== 'none' && this.bindingErrors().length) {
      return false;
    }
    const prev = this.studio.selectedBinding();
    if (!this.pendingOriginalBindings.has(targetId)) {
      this.pendingOriginalBindings.set(targetId, prev ?? null);
    }
    let staged = false;
    switch (bindType) {
      case 'sequenceRef': {
        const sequenceId = this.bindingSequenceId() || this.selectedSequence()?.id;
        if (!sequenceId) return false;
        this.studio.setTarget(targetId);
        this.studio.assignSequenceToTarget(sequenceId);
        const seqName = this.sequences().find(s => s.id === sequenceId)?.name;
        this.pendingBindingLabelOverride.set(seqName ? `Sequence: ${seqName}` : `Sequence: ${sequenceId}`);
        return true;
      }
      case 'simpleAction': {
        const action = this.bindingAction().trim();
        if (!action) return false;
        const arg = this.bindingActionArg().trim() || undefined;
        this.studio.setTarget(targetId);
        this.studio.assignSimpleAction(action, arg);
        this.pendingBindingLabelOverride.set(this.editor.formatActionLabel(action, arg));
        return true;
      }
      case 'program': {
        const path = this.bindingProgramPath().trim();
        if (!path) return false;
        this.studio.setTarget(targetId);
        this.studio.assignProgram(path);
        this.pendingBindingLabelOverride.set(`Program: ${path}`);
        staged = true;
        break;
      }
      case 'inlineSequence': {
        const steps = this.parseInlineSequence(this.bindingInlineText());
        if (!steps.length) return false;
        this.studio.setTarget(targetId);
        this.studio.assignInlineSequence(steps);
        this.pendingBindingLabelOverride.set('Inline macro (pending)');
        staged = true;
        break;
      }
      case 'none':
        this.studio.setTarget(targetId);
        this.studio.clearBinding();
        this.pendingBindingLabelOverride.set('None');
        staged = true;
        break;
    }
    if (!staged) return false;
    const pendingSet = new Set(this.pendingTargets());
    pendingSet.add(targetId);
    this.pendingTargets.set(pendingSet);
    this.currentBindingSnapshot.set(this.pendingOriginalBindings.get(targetId) ?? prev ?? null);
    return true;
  }

  async applyBinding() {
    const targetId = this.selectedTargetId();
    if (targetId) {
      const staged = this.stageBindingForTarget(targetId);
      if (!staged) return;
      const binding = this.studio.selectedBinding();
      if (!binding) return;
      const ok = await this.device.pushBinding(this.activeLayer(), targetId, binding);
      if (ok) {
        this.pendingBindingLabelOverride.set(null);
        const next = new Set(this.pendingTargets());
        next.delete(targetId);
        this.pendingTargets.set(next);
        this.pendingOriginalBindings.delete(targetId);
        this.currentBindingSnapshot.set(this.studio.selectedBinding() ?? null);
      }
      return;
    }

    // Apply all pending targets
    const pending = Array.from(this.pendingTargets());
    for (const id of pending) {
      this.studio.setTarget(id);
      const binding = this.studio.selectedBinding();
      if (!binding) continue;
      const ok = await this.device.pushBinding(this.activeLayer(), id, binding);
      if (!ok) break;
      const next = new Set(this.pendingTargets());
      next.delete(id);
      this.pendingTargets.set(next);
      this.pendingOriginalBindings.delete(id);
      if (this.selectedTargetId() === id) {
        this.pendingBindingLabelOverride.set(null);
        this.currentBindingSnapshot.set(this.studio.selectedBinding() ?? null);
      }
    }
  }

  clearBinding() {
    const targetId = this.selectedTargetId();
    if (targetId) {
      if (!this.pendingTargets().has(targetId)) {
        this.pendingBindingLabelOverride.set(null);
        return;
      }
      const original = this.pendingOriginalBindings.get(targetId) ?? null;
      this.studio.setTarget(targetId);
      if (!original || original.type === 'none') {
        this.studio.clearBinding(targetId);
      } else {
        switch (original.type) {
          case 'sequenceRef':
            this.studio.assignSequenceToTarget(original.sequenceId);
            break;
          case 'simpleAction':
            this.studio.assignSimpleAction(original.action, original.arg);
            break;
          case 'inlineSequence':
            this.studio.assignInlineSequence(original.steps);
            break;
          case 'program':
            this.studio.assignProgram(original.path);
            break;
          default:
            this.studio.clearBinding(targetId);
            break;
        }
      }
      const next = new Set(this.pendingTargets());
      next.delete(targetId);
      this.pendingTargets.set(next);
      this.pendingOriginalBindings.delete(targetId);
      this.currentBindingSnapshot.set(original ?? this.studio.selectedBinding() ?? null);
    }
    this.bindingSequenceId.set(null);
    this.bindingAction.set('');
    this.bindingActionArg.set('');
    this.bindingInlineText.set('');
    this.bindingProgramPath.set('');
    this.bindingType.set('none');
    this.pendingBindingLabelOverride.set(null);
  }

  setLayer(layer: number) {
    this.studio.setLayer(layer);
  }

  onBindingSequenceChange(value: string) {
    this.bindingSequenceId.set(value);
  }

  onBindingTypeChange(value: string) {
    this.bindingType.set(value as 'sequenceRef' | 'simpleAction' | 'inlineSequence' | 'program' | 'none');
    this.ensureBindingTypeSupported();
  }

  sequenceName(id: string | null) {
    if (!id) return '';
    return this.sequences().find(s => s.id === id)?.name ?? '';
  }

  get sequenceBindingId(): string | null {
    const b = this.selectedBinding();
    return b && b.type === 'sequenceRef' ? b.sequenceId : null;
  }

  async onDropAssign(targetId: string, payload: unknown) {
    console.log('[editor] 🎯 onDropAssign called:', { targetId, payload });

    // Check connection state
    const connected = this.vm().connected;
    if (!connected) {
      console.warn('[editor] Cannot assign binding: device not connected');
      return;
    }
    
    console.log('[editor] ✅ Device connected, processing drop...');
    
    this.layoutSelectionId.set(targetId);
    this.selectTarget(targetId);
    const data = payload as DragPayload;
    
    console.log('[editor] 📦 Payload type:', typeof data, 'has kind:', data && typeof data === 'object' && 'kind' in data);
    
    if (typeof data === 'object' && data && 'kind' in data) {
      if (data.kind === 'block') {
        console.log('[editor] 🔵 Block payload detected:', data);
        const action = data.action?.trim();
        const arg = data.arg?.trim() || undefined;
        if (!action) {
          console.warn('[editor] ❌ No action in block payload');
          return;
        }
        if (action.startsWith('KC:')) {
          const keyId = action.slice(3);
          const entry = findKeycodeEntry(keyId);
          if (entry?.level === 'danger') {
            const ok = window.confirm(`Assign dangerous key '${entry.label}'?`);
            if (!ok) return;
          }
        }
        console.log('[editor] Setting binding:', { action, arg });
        this.bindingType.set('simpleAction');
        this.bindingAction.set(action);
        this.bindingActionArg.set(arg ?? '');
        this.ensureBindingTypeSupported();
        this.pendingBindingLabelOverride.set(this.editor.formatActionLabel(action, arg));
        this.stageBindingForTarget(targetId);
      } else if (data.kind === 'sequence' && data.id) {
        this.bindingType.set('sequenceRef');
        this.bindingSequenceId.set(data.id);
        this.ensureBindingTypeSupported();
        const seqName = this.sequences().find(s => s.id === data.id)?.name;
        this.pendingBindingLabelOverride.set(seqName ? `Sequence: ${seqName}` : `Sequence: ${data.id}`);
        this.stageBindingForTarget(targetId);
      }
    } else {
      const sequenceId = typeof data === 'string' ? data : null;
      if (sequenceId) {
        this.bindingType.set('sequenceRef');
        this.bindingSequenceId.set(sequenceId);
        this.ensureBindingTypeSupported();
        const seqName = this.sequences().find(s => s.id === sequenceId)?.name;
        this.pendingBindingLabelOverride.set(seqName ? `Sequence: ${seqName}` : `Sequence: ${sequenceId}`);
        this.stageBindingForTarget(targetId);
      }
    }
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

  setCanvasView(view: 'device' | 'sequence') {
    if (view === 'sequence' && !this.sequenceViewEnabled()) return;
    this.canvasView.set(view);
  }

  onDeviceSelect(id: string) {
    this.layoutSelectionId.set(id);
    this.selectTarget(id);
    this.pendingBindingLabelOverride.set(null);
  }

  onDeviceDeselect() {
    this.layoutSelectionId.set(null);
    this.hoveredElementId.set(null);
    this.studio.setTarget(null);
    this.viaCoords.set(null);
    this.viaTargetLabel.set(null);
    this.viaSelectedCode.set(null);
    this.pendingBindingLabelOverride.set(null);
  }

  onDeviceHover(id: string | null) {
    this.hoveredElementId.set(id);
  }

  onCanvasDeselect() {
    this.onDeviceDeselect();
  }

  async onConnectDevice(deviceId: string) {
    if (!deviceId) return;
    await this.device.connect(deviceId);
    this.ensureBindingTypeSupported();
  }

  async onImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.importBusy.set(true);
    try {
      const content = await file.text();
      await this.device.importViaBundle(content);
      this.layoutSelectionId.set(null);
      this.hoveredElementId.set(null);
      this.bindingType.set('sequenceRef');
      this.bindingSequenceId.set(null);
      this.ensureBindingTypeSupported();
    } catch (e) {
      console.warn('Import failed', e);
    } finally {
      this.importBusy.set(false);
    }
  }

  readonly bindingErrors = computed(() => {
    const errors: string[] = [];
    const bindType = this.bindingType();
    switch (bindType) {
      case 'sequenceRef': {
        const sequenceId = this.bindingSequenceId() || this.selectedSequence()?.id;
        if (!sequenceId) errors.push('Select a sequence to assign.');
        break;
      }
      case 'simpleAction':
        if (!this.bindingAction().trim()) {
          errors.push('Action is required.');
        }
        break;
      case 'program':
        if (!this.bindingProgramPath().trim()) {
          errors.push('Program path is required.');
        }
        break;
      case 'inlineSequence': {
        const steps = this.parseInlineSequence(this.bindingInlineText());
        if (!steps.length) {
          errors.push('Add at least one macro line (e.g., TAP KC_SPACE).');
        }
        break;
      }
      case 'none':
        break;
    }
    return errors;
  });

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

  readonly selectedLayoutElement = computed(() => {
    const layout = this.normalizedLayout();
    const selectionId = this.layoutSelectionId();
    if (!layout || !selectionId) return null;
    const baseId = selectionId.split('#')[0];
    return (
      layout.keys.find(k => k.elementId === baseId) ??
      layout.controls.find(c => c.elementId === baseId) ??
      null
    );
  });

  isControlElement(el: KeyElement | ControlElement): el is ControlElement {
    return (el as ControlElement).kind !== undefined;
  }

  private buildViaKeyOptions(): KeyOption[] {
    const codes = [0x04, 0x05, 0x06, 0x1e, 0x1f, 0x28, 0x29, 0x52, 0x51, 0x50, 0x4f, 0x4b, 0x4e, 0x00ea, 0x00e9, 0x00e2, 0x5201, 0x5223];
    const opts: KeyOption[] = [];
    codes.forEach(code => {
      const found = findKeyOption(code);
      if (found) {
        opts.push(found);
      } else {
        opts.push({ code, label: decodeKeycodeLabel(code), category: 'custom' });
      }
    });
    return opts;
  }

  private currentMatrixCoords(): { row: number; col: number } | null {
    const el = this.selectedLayoutElement();
    if (!el) return null;
    const matrix = this.isControlElement(el) ? el.matrixHint ?? null : el.matrixId;
    if (!matrix) return null;
    const parts = matrix.split(',');
    if (parts.length !== 2) return null;
    const row = Number(parts[0]);
    const col = Number(parts[1]);
    return Number.isNaN(row) || Number.isNaN(col) ? null : { row, col };
  }

  private updateViaSelection() {
    const coords = this.currentMatrixCoords();
    this.viaCoords.set(coords);
    if (!coords) {
      this.viaSelectedCode.set(null);
      this.viaTargetLabel.set(null);
      return;
    }
    this.viaTargetLabel.set(`${coords.row},${coords.col}`);
    const via = this.studio.viaState();
    const layerIdx = Math.min(Math.max(0, this.activeLayer() - 1), (via?.keymap?.length ?? 1) - 1);
    const codeHex = via?.keymap?.[layerIdx]?.[coords.row]?.[coords.col];
    const parsed = codeHex ? parseInt(codeHex, 16) : NaN;
    this.viaSelectedCode.set(Number.isNaN(parsed) ? null : parsed);
  }

  onLibraryModeChange(mode: LibraryMode) {
    this.studio.setLibraryMode(mode);
    if (mode !== 'sequences' && this.canvasView() === 'sequence') {
      this.canvasView.set('device');
    }
    // Sequence view enablement is gated by library mode + selection; canvas hook will use sequenceViewEnabled.
  }

  onLibrarySearchChange(term: string) {
    this.studio.setLibrarySearch(term);
  }

  onCreateSequence() {
    // TODO: wire up sequence creation flow when available.
    console.log('TODO: create sequence from library');
  }

  private ensureBindingTypeSupported() {
    const allowed = this.bindingTypeOptions().map(o => o.value);
    const current = this.bindingType();
    if (!allowed.includes(current)) {
      this.bindingType.set(allowed[0] ?? 'none');
    }
  }
}
