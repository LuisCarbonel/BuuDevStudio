import { Injectable, signal, computed } from '@angular/core';

import { StudioStateService, ProfileBundle as StoreProfileBundle, Layer as StoreLayer } from '@core/services/studio-state.service';
import { DeviceGatewayClientService } from '@core/services/device-gateway-client.service';
import { DevicePollingService } from '@core/services/device-polling.service';
import { DeviceSessionService } from '@core/services/device-session.service';
import type { Binding, Step } from '@shared/models/device';
import { BindingEntry, DeviceInfo, ProfileBundle as WireProfileBundle, StatusSnapshot, ViaProbe, ViaState } from '@shared/models/device';
import { GatewayError } from '@shared/models/api';
import { DragMonitorService } from '@shared/utils/drag-monitor.service';
import { ActionRegistry } from '@shared/utils/actions/action-registry';
import { encodeKeycodeToCode } from '@shared/utils/keycodes/catalog';

interface DeviceVm {
  connected: boolean;
  busy: boolean;
  running: boolean;
  ramLoaded: boolean;
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  // Convert to signals
  private readonly _connected = signal<boolean>(false);
  private readonly _busy = signal<boolean>(false);
  private readonly _running = signal<boolean>(false);
  private readonly _ramLoaded = signal<boolean>(false);
  private readonly _lastError = signal<string | null>(null);
  private readonly _lastSuccess = signal<string | null>(null);
  private readonly _devices = signal<DeviceInfo[]>([]);
  private readonly _inspector = signal<DeviceInfo | null>(null);
  private readonly _viaProbe = signal<ViaProbe | null>(null);
  private readonly _viaState = signal<ViaState | null>(null);

  private polling = false;

  // Expose readonly signals
  readonly connected = this._connected.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly running = this._running.asReadonly();
  readonly ramLoaded = this._ramLoaded.asReadonly();
  readonly error = this._lastError.asReadonly();
  readonly success = this._lastSuccess.asReadonly();
  readonly devices = this._devices.asReadonly();
  readonly inspector = this._inspector.asReadonly();
  readonly viaProbe = this._viaProbe.asReadonly();
  readonly viaState = this._viaState.asReadonly();

  // Computed VM signal replaces combineLatest
  readonly vm = computed<DeviceVm>(() => ({
    connected: this._connected(),
    busy: this._busy(),
    running: this._running(),
    ramLoaded: this._ramLoaded(),
  }));

  // ✨ Dual-Mode Support: Detect device mode based on capabilities
  readonly deviceMode = computed<'studio-hid' | 'via-direct' | 'read-only'>(() => {
    if (!this._connected()) return 'read-only';
    
    const caps = this.studio.state().device.capabilities;
    
    // Studio HID mode: Device supports RAM staging and commit
    if (caps.volatileApply && caps.commit) {
      return 'studio-hid';
    }
    
    // VIA Direct mode: Device supports keymap editing
    if (caps.keymap) {
      return 'via-direct';
    }
    
    // Read-only mode: Preview session or unknown device
    return 'read-only';
  });

  // ✨ UI visibility helpers
  readonly canEdit = computed(() => this.deviceMode() !== 'read-only');
  readonly showUploadCommitButtons = computed(() => this.deviceMode() === 'studio-hid');
  readonly isViaDirectMode = computed(() => this.deviceMode() === 'via-direct');

  constructor(
    private studio: StudioStateService,
    private gatewayClient: DeviceGatewayClientService,
    private session: DeviceSessionService,
    private pollingService: DevicePollingService,
    private dragMonitor: DragMonitorService
  ) {
    setInterval(() => {
      this.pollDevices();
    }, 5000);
  }

  get currentDeviceId() {
    return this.session.currentDeviceId;
  }

  get inspectorSnapshot() {
    return this._inspector();
  }

