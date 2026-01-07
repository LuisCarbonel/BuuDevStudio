import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService } from '@core/services/device.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  constructor(private device: DeviceService) {}

  get sync() {
    const stats = this.device.getSyncStats();
    return { ...stats, deviceId: this.device.currentDeviceId ?? null };
  }

  refresh() {
    this.device.refreshSession();
  }
}
