import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NormalizedLayout } from '../shared/layout/models';

export type Binding =
  | { type: 'none' }
  | { type: 'sequanceRef'; sequanceId: string; meta?: Record<string, string> }
  | { type: 'simpleAction'; action: string; arg?: string; meta?: Record<string, string> }
  | { type: 'inlineSequence'; steps: Step[]; meta?: Record<string, string> }
  | { type: 'program'; path: string; meta?: Record<string, string> };

export interface Layer {
  id: number;
  bindingsByTargetId: Record<string, Binding>;
}

export interface Profile {
  id: string;
  name: string;
  layers: Layer[];
}

export interface Step {
  id: number;
  name: string;
  op: string;
  arg?: string;
  class?: number;
}

export interface Sequance {
  id: string;
  profileId: string;
  name: string;
  steps: Step[];
  meta?: Record<string, string>;
}

export interface DeviceCapabilities {
  volatileApply: boolean;
  commit: boolean;
  layouts: boolean;
  keymap: boolean;
  sequances: boolean;
}

export interface CommittedState {
  profileId: string | null;
  checksum: number | null;
  revision: number | null;
}

export interface DeviceInfo {
  id: string;
  name: string;
  transport: string;
  firmwareVersion?: string;
  vendorId?: string;
  productId?: string;
}

export interface DeviceState {
  id: string | null;
  name: string | null;
  connected: boolean;
  transport: 'mock' | 'hid';
  runningSequanceId: string | null;
  lastError: string | null;
  firmwareVersion: string;
  capabilities: DeviceCapabilities;
  committedState: CommittedState | null;
  appliedState?: CommittedState | null;
  stagedState?: CommittedState | null;
  sessionId?: string | null;
}

export interface StudioState {
  device: DeviceState;
  activeProfileId: string;
  activeLayer: number;
  selectedTargetId: string | null;
  selectedSequanceId: string | null;
  selectedStepId: number | null;
  profiles: Profile[];
  sequances: Sequance[];
  targets: string[];
}

export interface ProfileBundle {
  device: DeviceInfo;
  capabilities: DeviceCapabilities;
  profile: Profile;
  layout: NormalizedLayout | null;
  sequances: Sequance[];
  committedState: CommittedState | null;
  appliedState?: CommittedState | null;
  stagedState?: CommittedState | null;
  sessionId?: string | null;
}

