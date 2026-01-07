import { Injectable } from '@angular/core';

import type { DeviceInfo } from '@shared/models/device';
import { DeviceGatewayClientService } from '@core/services/device-gateway-client.service';

@Injectable({ providedIn: 'root' })
export class DevicePollingService {
  constructor(private gateway: DeviceGatewayClientService) {}

  listDevices() {
    return this.gateway.listDevices();
  }

  sortDevices(devices: DeviceInfo[], prevOrder: Map<string, number>, preferredId: string | null): DeviceInfo[] {
    const next = devices.slice().sort((a, b) => {
      const idxA = prevOrder.get(a.id);
      const idxB = prevOrder.get(b.id);
      if (idxA !== undefined || idxB !== undefined) {
        if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
        return idxA !== undefined ? -1 : 1;
      }
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      if (nameA && nameB && nameA !== nameB) return nameA < nameB ? -1 : 1;
      const idA = (a.id || '').toLowerCase();
      const idB = (b.id || '').toLowerCase();
      return idA < idB ? -1 : idA > idB ? 1 : 0;
    });

    if (!preferredId) return next;
    const idx = next.findIndex(d => d.id === preferredId);
    if (idx <= 0) return next;
    const [preferred] = next.splice(idx, 1);
    next.unshift(preferred);
    return next;
  }
}
