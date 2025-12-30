import { InjectionToken } from '@angular/core';
import {
  BindingEntry,
  DeviceInfo,
  ProfileBundle,
} from '../../shared/models/device';

export interface DeviceGateway {
  listDevices(): Promise<DeviceInfo[]>;
  openSession(deviceId: string): Promise<ProfileBundle>;
  closeSession(sessionId: string): Promise<void>;
  setBinding(sessionId: string, req: BindingEntry): Promise<void>;
  applyToRam(sessionId: string): Promise<void>;
  revertRam(sessionId: string): Promise<void>;
  commit(sessionId: string): Promise<void>;
  run(sessionId: string, sequanceId: string): Promise<void>;
  stopAll(sessionId: string): Promise<void>;
}

export const DEVICE_GATEWAY = new InjectionToken<DeviceGateway>('DEVICE_GATEWAY');
