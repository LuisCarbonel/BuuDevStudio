import { NormalizedLayout } from '../layout/models';

export interface Capabilities {
  volatileApply: boolean;
  commit: boolean;
  layouts: boolean;
  keymap: boolean;
  sequances: boolean;
}

export interface DeviceInfo {
  id: string;
  name: string;
  transport: string;
  vendorId?: string;
  productId?: string;
  firmwareVersion?: string;
}

export interface Step {
  id: number;
  name: string;
  op: string;
  arg?: string;
  class?: number;
}

export type Binding =
  | { type: 'none' }
  | { type: 'sequanceRef'; sequanceId: string; meta?: Record<string, unknown> }
  | { type: 'simpleAction'; action: string; arg?: string; meta?: Record<string, unknown> }
  | { type: 'inlineSequence'; steps: Step[]; meta?: Record<string, unknown> }
  | { type: 'program'; path: string; meta?: Record<string, unknown> };

export interface BindingEntry {
  targetId: string;
  binding: Binding;
  layerId?: number;
}

export interface Sequance {
  id: string;
  profileId: string;
  name: string;
  steps: Step[];
  meta?: Record<string, unknown>;
}

export interface LayerState {
  id: number;
  bindings: BindingEntry[];
}

export interface DeviceState {
  profileId: string;
  layers: LayerState[];
  revision?: number;
  checksum?: number;
}

export interface Profile {
  id: string;
  name: string;
  layers: LayerState[];
}

export interface ProfileBundle {
  sessionId: string;
  device: DeviceInfo;
  capabilities: Capabilities;
  profile: Profile;
  layout: NormalizedLayout | null;
  targets: string[];
  sequances: Sequance[];
  committedState?: DeviceState | null;
  appliedState?: DeviceState | null;
  stagedState?: DeviceState | null;
  bindings?: BindingEntry[];
}