  async inspectDevice(deviceId: string) {
    try {
      const info = await this.gatewayClient.inspectDevice(deviceId);
      this._inspector.set(info);
      console.log('[device] inspect', info);
      this.session.setPreferredDeviceId(deviceId);
      // Do not auto-probe; user can trigger VIA probe manually.
    } catch (e) {
      console.warn('[device] inspect failed', e);
    }
  }

  async probeVia(deviceId?: string) {
    const target = deviceId ?? this.currentDeviceId;
    if (!target) return;
    const info = this._inspector();
    try {
      const hasRaw = info?.interfaces?.some(i => i.usagePage === 0xFF60 && i.usage === 0x0061);
      if (!hasRaw) {
        this._viaProbe.set({ viaDetected: false, viaProtocolVersion: null, writeLen: null, readLen: null, timeoutMs: null, firstBytes: null });
        return;
      }
      const probe = await this.gatewayClient.probeVia(target);
      this._viaProbe.set(probe);
      if (probe) {
        console.log('[device] raw HID probe', {
          writeLen: probe.writeLen ?? 'n/a',
          readLen: probe.readLen ?? 'n/a',
          timeoutMs: probe.timeoutMs ?? 'n/a',
          firstBytes: probe.firstBytes ?? 'n/a',
          detected: probe.viaDetected,
          version: probe.viaProtocolVersion ?? 'n/a',
        });
        this._lastSuccess.set('Raw HID probe sent');
      }
      await this.readViaState(target);
    } catch (e) {
      console.warn('[device] probe_via failed', e);
      this._viaProbe.set({ viaDetected: false, viaProtocolVersion: null, writeLen: null, readLen: null, timeoutMs: null, firstBytes: null });
    }
  }

  async rawHidPing(deviceId?: string) {
    return this.probeVia(deviceId);
  }

  private async readViaState(deviceId: string) {
    try {
      const state = await this.gatewayClient.viaReadState(deviceId);
      this._viaState.set(state);
      this.studio.setViaState(state);
      console.log('[device] via_read_state', state);
    } catch (e) {
      console.warn('[device] via_read_state failed', e);
      this._viaState.set(null);
      this.studio.setViaState(null);
    }
  }

  async writeViaKeycode(layer: number, row: number, col: number, keycode: number): Promise<boolean> {
    const deviceId = this.currentDeviceId;
    if (!deviceId || this._busy()) return false;
    console.log('[device] via set keycode', { deviceId, layer, row, col, keycode: `0x${keycode.toString(16)}` });
    this._busy.set(true);
    try {
      await this.gatewayClient.viaSetKeycode(deviceId, layer, row, col, keycode);
      await this.readViaState(deviceId);
      this._lastSuccess.set('Keycode updated');
      this._lastError.set(null);
      return true;
    } catch (e) {
      const err = this.normalizeError(e, 'Failed to write keycode');
      this._lastError.set(err.message);
      return false;
    } finally {
      this._busy.set(false);
    }
  }

  async connect(deviceId?: string) {
    if (this._busy()) return;
    this._busy.set(true);
    try {
      const devices = this._devices().length ? this._devices() : await this.pollingService.listDevices();
      this._devices.set(devices);
      const chosen = deviceId ?? this.session.deviceIdValue ?? this.session.preferredDeviceIdValue;
      if (!chosen) throw new Error('No devices available');
      this.inspectDevice(chosen);
      await this.openSession(chosen);
      this._connected.set(true);
      this._lastError.set(null);
      this._lastSuccess.set('Connected');
      this.session.setPreferredDeviceId(chosen);
    } catch (e) {
      const err = this.normalizeError(e, 'Failed to connect');
      this._lastError.set(err.message);
      console.warn('Connect failed', e);
    } finally {
      this._busy.set(false);
    }
  }

  private async openSession(deviceId: string) {
    const bundle = await this.session.openSession(deviceId);
    console.log('[device] openSession bundle', bundle);
    const adapted = this.adaptBundle(bundle);
    this.studio.hydrateFromBundle(adapted);
    this._ramLoaded.set(!!adapted.appliedState);
    await this.readViaStateIfSupported(deviceId, adapted.device);
    return adapted;
  }

