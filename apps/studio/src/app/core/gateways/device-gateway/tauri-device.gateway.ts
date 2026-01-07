import { invoke } from '@tauri-apps/api/core';
import { BindingEntry, DeviceInfo, ProfileBundle, StatusSnapshot, ViaProbe, ViaState } from '@shared/models/device';
import { NormalizedLayout } from '@shared/utils/layout/models';
import { ApiResult, GatewayError } from '@shared/models/api';
import { DeviceGateway } from './device-gateway';

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // Tauri v2 exposes invoke via __TAURI_INTERNALS__ and @tauri-apps/api/core.
  if (!(globalThis as any).__TAURI_INTERNALS__?.invoke) {
    return Promise.reject(new Error('Tauri API not available in this environment'));
  }
  return invoke<T>(cmd, args);
}

async function unwrap<T>(promise: Promise<ApiResult<T>>): Promise<T> {
  const res = await promise;
  if (res.ok) {
    return res.data as T;
  }
  const err = new Error(res.error?.message || 'Unknown error') as GatewayError;
  err.code = res.error?.code;
  err.retryable = res.error?.retryable ?? true;
  throw err;
}

export class TauriDeviceGateway implements DeviceGateway {
  listDevices(): Promise<DeviceInfo[]> {
    return unwrap(tauriInvoke<ApiResult<DeviceInfo[]>>('list_devices'));
  }

  inspectDevice(deviceId: string): Promise<DeviceInfo> {
    return unwrap(tauriInvoke<ApiResult<DeviceInfo>>('inspect_device', { deviceId }));
  }

  probeVia(deviceId: string): Promise<ViaProbe> {
    return unwrap(tauriInvoke<ApiResult<ViaProbe>>('probe_via', { deviceId }));
  }

  viaReadState(deviceId: string): Promise<ViaState> {
    return unwrap(tauriInvoke<ApiResult<ViaState>>('via_read_state', { deviceId }));
  }

  openSession(deviceId: string): Promise<ProfileBundle> {
    return unwrap(tauriInvoke<ApiResult<ProfileBundle>>('open_session', { deviceId }));
  }

  closeSession(sessionId: string): Promise<void> {
    return unwrap(tauriInvoke<ApiResult<void>>('close_session', { sessionId }));
  }

  setBinding(sessionId: string, req: BindingEntry): Promise<void> {
    return unwrap(tauriInvoke<ApiResult<void>>('set_binding', { sessionId, req }));
  }

  setLayout(sessionId: string, layout: NormalizedLayout): Promise<void> {
    return unwrap(tauriInvoke<ApiResult<void>>('set_layout', { sessionId, layout }));
  }

  importViaBundle(content: string): Promise<ProfileBundle> {
    return unwrap(tauriInvoke<ApiResult<ProfileBundle>>('import_via_bundle', { content }));
  }

  applyToRam(sessionId: string): Promise<void> {
    return unwrap(tauriInvoke<ApiResult<void>>('apply_to_ram', { sessionId }));
  }

  revertRam(sessionId: string): Promise<void> {
    return unwrap(tauriInvoke<ApiResult<void>>('revert_ram', { sessionId }));
  }

  commit(sessionId: string): Promise<void> {
    return unwrap(tauriInvoke<ApiResult<void>>('commit', { sessionId }));
  }

  run(sessionId: string, sequenceId: string): Promise<void> {
    return unwrap(tauriInvoke<ApiResult<void>>('run', { sessionId, sequenceId }));
  }

  stopAll(sessionId: string): Promise<void> {
    return unwrap(tauriInvoke<ApiResult<void>>('stop_all', { sessionId }));
  }

  getStatus(sessionId: string): Promise<StatusSnapshot> {
    return unwrap(tauriInvoke<ApiResult<StatusSnapshot>>('get_status', { sessionId }));
  }

  rebindDefinition(sessionId: string): Promise<void> {
    return unwrap(tauriInvoke<ApiResult<void>>('rebind_definition', { sessionId }));
  }

  viaSetKeycode(deviceId: string, layer: number, row: number, col: number, keycode: number): Promise<void> {
    return unwrap(
      tauriInvoke<ApiResult<void>>('via_set_keycode', {
        deviceId,
        layer,
        row,
        col,
        keycode,
      })
    );
  }
}