const initialState: StudioState = {
  device: {
    id: null,
    name: null,
    connected: false,
    transport: 'mock',
    runningSequanceId: null,
    lastError: null,
    firmwareVersion: '0.0.1-mock',
    capabilities: { volatileApply: true, commit: true, layouts: true, keymap: true, sequances: true },
    committedState: null,
    appliedState: null,
    stagedState: null,
    sessionId: null,
  },
  activeProfileId: 'p-default',
  activeLayer: 1,
  selectedTargetId: null,
  selectedSequanceId: 's-bhop',
  selectedStepId: null,
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
  sequances: [
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
};

@Injectable({ providedIn: 'root' })
export class StudioStateService {
  private state = new BehaviorSubject<StudioState>(initialState);
  readonly state$ = this.state.asObservable();
  private layout: NormalizedLayout | null = null;

  get snapshot(): StudioState {
    return this.state.value;
  }

  get profiles(): Profile[] {
    return this.snapshot.profiles;
  }

  get sequances(): Sequance[] {
    return this.snapshot.sequances;
  }

  get selectedProfileId(): string | null {
    return this.snapshot.activeProfileId;
  }

  get selectedSequanceId(): string | null {
    return this.snapshot.selectedSequanceId;
  }

  get selectedStepId(): number | null {
    return this.snapshot.selectedStepId;
  }

  get selectedTargetId(): string | null {
    return this.snapshot.selectedTargetId;
  }

  get targets(): string[] {
    return this.snapshot.targets;
  }

  get activeLayer(): number {
    return this.snapshot.activeLayer;
  }

  get selectedProfile(): Profile | null {
    return this.profiles.find(p => p.id === this.snapshot.activeProfileId) ?? null;
  }

  get sequancesForProfile(): Sequance[] {
    return this.sequances.filter(s => s.profileId === this.snapshot.activeProfileId);
  }

  get selectedSequance(): Sequance | null {
    return this.sequances.find(s => s.id === this.snapshot.selectedSequanceId) ?? null;
  }

  get currentSteps(): Step[] {
    return this.selectedSequance?.steps ?? [];
  }

  get activeBindings(): Record<string, Binding> {
    const profile = this.selectedProfile;
    if (!profile) return {};
    const layer = profile.layers.find(l => l.id === this.activeLayer);
    return layer?.bindingsByTargetId ?? {};
  }

  get selectedBinding(): Binding | null {
    if (!this.selectedTargetId) return null;
    return this.activeBindings[this.selectedTargetId] ?? null;
  }

  get assignedTargetIds(): string[] {
    return Object.entries(this.activeBindings)
      .filter(([, binding]) => binding.type !== 'none')
      .map(([targetId]) => targetId);
  }

  get normalizedLayout(): NormalizedLayout | null {
    return this.layout;
  }

  setNormalizedLayout(layout: NormalizedLayout | null) {
    this.layout = layout;
    const targets = this.computeTargets(layout, this.snapshot.targets);
    const selectedTargetId = targets.includes(this.snapshot.selectedTargetId ?? '') ? this.snapshot.selectedTargetId : null;
    this.patch({ targets, selectedTargetId });
  }

  offsetLayoutElement(elementId: string, dx: number, dy: number) {
    if (!this.layout) return;
    this.layout = {
      ...this.layout,
      keys: this.layout.keys.map(k => (k.elementId === elementId ? { ...k, x: k.x + dx, y: k.y + dy } : k)),
      controls: this.layout.controls.map(c => (c.elementId === elementId ? { ...c, x: c.x + dx, y: c.y + dy } : c)),
    };
    this.patch({ targets: this.computeTargets(this.layout) });
  }

  hydrateFromBundle(bundle: ProfileBundle) {
    this.layout = bundle.layout;
    const targets = this.computeTargets(bundle.layout);
    const activeProfileId = bundle.profile.id;
    const sequancesForProfile = bundle.sequances.filter(s => s.profileId === activeProfileId);
    const selectedSequanceId = sequancesForProfile[0]?.id ?? null;
    this.state.next({
      ...this.snapshot,
      device: {
        ...this.snapshot.device,
        id: bundle.device.id,
        name: bundle.device.name,
        connected: true,
        transport: bundle.device.transport as any,
        firmwareVersion: bundle.device.firmwareVersion || 'unknown',
        lastError: null,
        runningSequanceId: null,
        capabilities: bundle.capabilities,
        committedState: bundle.committedState,
        appliedState: bundle.appliedState ?? null,
        stagedState: bundle.stagedState ?? null,
        sessionId: bundle.sessionId ?? null,
      },
      profiles: [bundle.profile],
      sequances: bundle.sequances,
      activeProfileId,
      selectedSequanceId,
      selectedStepId: null,
      selectedTargetId: null,
      activeLayer: bundle.profile.layers[0]?.id ?? 1,
      targets,
    });
  }

  buildProfileBundle(deviceId: string): ProfileBundle {
    const profile = this.selectedProfile ?? this.profiles[0] ?? { id: 'p-default', name: 'Default', layers: [{ id: 1, bindingsByTargetId: {} }] };
    const sequances = this.sequances.filter(s => s.profileId === profile.id);
    const committedState =
      this.snapshot.device.committedState ?? {
        profileId: profile.id,
        checksum: null,
        revision: null,
      };

    return {
      device: {
        id: deviceId,
        name: profile.name,
        transport: this.snapshot.device.transport,
        firmwareVersion: this.snapshot.device.firmwareVersion,
      },
      capabilities: this.snapshot.device.capabilities,
      profile,
      layout: this.layout,
      sequances,
      committedState,
    };
  }

  markDisconnected() {
    this.state.next({
      ...this.snapshot,
      device: {
        ...this.snapshot.device,
        connected: false,
        runningSequanceId: null,
        committedState: null,
        appliedState: null,
        stagedState: null,
        sessionId: null,
      },
      selectedTargetId: null,
      selectedStepId: null,
    });
  }

  selectProfile(profileId: string) {
    const sequancesForProfile = this.sequances.filter(s => s.profileId === profileId);
    const nextSequanceId = sequancesForProfile[0]?.id ?? null;
    this.patch({
      activeProfileId: profileId,
      selectedSequanceId: nextSequanceId,
      selectedStepId: null,
      selectedTargetId: null,
      activeLayer: 1,
    });
  }

  selectSequance(sequanceId: string) {
    this.patch({ selectedSequanceId: sequanceId, selectedStepId: null });
  }

  selectStep(stepId: number | null) {
    this.patch({ selectedStepId: stepId });
  }

  setLayer(layer: number) {
    this.patch({ activeLayer: layer });
  }

  setTarget(targetId: string | null) {
    if (targetId && !this.snapshot.targets.includes(targetId)) {
      return;
    }
    this.patch({ selectedTargetId: targetId });
  }

  assignSequanceToTarget(sequanceId: string) {
    if (!this.selectedTargetId || !this.selectedProfile) return;
    this.updateBinding(this.selectedTargetId, { type: 'sequanceRef', sequanceId });
  }

  assignSimpleAction(action: string, arg?: string) {
    if (!this.selectedTargetId || !this.selectedProfile) return;
    this.updateBinding(this.selectedTargetId, { type: 'simpleAction', action, arg });
  }

  assignInlineSequence(steps: Step[]) {
    if (!this.selectedTargetId || !this.selectedProfile) return;
    this.updateBinding(this.selectedTargetId, { type: 'inlineSequence', steps });
  }

  assignProgram(path: string) {
    if (!this.selectedTargetId || !this.selectedProfile) return;
    this.updateBinding(this.selectedTargetId, { type: 'program', path });
  }

  clearBinding(targetId: string | null = this.selectedTargetId) {
    if (!targetId || !this.selectedProfile) return;
    this.updateBinding(targetId, { type: 'none' });
  }

  updateBindingMeta(targetId: string, meta: Record<string, string>) {
    if (!this.selectedProfile) return;
    const current = this.activeBindings[targetId];
    if (!current || current.type !== 'sequanceRef') return;
    this.updateBinding(targetId, { ...current, meta });
  }

  private updateBinding(targetId: string, binding: Binding) {
    const state = this.snapshot;
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
    const state = this.snapshot;
    const profile = this.selectedProfile;
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

    const sequanceIds = new Set<string>();
    layers.forEach(layer => {
      layer.bindings.forEach(({ binding }) => {
        if (binding.type === 'sequanceRef') sequanceIds.add(binding.sequanceId);
      });
    });

    const sequances = Array.from(sequanceIds)
      .map(id => this.sequances.find(s => s.id === id))
      .filter((s): s is Sequance => !!s)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const stepsCount = sequances.reduce((acc, s) => acc + s.steps.length, 0);
    const targetsBound = layers.reduce((acc, l) => acc + l.bindings.length, 0);

    const payload = {
      profileId: profile.id,
      layerIds,
      layers,
      sequances,
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
        sequancesIncluded: sequances.length,
        steps: stepsCount,
        byteSize,
        checksum,
      },
    };
  }

  private computeTargets(layout: NormalizedLayout | null, fallback: string[] = []): string[] {
    if (!layout) return fallback;
    return [
      ...layout.keys.map(k => k.elementId),
      ...layout.controls.map(c => c.elementId),
    ];
  }

  private patch(partial: Partial<StudioState>) {
    this.state.next({ ...this.snapshot, ...partial });
  }
}
