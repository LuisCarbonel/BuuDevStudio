import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Binding {
  targetId: string;
  action: string;
  meta?: Record<string, string>;
}

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
  profiles: [
    {
      id: 'p-default',
      name: 'Default',
      layers: [
        {
          id: 1,
          bindingsByTargetId: {
            'key-03': { targetId: 'key-03', action: 'Script: Bunnyhop' },
            'key-04': { targetId: 'key-04', action: 'Script: Sprint + Strafe' },
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

  selectProfile(profileId: string) {
    const scriptsForProfile = this.scripts.filter(s => s.profileId === profileId);
    const nextScriptId = scriptsForProfile[0]?.id ?? null;
    this.patch({
      activeProfileId: profileId,
      selectedScriptId: nextScriptId,
      selectedStepId: null,
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

  private patch(partial: Partial<StudioState>) {
    this.state.next({ ...this.snapshot, ...partial });
  }
}
