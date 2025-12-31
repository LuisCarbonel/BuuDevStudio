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

  get deviceInfo() {
    return this.studio.snapshot.device;
  }

  get capabilities() {
    return this.deviceInfo.capabilities;
  }

  get activeProfile() {
    return this.studio.selectedProfile;
  }
}