  async refreshSession() {
    if (!this.session.deviceIdValue || !this.session.sessionIdValue) return;
    try {
      const status = await this.session.getStatus();
      if (!status) return;
      this.applyStatusSnapshot(status);
      this._lastError.set(null);
    } catch (e) {
      console.warn('Refresh status failed, attempting reopen', e);
      try {
        await this.openSession(this.session.deviceIdValue);
        this._lastError.set(null);
      } catch (reopenErr) {
        console.warn('Reopen session failed, disconnecting', reopenErr);
        await this.disconnect();
        const err = this.normalizeError(reopenErr, 'Device disconnected; please reconnect');
        this._lastError.set(err.message);
      }
    }
  }

  async disconnect() {
    if (this._busy()) return;
    try {
      await this.session.closeSession();
    } catch {
      // ignore
    }
    this._running.set(false);
    this._ramLoaded.set(false);
    this._connected.set(false);
    this._viaState.set(null);
    this.studio.setViaState(null);
    this.session.clearSession();
    this.studio.markDisconnected();
  }

  notifyError(message: string) {
    this._lastError.set(message);
  }

  notifySuccess(message: string) {
    this._lastSuccess.set(message);
  }

  async refreshDevices() {
    try {
      const preferred = this.session.deviceIdValue ?? this.session.preferredDeviceIdValue;
      const prevOrder = new Map(this._devices().map((d, idx) => [d.id, idx]));
      const devices = await this.pollingService.listDevices();
      const sortedDevices = this.pollingService.sortDevices(devices, prevOrder, preferred);
      let nextDevices = sortedDevices;
      const current = preferred;
      const currentPresent = current ? sortedDevices.some(d => d.id === current) : false;
      if (this._connected() && current && !currentPresent) {
        console.warn('[device] currently connected device missing; disconnecting');
        await this.disconnect();
        this.session.clearSession();
        nextDevices = sortedDevices;
      } else if (current && !currentPresent) {
        // preserve the selection as a placeholder so the UI doesn't jump
        nextDevices = [
          ...sortedDevices,
          {
            id: current,
            name: 'Previously selected',
            transport: 'hid',
          },
        ];
      }
      this._devices.set(nextDevices);
    } catch (e) {
      const err = this.normalizeError(e, 'Failed to list devices');
      this._lastError.set(err.message);
      console.warn('[device] listDevices failed', e);
    }
  }

  private async pollDevices() {
    if (this.polling || this._busy() || this.dragMonitor.isDragging()) return;
    this.polling = true;
    try {
      await this.refreshDevices();
    } finally {
      this.polling = false;
    }
  }

  async importViaBundle(content: string) {
    if (this._busy()) return;
    this._busy.set(true);
    try {
      const bundle = await this.gatewayClient.importViaBundle(content);
      const adapted = this.adaptBundle(bundle);
      this.session.setSession(adapted.device.id, adapted.sessionId ?? null);
      this.studio.hydrateFromBundle(adapted);
      this._connected.set(true);
      this._ramLoaded.set(!!adapted.appliedState);
      this._lastError.set(null);
      this._lastSuccess.set('Imported layout');
    } catch (e) {
      const err = this.normalizeError(e, 'Failed to import');
      this._lastError.set(err.message);
      console.warn('Import failed', e);
    } finally {
      this._busy.set(false);
    }
  }

  async uploadToRam() {
    if (!this._connected() || this._busy() || !this.session.sessionIdValue) return;
    this._busy.set(true);
    try {
      await this.session.applyToRam();
      await this.refreshSession();
      this._ramLoaded.set(true);
      this._lastError.set(null);
      this._lastSuccess.set('Applied to RAM');
    } catch (e) {
      const err = this.normalizeError(e, 'Failed to apply to RAM');
      this._lastError.set(err.message);
      console.warn('Upload to RAM failed', e);
    } finally {
      this._busy.set(false);
    }
  }

