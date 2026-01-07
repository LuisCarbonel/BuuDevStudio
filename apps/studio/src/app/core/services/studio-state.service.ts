import { Injectable, signal, computed } from '@angular/core';
import { NormalizedLayout } from '@shared/utils/layout/models';
import type { Binding, Capabilities as DeviceCapabilities, DeviceInfo, Sequence, Step, ViaState } from '@shared/models/device';

export interface Layer {
  id: number;
  bindingsByTargetId: Record<string, Binding>;
}

export interface Profile {
  id: string;
  name: string;
  layers: Layer[];
}

export interface CommittedState {
  profileId: string | null;
  checksum: number | null;
  revision: number | null;
}

export interface DeviceState {
  id: string | null;
  name: string | null;
  connected: boolean;
  transport: 'mock' | 'hid';
  runningSequenceId: string | null;
  lastError: string | null;
  firmwareVersion: string;
  capabilities: DeviceCapabilities;
  vendorId?: string | null;
  productId?: string | null;
  capabilityLevel?: string | null;
  manufacturer?: string | null;
  product?: string | null;
  serial?: string | null;
  fingerprint?: string | null;
  interfaces?: Array<{
    usagePage: number;
    usage: number;
    interfaceNumber?: number | null;
    path?: string | null;
    label?: string | null;
  }> | null;
  definitionLinked?: boolean | null;
  committedState: CommittedState | null;
  appliedState?: CommittedState | null;
  stagedState?: CommittedState | null;
  sessionId?: string | null;
  definitionFingerprint?: string | null;
}

export interface StudioState {
  device: DeviceState;
  activeProfileId: string;
  activeLayer: number;
  selectedTargetId: string | null;
  selectedSequenceId: string | null;
  selectedStepId: number | null;
  libraryMode: 'blocks' | 'sequences';
  librarySearch: string;
  profiles: Profile[];
  sequences: Sequence[];
  targets: string[];
  viaState: ViaState | null;
}

export interface ProfileBundle {
  device: DeviceInfo;
  capabilities: DeviceCapabilities;
  profile: Profile;
  layout: NormalizedLayout | null;
  sequences: Sequence[];
  committedState: CommittedState | null;
  appliedState?: CommittedState | null;
  stagedState?: CommittedState | null;
  sessionId?: string | null;
  definitionFingerprint?: string | null;
}

const initialState: StudioState = {
  device: {
    id: null,
    name: null,
    connected: false,
    transport: 'mock',
    runningSequenceId: null,
    lastError: null,
    firmwareVersion: '0.0.1-mock',
    capabilities: { volatileApply: true, commit: true, layouts: true, keymap: true, sequences: true },
    vendorId: null,
    productId: null,
    capabilityLevel: null,
    manufacturer: null,
    product: null,
    serial: null,
    fingerprint: null,
    interfaces: null,
    definitionLinked: null,
    committedState: null,
    appliedState: null,
    stagedState: null,
    sessionId: null,
    definitionFingerprint: null,
  },
  activeProfileId: 'p-default',
  activeLayer: 1,
  selectedTargetId: null,
  selectedSequenceId: 's-bhop',
  selectedStepId: null,
  libraryMode: 'blocks',
  librarySearch: '',
  targets: [],
  profiles: [
    {
      id: 'p-default',
      name: 'Default',
      layers: [
        { id: 1, bindingsByTargetId: {} },
        { id: 2, bindingsByTargetId: {} },
        { id: 3, bindingsByTargetId: {} },
        { id: 4, bindingsByTargetId: {} },
      ],
    },
    { id: 'p-apex', name: 'Apex', layers: [{ id: 1, bindingsByTargetId: {} }] },
    { id: 'p-tacops', name: 'TacOps', layers: [{ id: 1, bindingsByTargetId: {} }] },
  ],
  sequences: [
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
  ],
  viaState: null,
};

@Injectable({ providedIn: 'root' })
export class StudioStateService {
  // Signal-based state management
  private readonly _state = signal<StudioState>(initialState);
  private readonly _layout = signal<NormalizedLayout | null>(null);

  // Expose readonly state for direct access
  readonly state = this._state.asReadonly();

  // Computed signals replace getters
  readonly profiles = computed(() => this._state().profiles);
  readonly sequences = computed(() => this._state().sequences);
  readonly selectedProfileId = computed(() => this._state().activeProfileId);
  readonly viaState = computed(() => this._state().viaState);
  readonly selectedSequenceId = computed(() => this._state().selectedSequenceId);
  readonly selectedStepId = computed(() => this._state().selectedStepId);
  readonly selectedTargetId = computed(() => this._state().selectedTargetId);
  readonly targets = computed(() => this._state().targets);
  readonly libraryMode = computed(() => this._state().libraryMode);
  readonly librarySearch = computed(() => this._state().librarySearch);
  readonly activeLayer = computed(() => this._state().activeLayer);
  readonly normalizedLayout = computed(() => this._layout());

