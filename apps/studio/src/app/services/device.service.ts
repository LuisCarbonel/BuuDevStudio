import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

import { DEVICE_GATEWAY, DeviceGateway } from './device-gateway/device-gateway';
import { StudioStateService, Binding, ProfileBundle as StoreProfileBundle, Layer as StoreLayer } from './studio-state.service';
import { BindingEntry, ProfileBundle as WireProfileBundle } from '../shared/models/device';

interface DeviceVm {
  connected: boolean;
  busy: boolean;
  running: boolean;
  ramLoaded: boolean;
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private connected = new BehaviorSubject<boolean>(false);
  private busy = new BehaviorSubject<boolean>(false);
  private running = new BehaviorSubject<boolean>(false);
  private ramLoaded = new BehaviorSubject<boolean>(false);
  private lastError = new BehaviorSubject<string | null>(null);
  private lastSuccess = new BehaviorSubject<string | null>(null);
  private sessionId: string | null = null;
  private deviceId: string | null = null;

  readonly connected$ = this.connected.asObservable();
  readonly busy$ = this.busy.asObservable();
  readonly running$ = this.running.asObservable();
  readonly ramLoaded$ = this.ramLoaded.asObservable();
  readonly error$ = this.lastError.asObservable();
  readonly success$ = this.lastSuccess.asObservable();

  readonly vm$: Observable<DeviceVm> = combineLatest([
    this.connected$,
    this.busy$,
    this.running$,
    this.ramLoaded$,
  ]).pipe(
    map(([connected, busy, running, ramLoaded]) => ({
      connected,
      busy,
      running,
      ramLoaded,
    }))
  );

  constructor(private studio: StudioStateService, @Inject(DEVICE_GATEWAY) private gateway: DeviceGateway) {}

  async connect(deviceId?: string) {
    if (this.busy.value) return;
    this.busy.next(true);
    try {
      const devices = await this.gateway.listDevices();
      const chosen = deviceId || devices[0]?.id;
      if (!chosen) throw new Error('No devices available');
      await this.openSession(chosen);
      this.connected.next(true);
      this.lastError.next(null);
      this.lastSuccess.next('Connected');
    } catch (e) {
      const msg = (e as Error)?.message ?? 'Failed to connect';
      this.lastError.next(msg);
      console.warn('Connect failed', e);
    } finally {
      this.busy.next(false);
    }
  }

  private async openSession(deviceId: string) {
    const bundle = await this.gateway.openSession(deviceId);
    const adapted = this.adaptBundle(bundle);
    this.sessionId = adapted.sessionId ?? null;
    this.deviceId = deviceId;
    this.studio.hydrateFromBundle(adapted);
    this.ramLoaded.next(!!adapted.appliedState);
    return adapted;
  }

  async refreshSession() {
    if (!this.deviceId) return;
    await this.openSession(this.deviceId);
  }

  async disconnect() {
    if (this.busy.value) return;
    if (this.sessionId) {
      try {
        await this.gateway.closeSession(this.sessionId);
      } catch {
        // ignore
      }
    }
    this.running.next(false);
    this.ramLoaded.next(false);
    this.connected.next(false);
    this.sessionId = null;
    this.deviceId = null;
    this.studio.markDisconnected();
  }

  async uploadToRam() {
    if (!this.connected.value || this.busy.value || !this.sessionId) return;
    this.busy.next(true);
    try {
      await this.gateway.applyToRam(this.sessionId);
      await this.refreshSession();
      this.ramLoaded.next(true);
      this.lastError.next(null);
      this.lastSuccess.next('Applied to RAM');
    } finally {
      this.busy.next(false);
    }
  }

  async revertRam() {
    if (!this.connected.value || this.busy.value || !this.sessionId) return;
    this.busy.next(true);
    try {
      await this.gateway.revertRam(this.sessionId);
      await this.refreshSession();
      this.ramLoaded.next(false);
      this.lastError.next(null);
      this.lastSuccess.next('Reverted');
    } finally {
      this.busy.next(false);
    }
  }

  async commitToFlash() {
    if (!this.connected.value || this.busy.value || !this.sessionId) return;
    this.busy.next(true);
    try {
      await this.gateway.commit(this.sessionId);
      await this.refreshSession();
      this.lastError.next(null);
      this.lastSuccess.next('Committed');
    } finally {
      this.busy.next(false);
    }
  }

  run() {
    if (!this.connected.value || this.busy.value) return;
    this.running.next(true);
    if (this.sessionId) {
      this.gateway.run(this.sessionId, this.studio.selectedScriptId ?? '').catch(() => {});
    }
  }

  stopAll() {
    if (!this.connected.value) return;
    this.running.next(false);
    this.busy.next(false);
    if (this.sessionId) {
      this.gateway.stopAll(this.sessionId).catch(() => {});
    }
  }

  async pushBinding(layerId: number, targetId: string, binding: Binding) {
    if (!this.sessionId) return;
    try {
      await this.gateway.setBinding(this.sessionId, { layerId, targetId, binding });
      await this.refreshSession();
      this.lastError.next(null);
      this.lastSuccess.next('Binding updated');
    } catch (e) {
      this.lastError.next((e as Error)?.message ?? 'Failed to push binding');
      console.warn('Failed to push binding', e);
    }
  }

  isDirty(): boolean {
    const device = this.studio.snapshot.device;
    const committed = device.committedState?.checksum ?? null;
    const staged = device.stagedState?.checksum ?? committed;
    return committed !== staged;
  }

  getSyncStats() {
    const device = this.studio.snapshot.device;
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
      scripts: bundle.scripts as any,
      committedState: bundle.committedState as any,
      appliedState: bundle.appliedState as any,
      stagedState: bundle.stagedState as any,
      sessionId: bundle.sessionId,
    };
  }

  get lastErrorMessage() {
    return this.lastError.value;
  }

  get lastSuccessMessage() {
    return this.lastSuccess.value;
  }
}
