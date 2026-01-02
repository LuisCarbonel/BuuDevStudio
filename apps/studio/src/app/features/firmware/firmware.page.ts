import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService } from '../../services/device.service';
import { StudioStateService } from '../../services/studio-state.service';

@Component({
  selector: 'app-firmware-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './firmware.page.html',
  styleUrl: './firmware.page.scss',
})
export class FirmwarePage {
  constructor(public device: DeviceService, public studio: StudioStateService) {}

  get inspector$() {
    return this.device.inspector$;
  }

  get viaProbe$() {
    return this.device.viaProbe$;
  }

  probeVia() {
    this.device.probeVia();
  }

  rawHidProbe() {
    this.device.rawHidPing();
  }

  get deviceInfo() {
    return this.studio.snapshot.device;
  }

  get capabilities() {
    return this.deviceInfo.capabilities;
  }

  get activeProfile() {
    return this.studio.selectedProfile;
  }

  get definitionFingerprint() {
    return this.deviceInfo.definitionFingerprint || 'n/a';
  }

  get definitionLinked(): boolean {
    return !!this.deviceInfo.definitionFingerprint;
  }

  get layoutMeta() {
    const layout = this.studio.normalizedLayout;
    if (!layout) return null;
    const keys = layout.keys.length;
    const encoders = layout.controls.filter(c => (c.flags as any)?.encoder === true || c.kind === 'encoder-block').length;
    return { keys, encoders };
  }

  get uniqueId() {
    const fp = this.deviceInfo.fingerprint;
    if (!fp) return 'n/a';
    const hash = Array.from(fp).reduce((acc, ch) => ((acc * 31) ^ ch.charCodeAt(0)) >>> 0, 0);
    return hash.toString(16).padStart(8, '0');
  }

  rebindDefinition() {
    this.device.rebindDefinition();
  }

  async importDefinition(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const content = await file.text();
    await this.device.importViaBundle(content);
  }

  async copyDeviceReport() {
    const d = this.deviceInfo;
    if (!d) return;
    const report = {
      fingerprint: d.fingerprint ?? null,
      capabilityLevel: d.capabilityLevel ?? null,
      vendorId: d.vendorId ?? null,
      productId: d.productId ?? null,
      manufacturer: d.manufacturer ?? null,
      product: d.product ?? null,
      serial: d.serial ?? null,
      uniqueId: this.uniqueId,
      interfaces:
        d.interfaces?.map(i => ({
          usagePage: i.usagePage,
          usage: i.usage,
          interfaceNumber: i.interfaceNumber ?? null,
          path: i.path ?? null,
          label: i.label ?? null,
        })) || [],
    };
    const json = JSON.stringify(report, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      console.log('[firmware] Copied device report', report);
    } catch (err) {
      console.warn('Failed to copy device report', err);
    }
  }
}
