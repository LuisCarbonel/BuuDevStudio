import { InjectionToken } from '@angular/core';
import {
  BindingEntry,
  DeviceInfo,
  ProfileBundle,
  ViaProbe,
  ViaState,
} from '@shared/models/device';
import { NormalizedLayout } from '@shared/utils/layout/models';

export interface DeviceGateway {
  listDevices(): Promise<DeviceInfo[]>;
  inspectDevice(deviceId: string): Promise<DeviceInfo>;
  probeVia(deviceId: string): Promise<ViaProbe>;
  viaReadState(deviceId: string): Promise<ViaState>;
  openSession(deviceId: string): Promise<ProfileBundle>;
  closeSession(sessionId: string): Promise<void>;
  setBinding(sessionId: string, req: BindingEntry): Promise<void>;
  setLayout(sessionId: string, layout: NormalizedLayout): Promise<void>;
  importViaBundle(content: string): Promise<ProfileBundle>;
  applyToRam(sessionId: string): Promise<void>;
  revertRam(sessionId: string): Promise<void>;
  commit(sessionId: string): Promise<void>;
  run(sessionId: string, sequenceId: string): Promise<void>;
  stopAll(sessionId: string): Promise<void>;
  getStatus(sessionId: string): Promise<import('@shared/models/device').StatusSnapshot>;
  rebindDefinition(sessionId: string): Promise<void>;
  viaSetKeycode(deviceId: string, layer: number, row: number, col: number, keycode: number): Promise<void>;
}

export const DEVICE_GATEWAY = new InjectionToken<DeviceGateway>('DEVICE_GATEWAY');
