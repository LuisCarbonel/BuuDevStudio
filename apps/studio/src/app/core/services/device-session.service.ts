import { Injectable } from '@angular/core';

import { DeviceGatewayClientService } from '@core/services/device-gateway-client.service';
import type { BindingEntry } from '@shared/models/device';
import type { NormalizedLayout } from '@shared/utils/layout/models';

@Injectable({ providedIn: 'root' })
export class DeviceSessionService {
  private sessionId: string | null = null;
  private deviceId: string | null = null;
  private preferredDeviceId: string | null = null;

  constructor(private gateway: DeviceGatewayClientService) {}

  get currentDeviceId() {
    return this.deviceId ?? this.preferredDeviceId;
  }

  get sessionIdValue() {
    return this.sessionId;
  }

  get deviceIdValue() {
    return this.deviceId;
  }

  get preferredDeviceIdValue() {
    return this.preferredDeviceId;
  }

  setPreferredDeviceId(deviceId: string | null) {
    this.preferredDeviceId = deviceId;
  }

  setSession(deviceId: string | null, sessionId: string | null) {
    this.deviceId = deviceId;
    this.sessionId = sessionId;
  }

  clearSession() {
    this.sessionId = null;
    this.deviceId = null;
    this.preferredDeviceId = null;
  }

  async openSession(deviceId: string) {
    const bundle = await this.gateway.openSession(deviceId);
    this.deviceId = deviceId;
    this.sessionId = bundle.sessionId ?? null;
    return bundle;
  }

  async closeSession() {
    if (this.sessionId) {
      await this.gateway.closeSession(this.sessionId);
    }
  }

  async getStatus() {
    if (!this.sessionId) return null;
    return this.gateway.getStatus(this.sessionId);
  }

  async applyToRam() {
    if (!this.sessionId) return;
    return this.gateway.applyToRam(this.sessionId);
  }

  async revertRam() {
    if (!this.sessionId) return;
    return this.gateway.revertRam(this.sessionId);
  }

  async commit() {
    if (!this.sessionId) return;
    return this.gateway.commit(this.sessionId);
  }

  async run(sequenceId: string) {
    if (!this.sessionId) return;
    return this.gateway.run(this.sessionId, sequenceId);
  }

  async stopAll() {
    if (!this.sessionId) return;
    return this.gateway.stopAll(this.sessionId);
  }

  async setBinding(payload: BindingEntry) {
    if (!this.sessionId) return;
    return this.gateway.setBinding(this.sessionId, payload);
  }

  async setLayout(layout: NormalizedLayout) {
    if (!this.sessionId) return;
    return this.gateway.setLayout(this.sessionId, layout);
  }

  async rebindDefinition() {
    if (!this.sessionId) return;
    return this.gateway.rebindDefinition(this.sessionId);
  }
}