  async revertRam() {
    if (!this._connected() || this._busy() || !this.session.sessionIdValue) return;
    this._busy.set(true);
    try {
      await this.session.revertRam();
      await this.refreshSession();
      this._ramLoaded.set(false);
      this._lastError.set(null);
      this._lastSuccess.set('Reverted');
    } catch (e) {
      const err = this.normalizeError(e, 'Failed to revert');
      this._lastError.set(err.message);
      console.warn('Revert failed', e);
    } finally {
      this._busy.set(false);
    }
  }

  async commitToFlash() {
    if (!this._connected() || this._busy() || !this.session.sessionIdValue) return;
    this._busy.set(true);
    try {
      await this.session.commit();
      await this.refreshSession();
      this._lastError.set(null);
      this._lastSuccess.set('Committed');
    } catch (e) {
      const err = this.normalizeError(e, 'Failed to commit');
      this._lastError.set(err.message);
      console.warn('Commit failed', e);
    } finally {
      this._busy.set(false);
    }
  }

  run() {
    if (!this._connected() || this._busy()) return;
    this._running.set(true);
    const sequenceId = this.studio.selectedSequenceId() ?? '';
    this.session.run(sequenceId).catch(() => {});
  }

  stopAll() {
    if (!this._connected()) return;
    this._running.set(false);
    this._busy.set(false);
    this.session.stopAll().catch(() => {});
  }

  async pushBinding(layerId: number, targetId: string, binding: Binding): Promise<boolean> {
    console.log('[device] 🎯 pushBinding called:', {
      sessionId: this.session.sessionIdValue,
      connected: this._connected(),
      layerId,
      targetId,
      binding,
    });

    if (!this.session.sessionIdValue || !this._connected()) {
      console.warn('[device] Cannot push binding: no active session');
      return false;
    }
    
    // Check if device supports keymap editing
    const caps = this.studio.state().device.capabilities;
    console.log('[device] 🔍 Checking capabilities:', {
      keymap: caps.keymap,
      allCaps: caps,
    });

    if (!caps.keymap) {
      const isPreview = (this.session.sessionIdValue ?? '').startsWith('preview-');
      const errorMsg = isPreview 
        ? 'This is a preview session. Connect to a physical device to edit bindings.'
        : 'This device does not support keymap editing.';
      this._lastError.set(errorMsg);
      console.warn('[device]', errorMsg);
      return false;
    }
    
    console.log('[device] Capabilities check passed, calling backend setBinding...');
    
    try {
      let viaBinding = binding;
      if (this.deviceMode() === 'via-direct') {
        if (binding.type === 'simpleAction') {
          const encoded = this.encodeViaKeycodeBinding(binding);
          if (encoded.keycode == null) {
            const errorMsg = 'VIA keycode could not be resolved from this action.';
            this._lastError.set(errorMsg);
            console.warn('[device]', errorMsg);
            return false;
          }
          viaBinding = encoded.binding;
        } else if (binding.type === 'sequenceRef') {
          const seq = this.studio.sequences().find(s => s.id === binding.sequenceId);
          if (!seq) {
            const errorMsg = 'Sequence not found for binding.';
            this._lastError.set(errorMsg);
            console.warn('[device]', errorMsg);
            return false;
          }
          const normalized = this.normalizeStepsForVia(seq.steps);
          if (!normalized.ok) {
            this._lastError.set(normalized.error);
            console.warn('[device]', normalized.error);
            return false;
          }
          viaBinding = { type: 'inlineSequence', steps: normalized.steps, meta: { sequenceId: binding.sequenceId } };
        } else if (binding.type === 'inlineSequence') {
          const normalized = this.normalizeStepsForVia(binding.steps);
          if (!normalized.ok) {
            this._lastError.set(normalized.error);
            console.warn('[device]', normalized.error);
            return false;
          }
          viaBinding = { ...binding, steps: normalized.steps };
        } else if (binding.type === 'none') {
          viaBinding = binding;
        } else {
          const errorMsg = 'VIA only supports keycode or sequence bindings.';
          this._lastError.set(errorMsg);
          console.warn('[device]', errorMsg);
          return false;
        }
      }
      await this.session.setBinding({ layerId, targetId, binding: viaBinding });
      await this.refreshSession();
      this._lastError.set(null);
      this._lastSuccess.set('Binding updated');
      console.log('[device] Binding updated successfully');
      return true;
    } catch (e) {
      const err = this.normalizeError(e, 'Failed to push binding');
      this._lastError.set(err.message);
      console.warn('Failed to push binding', e);
      return false;
    }
  }

