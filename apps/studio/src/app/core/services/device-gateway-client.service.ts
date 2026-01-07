import { Inject, Injectable } from '@angular/core';

import { DEVICE_GATEWAY, DeviceGateway } from '@core/gateways/device-gateway/device-gateway';
import type { BindingEntry } from '@shared/models/device';
import type { NormalizedLayout } from '@shared/utils/layout/models';

@Injectable({ providedIn: 'root' })
export class DeviceGatewayClientService {
  constructor(@Inject(DEVICE_GATEWAY) private readonly gateway: DeviceGateway) {}

  listDevices() {
    return this.gateway.listDevices();
  }

  inspectDevice(deviceId: string) {
    return this.gateway.inspectDevice(deviceId);
  }

  openSession(deviceId: string) {
    return this.gateway.openSession(deviceId);
  }

  closeSession(sessionId: string) {
    return this.gateway.closeSession(sessionId);
  }

  getStatus(sessionId: string) {
    return this.gateway.getStatus(sessionId);
  }

  applyToRam(sessionId: string) {
    return this.gateway.applyToRam(sessionId);
  }

  revertRam(sessionId: string) {
    return this.gateway.revertRam(sessionId);
  }

  commit(sessionId: string) {
    return this.gateway.commit(sessionId);
  }

  run(sessionId: string, sequenceId: string) {
    return this.gateway.run(sessionId, sequenceId);
  }

  stopAll(sessionId: string) {
    return this.gateway.stopAll(sessionId);
  }

  setBinding(sessionId: string, payload: BindingEntry) {
    return this.gateway.setBinding(sessionId, payload);
  }

  setLayout(sessionId: string, layout: NormalizedLayout) {
    return this.gateway.setLayout(sessionId, layout);
  }

  rebindDefinition(sessionId: string) {
    return this.gateway.rebindDefinition(sessionId);
  }

  probeVia(deviceId: string) {
    return this.gateway.probeVia(deviceId);
  }

  viaReadState(deviceId: string) {
    return this.gateway.viaReadState(deviceId);
  }

  viaSetKeycode(deviceId: string, layer: number, row: number, col: number, keycode: number) {
    return this.gateway.viaSetKeycode(deviceId, layer, row, col, keycode);
  }

  importViaBundle(content: string) {
    return this.gateway.importViaBundle(content);
  }
}
