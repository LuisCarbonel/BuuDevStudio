import { BindingEntry, DeviceInfo, ProfileBundle } from '../../shared/models/device';
import { DeviceGateway } from './device-gateway';

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const tauri = (globalThis as any).__TAURI__;
  if (tauri?.invoke) {
    return tauri.invoke(cmd, args) as Promise<T>;
  }
  return Promise.reject(new Error('Tauri API not available'));
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

  run(sessionId: string, scriptId: string): Promise<void> {
    return tauriInvoke('run', { sessionId, scriptId });
  }

  stopAll(sessionId: string): Promise<void> {
    return tauriInvoke('stop_all', { sessionId });
  }
}