  readonly selectedProfile = computed(() => 
    this.profiles().find(p => p.id === this.selectedProfileId()) ?? null
  );

  readonly sequencesForProfile = computed(() =>
    this.sequences().filter(s => s.profileId === this.selectedProfileId())
  );

  readonly selectedSequence = computed(() =>
    this.sequences().find(s => s.id === this.selectedSequenceId()) ?? null
  );

  readonly currentSteps = computed(() => 
    this.selectedSequence()?.steps ?? []
  );

  readonly activeBindings = computed(() => {
    const profile = this.selectedProfile();
    if (!profile) return {};
    const layer = profile.layers.find(l => l.id === this.activeLayer());
    return layer?.bindingsByTargetId ?? {};
  });

  readonly selectedBinding = computed(() => {
    const targetId = this.selectedTargetId();
    if (!targetId) return null;
    return this.activeBindings()[targetId] ?? null;
  });

  readonly assignedTargetIds = computed(() =>
    Object.entries(this.activeBindings())
      .filter(([, binding]) => binding.type !== 'none')
      .map(([targetId]) => targetId)
  );

  // Legacy snapshot getter for backward compatibility
  get snapshot(): StudioState {
    return this._state();
  }

  setNormalizedLayout(layout: NormalizedLayout | null) {
    this._layout.set(layout);
    const currentState = this._state();
    const targets = this.computeTargets(layout, currentState.targets);
    const selectedTargetId = targets.includes(currentState.selectedTargetId ?? '') ? currentState.selectedTargetId : null;
    this.patch({ targets, selectedTargetId });
  }

  offsetLayoutElement(elementId: string, dx: number, dy: number) {
    const currentLayout = this._layout();
    if (!currentLayout) return;
    
    const updatedLayout: NormalizedLayout = {
      ...currentLayout,
      keys: currentLayout.keys.map(k => (k.elementId === elementId ? { ...k, x: k.x + dx, y: k.y + dy } : k)),
      controls: currentLayout.controls.map(c => (c.elementId === elementId ? { ...c, x: c.x + dx, y: c.y + dy } : c)),
    };
    
    this._layout.set(updatedLayout);
    this.patch({ targets: this.computeTargets(updatedLayout) });
  }

  hydrateFromBundle(bundle: ProfileBundle) {
    this._layout.set(bundle.layout);
    const targets = this.computeTargets(bundle.layout);
    const activeProfileId = bundle.profile.id;
    const sequencesForProfile = bundle.sequences.filter(s => s.profileId === activeProfileId);
    const currentState = this._state();
    const prevSelectedSequenceId = currentState.selectedSequenceId;
    const selectedSequenceId =
      prevSelectedSequenceId && sequencesForProfile.some(s => s.id === prevSelectedSequenceId)
        ? prevSelectedSequenceId
        : sequencesForProfile[0]?.id ?? null;
    const prevSelectedTargetId = currentState.selectedTargetId;
    const selectedTargetId = prevSelectedTargetId && targets.includes(prevSelectedTargetId) ? prevSelectedTargetId : null;
    const prevActiveLayer = currentState.activeLayer;
    const activeLayer =
      bundle.profile.layers.some(l => l.id === prevActiveLayer) ? prevActiveLayer : bundle.profile.layers[0]?.id ?? 1;
    
    this._state.set({
      ...currentState,
      device: {
        ...currentState.device,
        id: bundle.device.id,
        name: bundle.device.name,
        connected: true,
        transport: bundle.device.transport as any,
        firmwareVersion: bundle.device.firmwareVersion || 'unknown',
        vendorId: bundle.device.vendorId ?? null,
        productId: bundle.device.productId ?? null,
        capabilityLevel: bundle.device.capabilityLevel ?? null,
        manufacturer: bundle.device.manufacturer ?? null,
        product: bundle.device.product ?? null,
        serial: bundle.device.serial ?? null,
        fingerprint: bundle.device.fingerprint ?? null,
        interfaces: bundle.device.interfaces ?? null,
        definitionLinked: bundle.device.definitionLinked ?? null,
        lastError: null,
        runningSequenceId: null,
        capabilities: bundle.capabilities,
        committedState: bundle.committedState,
        appliedState: bundle.appliedState ?? null,
        stagedState: bundle.stagedState ?? null,
        sessionId: bundle.sessionId ?? null,
        definitionFingerprint: bundle.definitionFingerprint ?? null,
      },
      profiles: [bundle.profile],
      sequences: bundle.sequences,
      activeProfileId,
      selectedSequenceId,
      selectedStepId: null,
      selectedTargetId,
      activeLayer,
      targets,
      viaState: null,
    });
  }