  private encodeViaKeycodeBinding(binding: Binding): { binding: Binding; keycode: number | null } {
    if (binding.type !== 'simpleAction') return { binding, keycode: null };
    let intent = ActionRegistry.resolve(binding.action, binding.arg);
    if (!intent && binding.action.startsWith('KC_')) {
      intent = { kind: 'keycode', keycodeId: binding.action };
    }
    if (!intent && binding.action.startsWith('KC:')) {
      intent = { kind: 'keycode', keycodeId: binding.action.slice(3) };
    }
    if (!intent || intent.kind !== 'keycode') return { binding, keycode: null };
    const code = encodeKeycodeToCode(intent.keycodeId, intent.params);
    if (code == null) return { binding, keycode: null };
    const hex = `0x${code.toString(16).toUpperCase().padStart(4, '0')}`;
    return { binding: { ...binding, arg: hex }, keycode: code };
  }

  private normalizeStepsForVia(
    steps: Step[]
  ): { ok: true; steps: Step[] } | { ok: false; steps: Step[]; error: string } {
    const normalized: Step[] = [];
    for (const step of steps) {
      const op = step.op.trim().toUpperCase();
      if (op === 'WAIT' || op === 'DELAY') {
        const ms = parseInt(step.arg ?? '0', 10);
        if (Number.isNaN(ms) || ms < 0 || ms > 65535) {
          return { ok: false, steps: normalized, error: 'Delay must be 0-65535 ms for VIA macros.' };
        }
        normalized.push({ ...step, op: 'WAIT', arg: String(ms) });
        continue;
      }

      const isKeyOp =
        op === 'TAP' ||
        op === 'KEY' ||
        op === 'PRESS' ||
        op === 'KD' ||
        op === 'KEY_DOWN' ||
        op === 'KEYDOWN' ||
        op === 'DOWN' ||
        op === 'KU' ||
        op === 'KEY_UP' ||
        op === 'KEYUP' ||
        op === 'UP';

      if (!isKeyOp) {
        return { ok: false, steps: normalized, error: `Unsupported macro op '${step.op}'.` };
      }

      const arg = (step.arg ?? '').trim();
      const parsed = this.parseViaKeycode(arg);
      if (parsed == null) {
        return { ok: false, steps: normalized, error: `Unrecognized keycode '${arg}'.` };
      }
      normalized.push({ ...step, op, arg: `0x${parsed.toString(16).toUpperCase().padStart(4, '0')}` });
    }
    return { ok: true, steps: normalized };
  }

  private parseViaKeycode(arg: string): number | null {
    if (!arg) return null;
    const hexMatch = /^0x([0-9a-f]+)$/i.exec(arg);
    if (hexMatch) {
      const code = parseInt(hexMatch[1], 16);
      return Number.isNaN(code) ? null : code;
    }
    if (/^\d+$/.test(arg)) {
      const code = parseInt(arg, 10);
      return Number.isNaN(code) ? null : code;
    }
    let keyId = arg.toUpperCase();
    if (keyId.startsWith('KC:')) keyId = keyId.slice(3);
    if (!keyId.startsWith('KC_')) keyId = `KC_${keyId}`;
    const code = encodeKeycodeToCode(keyId);
    return code ?? null;
  }

