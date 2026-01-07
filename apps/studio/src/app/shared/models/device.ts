import { NormalizedLayout } from '../utils/layout/models';

export interface Capabilities {
  volatileApply: boolean;
  commit: boolean;
  layouts: boolean;
  keymap: boolean;
  sequences: boolean;
  actionTypes?: string[];
  targetCounts?: {
    keys: number;
    encoders: number;
    controls: number;
  };
  encoderDescriptors?: Array<{
    id: number;
    detent?: boolean;
    velocity?: boolean;
    analog?: boolean;
    ticksPerRev?: number | null;
    minRate?: number | null;
    maxRate?: number | null;
  }>;
}

export interface DeviceInfo {
  id: string;
  name: string;
  transport: string;
  vendorId?: string;
  productId?: string;
  manufacturer?: string | null;
  product?: string | null;
  serial?: string | null;
  firmwareVersion?: string;
  fingerprint?: string | null;
  interfaces?: DeviceInterface[];
  capabilityLevel?: string | null;
  definitionLinked?: boolean | null;
  definitionFingerprint?: string | null;
}

export interface DeviceInterface {
  usagePage: number;
  usage: number;
  interfaceNumber?: number | null;
  path?: string | null;
  label?: string | null;
}

export interface ViaProbe {
  viaDetected: boolean;
  viaProtocolVersion?: number | null;
  writeLen?: number | null;
  readLen?: number | null;
  timeoutMs?: number | null;
  firstBytes?: string | null;
}

export interface ViaState {
  viaDetected: boolean;
  protocolVersion?: number | null;
  layers: number;
  layerCount?: number;
  keymap: string[][][];
  encoderMap?: string[][][];
  macros?: string[];
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
  | { type: 'sequenceRef'; sequenceId: string; meta?: Record<string, unknown> }
  | { type: 'simpleAction'; action: string; arg?: string; meta?: Record<string, unknown> }
  | { type: 'inlineSequence'; steps: Step[]; meta?: Record<string, unknown> }
  | { type: 'program'; path: string; meta?: Record<string, unknown> };

export interface BindingEntry {
  targetId: string;
  binding: Binding;
  layerId?: number;
}

export interface Sequence {
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
  definitionFingerprint?: string | null;
  device: DeviceInfo;
  capabilities: Capabilities;
  profile: Profile;
  layout: NormalizedLayout | null;
  targets: string[];
  sequences: Sequence[];
  committedState?: DeviceState | null;
  appliedState?: DeviceState | null;
  stagedState?: DeviceState | null;
  bindings?: BindingEntry[];
}

export interface StatusSnapshot {
  running: string | null;
  ramLoaded: boolean;
  dirty: boolean;
  committedState?: DeviceState | null;
  appliedState?: DeviceState | null;
  stagedState?: DeviceState | null;
  definitionFingerprint?: string | null;
}
