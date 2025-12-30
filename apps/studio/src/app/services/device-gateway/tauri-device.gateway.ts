import { invoke } from '@tauri-apps/api/core';
import { BindingEntry, DeviceInfo, ProfileBundle } from '../../shared/models/device';
import { DeviceGateway } from './device-gateway';

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // Tauri v2 exposes invoke via __TAURI_INTERNALS__ and @tauri-apps/api/core.
  if (!(globalThis as any).__TAURI_INTERNALS__?.invoke) {
    return Promise.reject(new Error('Tauri API not available in this environment'));
  }
  return invoke<T>(cmd, args);
}

export class TauriDeviceGateway implements DeviceGateway {
  listDevices(): Promise<DeviceInfo[]> {
    return tauriInvoke<DeviceInfo[]>('list_devices');
  }

  openSession(deviceId: string): Promise<ProfileBundle> {
    return tauriInvoke<ProfileBundle>('open_session', { deviceId });
  }

  closeSession(sessionId: string): Promise<void> {
    return tauriInvoke('close_session', { sessionId });
  }

  setBinding(sessionId: string, req: BindingEntry): Promise<void> {
    return tauriInvoke('set_binding', { sessionId, req });
  }

  applyToRam(sessionId: string): Promise<void> {
    return tauriInvoke('apply_to_ram', { sessionId });
  }

  revertRam(sessionId: string): Promise<void> {
    return tauriInvoke('revert_ram', { sessionId });
  }

  commit(sessionId: string): Promise<void> {
    return tauriInvoke('commit', { sessionId });
  }

  run(sessionId: string, sequanceId: string): Promise<void> {
    return tauriInvoke('run', { sessionId, sequanceId });
  }

  stopAll(sessionId: string): Promise<void> {
    return tauriInvoke('stop_all', { sessionId });
  }
}