  buildProfileBundle(deviceId: string): ProfileBundle {
    const profile = this.selectedProfile() ?? this.profiles()[0] ?? { id: 'p-default', name: 'Default', layers: [{ id: 1, bindingsByTargetId: {} }] };
    const sequences = this.sequences().filter(s => s.profileId === profile.id);
    const currentState = this._state();
    const committedState =
      currentState.device.committedState ?? {
        profileId: profile.id,
        checksum: null,
        revision: null,
      };

    return {
      device: {
        id: deviceId,
        name: profile.name,
        transport: currentState.device.transport,
        firmwareVersion: currentState.device.firmwareVersion,
      },
      capabilities: currentState.device.capabilities,
      profile,
      layout: this._layout(),
      sequences,
      committedState,
    };
  }

  markDisconnected() {
    this._layout.set(null);
    const currentState = this._state();
    this._state.set({
      ...currentState,
      device: {
        ...currentState.device,
        connected: false,
        runningSequenceId: null,
        vendorId: null,
        productId: null,
        capabilityLevel: null,
        manufacturer: null,
        product: null,
        serial: null,
        fingerprint: null,
        interfaces: null,
        definitionLinked: null,
        committedState: null,
        appliedState: null,
        stagedState: null,
        sessionId: null,
      },
      selectedTargetId: null,
      selectedStepId: null,
      targets: [],
      viaState: null,
    });
  }

  selectProfile(profileId: string) {
    const sequencesForProfile = this.sequences().filter(s => s.profileId === profileId);
    const nextSequenceId = sequencesForProfile[0]?.id ?? null;
    this.patch({
      activeProfileId: profileId,
      selectedSequenceId: nextSequenceId,
      selectedStepId: null,
      selectedTargetId: null,
      activeLayer: 1,
    });
  }

  selectSequence(sequenceId: string) {
    this.patch({ selectedSequenceId: sequenceId, selectedStepId: null });
  }

  setLibraryMode(mode: 'blocks' | 'sequences') {
    this.patch({ libraryMode: mode });
  }

  setLibrarySearch(term: string) {
    this.patch({ librarySearch: term });
  }

  selectStep(stepId: number | null) {
    this.patch({ selectedStepId: stepId });
  }

  setLayer(layer: number) {
    this.patch({ activeLayer: layer });
  }

  setTarget(targetId: string | null) {
    const currentState = this._state();
    if (targetId && !currentState.targets.includes(targetId)) {
      return;
    }
    this.patch({ selectedTargetId: targetId });
  }

  assignSequenceToTarget(sequenceId: string) {
    const targetId = this.selectedTargetId();
    if (!targetId || !this.selectedProfile()) return;
    this.updateBinding(targetId, { type: 'sequenceRef', sequenceId });
  }

  assignSimpleAction(action: string, arg?: string) {
    const targetId = this.selectedTargetId();
    if (!targetId || !this.selectedProfile()) return;
    this.updateBinding(targetId, { type: 'simpleAction', action, arg });
  }

  assignInlineSequence(steps: Step[]) {
    const targetId = this.selectedTargetId();
    if (!targetId || !this.selectedProfile()) return;
    this.updateBinding(targetId, { type: 'inlineSequence', steps });
  }

  assignProgram(path: string) {
    const targetId = this.selectedTargetId();
    if (!targetId || !this.selectedProfile()) return;
    this.updateBinding(targetId, { type: 'program', path });
  }

  clearBinding(targetId?: string | null) {
    const id = targetId ?? this.selectedTargetId();
    if (!id || !this.selectedProfile()) return;
    this.updateBinding(id, { type: 'none' });
  }

  updateBindingMeta(targetId: string, meta: Record<string, string>) {
    if (!this.selectedProfile()) return;
    const current = this.activeBindings()[targetId];
    if (!current || current.type !== 'sequenceRef') return;
    this.updateBinding(targetId, { ...current, meta });
  }

  private updateBinding(targetId: string, binding: Binding) {
    const state = this._state();
    const profiles = state.profiles.map(p => {
      if (p.id !== state.activeProfileId) return p;
      return {
        ...p,
        layers: p.layers.map(l => {
          if (l.id !== state.activeLayer) return l;
          return {
            ...l,
            bindingsByTargetId: {
              ...l.bindingsByTargetId,
              [targetId]: binding,
            },
          };
        }),
      };
    });
    this.patch({ profiles, selectedTargetId: targetId });
  }

