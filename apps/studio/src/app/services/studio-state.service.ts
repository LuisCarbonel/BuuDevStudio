import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Binding =
  | { type: 'none' }
  | { type: 'scriptRef'; scriptId: string; meta?: Record<string, string> }
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

export interface Script {
  id: string;
  profileId: string;
  name: string;
  steps: Step[];
  meta?: Record<string, string>;
}

export interface DeviceState {
  connected: boolean;
  transport: 'mock' | 'hid';
  runningScriptId: string | null;
  lastError: string | null;
  firmwareVersion: string;
}

export interface StudioState {
  device: DeviceState;
  activeProfileId: string;
  activeLayer: number;
  selectedTargetId: string | null;
  selectedScriptId: string | null;
  selectedStepId: number | null;
  profiles: Profile[];
  scripts: Script[];
  targets: string[];
}

const initialState: StudioState = {
  device: {
    connected: false,
    transport: 'mock',
    runningScriptId: null,
    lastError: null,
    firmwareVersion: '0.0.1-mock',
  },
  activeProfileId: 'p-default',
  activeLayer: 1,
  selectedTargetId: 'key-03',
  selectedScriptId: 's-bhop',
  selectedStepId: null,
  targets: [
    'key-01',
    'key-02',
    'key-03',
    'key-04',
    'key-05',
    'key-06',
    'key-07',
    'key-08',
    'key-09',
    'key-10',
    'key-11',
    'key-12',
    'key-13',
    'key-14',
    'key-15',
    'knob-1-ccw',
    'knob-1-cw',
    'knob-1-press',
    'knob-2-ccw',
    'knob-2-cw',
    'knob-2-press',
    'knob-main-ccw',
    'knob-main-cw',
    'knob-main-press',
  ],
  profiles: [
    {
      id: 'p-default',
      name: 'Default',
      layers: [
        {
          id: 1,
          bindingsByTargetId: {
            'key-03': { type: 'scriptRef', scriptId: 's-bhop' },
            'key-04': { type: 'scriptRef', scriptId: 's-sprint' },
          },
        },
        { id: 2, bindingsByTargetId: {} },
        { id: 3, bindingsByTargetId: {} },
        { id: 4, bindingsByTargetId: {} },
      ],
    },
    { id: 'p-apex', name: 'Apex', layers: [{ id: 1, bindingsByTargetId: {} }] },
    { id: 'p-tacops', name: 'TacOps', layers: [{ id: 1, bindingsByTargetId: {} }] },
  ],
  scripts: [
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

  get snapshot(): StudioState {
    return this.state.value;
  }

  get profiles(): Profile[] {
    return this.snapshot.profiles;
  }

  get scripts(): Script[] {
    return this.snapshot.scripts;
  }

  get selectedProfileId(): string | null {
    return this.snapshot.activeProfileId;
  }

  get selectedScriptId(): string | null {
    return this.snapshot.selectedScriptId;
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

  get scriptsForProfile(): Script[] {
    return this.scripts.filter(s => s.profileId === this.snapshot.activeProfileId);
  }

  get selectedScript(): Script | null {
    return this.scripts.find(s => s.id === this.snapshot.selectedScriptId) ?? null;
  }

  get currentSteps(): Step[] {
    return this.selectedScript?.steps ?? [];
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

  selectProfile(profileId: string) {
    const scriptsForProfile = this.scripts.filter(s => s.profileId === profileId);
    const nextScriptId = scriptsForProfile[0]?.id ?? null;
    this.patch({
      activeProfileId: profileId,
      selectedScriptId: nextScriptId,
      selectedStepId: null,
      selectedTargetId: null,
      activeLayer: 1,
    });
  }

  selectScript(scriptId: string) {
    this.patch({ selectedScriptId: scriptId, selectedStepId: null });
  }

  selectStep(stepId: number | null) {
    this.patch({ selectedStepId: stepId });
  }

  setLayer(layer: number) {
    this.patch({ activeLayer: layer });
  }

  setTarget(targetId: string | null) {
    this.patch({ selectedTargetId: targetId });
  }

  assignScriptToTarget(scriptId: string) {
    if (!this.selectedTargetId || !this.selectedProfile) return;
    this.updateBinding(this.selectedTargetId, { type: 'scriptRef', scriptId });
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
    if (!current || current.type !== 'scriptRef') return;
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

    const scriptIds = new Set<string>();
    layers.forEach(layer => {
      layer.bindings.forEach(({ binding }) => {
        if (binding.type === 'scriptRef') scriptIds.add(binding.scriptId);
      });
    });

    const scripts = Array.from(scriptIds)
      .map(id => this.scripts.find(s => s.id === id))
      .filter((s): s is Script => !!s)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const stepsCount = scripts.reduce((acc, s) => acc + s.steps.length, 0);
    const targetsBound = layers.reduce((acc, l) => acc + l.bindings.length, 0);

    const payload = {
      profileId: profile.id,
      layerIds,
      layers,
      scripts,
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
        scriptsIncluded: scripts.length,
        steps: stepsCount,
        byteSize,
        checksum,
      },
    };
  }

  private patch(partial: Partial<StudioState>) {
    this.state.next({ ...this.snapshot, ...partial });
  }
}