  async persistLayout() {
    if (!this.studio.state().device.capabilities.layouts) {
      return;
    }
    const layout = this.studio.normalizedLayout();
    if (!this.session.sessionIdValue || !layout) return;
    try {
      await this.session.setLayout(layout as any);
      this._lastError.set(null);
      this._lastSuccess.set('Layout saved');
    } catch (e) {
      const err = this.normalizeError(e, 'Failed to save layout');
      this._lastError.set(err.message);
      console.warn('Failed to save layout', e);
    }
  }

  async rebindDefinition() {
    if (!this.session.sessionIdValue) return;
    try {
      await this.session.rebindDefinition();
      await this.refreshSession();
      this._lastError.set(null);
      this._lastSuccess.set('Definition rebound to this device');
    } catch (e) {
      const err = this.normalizeError(e, 'Failed to bind definition');
      this._lastError.set(err.message);
    }
  }

  isDirty(): boolean {
    const device = this.studio.state().device;
    const committed = device.committedState?.checksum ?? null;
    const staged = device.stagedState?.checksum ?? committed;
    return committed !== staged;
  }

  getSyncStats() {
    const device = this.studio.state().device;
    return {
      committed: device.committedState,
      applied: device.appliedState ?? null,
      staged: device.stagedState ?? null,
      dirty: this.isDirty(),
      sessionId: device.sessionId ?? null,
    };
  }

  private adaptBundle(bundle: WireProfileBundle): StoreProfileBundle {
    const layers: StoreLayer[] = bundle.profile.layers.map(l => ({
      id: l.id,
      bindingsByTargetId: l.bindings.reduce<Record<string, Binding>>((acc, entry) => {
        acc[entry.targetId] = entry.binding as Binding;
        return acc;
      }, {}),
    }));

    return {
      device: bundle.device,
      capabilities: bundle.capabilities as any,
      profile: { ...bundle.profile, layers },
      layout: bundle.layout,
      sequences: bundle.sequences as any,
      committedState: bundle.committedState as any,
      appliedState: bundle.appliedState as any,
      stagedState: bundle.stagedState as any,
      sessionId: bundle.sessionId,
    };
  }

  private applyStatusSnapshot(status: StatusSnapshot) {
    this._ramLoaded.set(status.ramLoaded);
    this._running.set(!!status.running);
    this.studio.updateDeviceState({
      committedState: this.normalizeCommittedState(status.committedState),
      appliedState: this.normalizeCommittedState(status.appliedState),
      stagedState: this.normalizeCommittedState(status.stagedState),
      runningSequenceId: status.running ?? null,
      definitionFingerprint: status.definitionFingerprint ?? undefined,
    });
  }

  private normalizeCommittedState(state: { revision?: number | null; checksum?: number | null } | null | undefined) {
    if (!state) return null;
    return {
      profileId: (state as any).profileId ?? null,
      revision: state.revision ?? null,
      checksum: state.checksum ?? null,
    };
  }

  private async readViaStateIfSupported(
    deviceId: string,
    device: { capabilityLevel?: string | null; interfaces?: Array<{ usagePage: number; usage: number }> | null }
  ) {
    const hasRaw = (device.interfaces ?? []).some(i => i.usagePage === 0xff60 && i.usage === 0x0061);
    if (!hasRaw) {
      this._viaState.set(null);
      this.studio.setViaState(null);
      return;
    }
    try {
      const state = await this.gatewayClient.viaReadState(deviceId);
      this._viaState.set(state);
      this.studio.setViaState(state);
    } catch (e) {
      console.warn('[device] via_read_state failed', e);
      this._viaState.set(null);
      this.studio.setViaState(null);
    }
  }

  get lastErrorMessage() {
    return this._lastError();
  }

  get lastSuccessMessage() {
    return this._lastSuccess();
  }

  private normalizeError(e: unknown, fallback: string): { message: string; retryable: boolean; code?: string } {
    const err = e as GatewayError | Error | undefined;
    const message = (err?.message?.trim?.() || '') || fallback;
    const retryable = (err as GatewayError)?.retryable ?? true;
    const code = (err as GatewayError)?.code;
    const formatted = retryable ? message : `${message} (fatal)`;
    return { message: formatted, retryable, code };
  }
}
