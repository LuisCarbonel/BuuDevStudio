import { Component, Inject, signal, effect, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DeviceService } from '@core/services/device.service';
import { DEVICE_GATEWAY, DeviceGateway } from '@core/gateways/device-gateway/device-gateway';

interface ShellNavItem {
  key: string;
  label: string;
  path: string;
  description: string;
  icon: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzLayoutModule,
    NzMenuModule,
    NzButtonModule,
    NzIconModule,
    NzToolTipModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ShellComponent {
  navMain: ShellNavItem[] = [
    { key: 'editor', label: 'Editor', path: '/editor', description: 'Macros & layouts', icon: 'appstore' },
    { key: 'firmware', label: 'Firmware', path: '/firmware', description: 'QMK / device', icon: 'usb' },
    { key: 'recorder', label: 'Recorder', path: '/recorder', description: 'Capture inputs', icon: 'sound' },
  ];
  navSettings: ShellNavItem[] = [
    { key: 'settings', label: 'Settings', path: '/settings', description: 'App preferences', icon: 'setting' },
  ];

  // ✅ Convert to signals
  activeKey = signal('editor');
  collapsed = signal(true);
  pinned = signal(false);

  // ✅ Expose device VM as signal
  readonly vm!: typeof this.device.vm;

  constructor(
    private router: Router,
    public device: DeviceService,
    @Inject(DEVICE_GATEWAY) private gateway: DeviceGateway,
    private message: NzMessageService
  ) {
    // Initialize after injection
    this.vm = this.device.vm;
    // ✅ Use effect for route tracking
    effect(() => {
      this.router.events.subscribe(e => {
        if (e instanceof NavigationEnd) {
          this.syncActiveKey(e.urlAfterRedirects);
        }
      });
    });

    // ✅ Initial sync
    this.syncActiveKey(this.router.url);

    // ✅ Gateway initialization
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      this.gateway
        .listDevices()
        .then(devs => console.log('[gateway] devices', devs))
        .catch(err => console.warn('[gateway] listDevices failed', err));
    }

    // ✅ Use effect for error notifications
    effect(() => {
      const err = this.device.error();
      if (err) {
        this.message.remove();
        this.showSnackbar('error', err, { nzDuration: 30000, nzClass: 'app-snackbar app-snackbar-error' });
      }
    });

    // ✅ Use effect for success notifications
    effect(() => {
      const msg = this.device.success();
      if (msg) {
        this.message.remove();
        this.showSnackbar('success', msg, {
          nzDuration: 3000,
          nzClass: 'app-snackbar app-snackbar-success',
        });
      }
    });
  }

  get syncStats() {
    return this.device.getSyncStats();
  }

  get errorMessage() {
    return this.device.lastErrorMessage;
  }

  get successMessage() {
    return this.device.lastSuccessMessage;
  }

  private syncActiveKey(url: string) {
    const first = url.split('/').filter(Boolean)[0];
    this.activeKey.set(first || 'editor');
  }

  handleHover(inside: boolean) {
    if (this.pinned()) return;
    this.collapsed.set(!inside);
  }

  togglePinned() {
    this.pinned.update(p => !p);
    this.collapsed.set(!this.pinned());
  }

  private showSnackbar(
    type: 'success' | 'error',
    content: string,
    options: { nzDuration: number; nzClass: string }
  ) {
    const ref = this.message.create(type, content, options);
    // Allow click-to-dismiss for both success and error snackbars.
    queueMicrotask(() => {
      const el = document.querySelector('.app-snackbar .ant-message-notice-content');
      if (el) {
        el.addEventListener(
          'click',
          () => {
            this.message.remove(ref.messageId);
          },
          { once: true }
        );
      }
    });
  }
}