  compileUploadPayload(includeAllLayers = false) {
    const state = this._state();
    const profile = this.selectedProfile();
    if (!profile) {
      return { payload: null, stats: null };
    }

    const layerIds = includeAllLayers ? profile.layers.map(l => l.id) : [state.activeLayer];
    const layers = layerIds.map(layerId => {
      const layer = profile.layers.find(l => l.id === layerId);
      const bindings = layer
        ? Object.entries(layer.bindingsByTargetId)
            .filter(([, b]) => b.type !== 'none')
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([targetId, binding]) => ({ targetId, binding }))
        : [];
      return { id: layerId, bindings };
    });

    const sequenceIds = new Set<string>();
    layers.forEach(layer => {
      layer.bindings.forEach(({ binding }) => {
        if (binding.type === 'sequenceRef') sequenceIds.add(binding.sequenceId);
      });
    });

    const sequences = Array.from(sequenceIds)
      .map(id => this.sequences().find(s => s.id === id))
      .filter((s): s is Sequence => !!s)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const stepsCount = sequences.reduce((acc, s) => acc + s.steps.length, 0);
    const targetsBound = layers.reduce((acc, l) => acc + l.bindings.length, 0);

    const payload = {
      profileId: profile.id,
      layerIds,
      layers,
      sequences,
      timing: {
        gapMs: null,
        jitterMs: null,
      },
    };

    const json = JSON.stringify(payload);
    const byteSize = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(json).length : json.length;
    let checksum = 0;
    for (let i = 0; i < json.length; i++) {
      checksum = (checksum * 31 + json.charCodeAt(i)) >>> 0;
    }

    return {
      payload,
      stats: {
        targetsBound,
        sequencesIncluded: sequences.length,
        steps: stepsCount,
        byteSize,
        checksum,
      },
    };
  }

  private computeTargets(layout: NormalizedLayout | null, fallback: string[] = []): string[] {
    if (!layout) return fallback;
    const targets: string[] = [];
    layout.keys.forEach(k => targets.push(k.elementId));
    layout.controls.forEach(c => {
      targets.push(c.elementId);
      if (c.flags?.encoder || c.kind === 'encoder-block' || c.kind === 'encoder') {
        targets.push(`${c.elementId}#ccw`);
        targets.push(`${c.elementId}#cw`);
      }
    });
    return targets;
  }

  addSequence(seq: Sequence) {
    this._state.update(state => ({
      ...state,
      sequences: [...state.sequences, seq],
      selectedSequenceId: seq.id,
    }));
  }

  updateSequence(seq: Sequence) {
    this._state.update(state => {
      const sequences = state.sequences.map(existing =>
        existing.id === seq.id ? seq : existing
      );
      return {
        ...state,
        sequences,
      };
    });
  }

  updateDeviceState(partial: {
    committedState?: CommittedState | null;
    appliedState?: CommittedState | null;
    stagedState?: CommittedState | null;
    runningSequenceId?: string | null;
    definitionFingerprint?: string | null;
  }) {
    this._state.update(state => ({
      ...state,
      device: {
        ...state.device,
        committedState: partial.committedState ?? state.device.committedState,
        appliedState: partial.appliedState ?? state.device.appliedState,
        stagedState: partial.stagedState ?? state.device.stagedState,
        runningSequenceId: partial.runningSequenceId ?? state.device.runningSequenceId,
        definitionFingerprint: partial.definitionFingerprint ?? state.device.definitionFingerprint,
      },
    }));
  }

  setViaState(via: ViaState | null) {
    const currentState = this._state();
    const next = { ...currentState, viaState: via };
    
    if (via?.layerCount && currentState.device.capabilityLevel === 'QMK Raw HID') {
      const layerCount = via.layerCount;
      const currentProfile = this.selectedProfile() ?? this.profiles()[0];
      const existingLayers = currentProfile?.layers ?? [];
      const layers: Layer[] = [];
      for (let i = 1; i <= layerCount; i++) {
        const found = existingLayers.find(l => l.id === i);
        layers.push(found ?? { id: i, bindingsByTargetId: {} });
      }
      const activeLayer = layers.some(l => l.id === currentState.activeLayer) ? currentState.activeLayer : 1;
      const profiles = this.profiles().map(p =>
        p.id === currentProfile?.id
          ? { ...p, layers }
          : p
      );
      this._state.set({ ...next, profiles, activeLayer });
      return;
    }
    this._state.set(next);
  }

  private patch(partial: Partial<StudioState>) {
    this._state.update(state => ({ ...state, ...partial }));
  }
}
