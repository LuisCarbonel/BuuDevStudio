import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DeviceService } from '../services/device.service';
import { DEVICE_GATEWAY, DeviceGateway } from '../services/device-gateway/device-gateway';

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
    NzTagModule,
    NzSpinModule,
    NzIconModule,
    NzToolTipModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  navMain: ShellNavItem[] = [
    { key: 'editor', label: 'Editor', path: '/editor', description: 'Macros & layouts', icon: 'appstore' },
    { key: 'firmware', label: 'Firmware', path: '/firmware', description: 'QMK / device', icon: 'usb' },
    { key: 'recorder', label: 'Recorder', path: '/recorder', description: 'Capture inputs', icon: 'sound', disabled: true },
  ];
  navSettings: ShellNavItem[] = [
    { key: 'settings', label: 'Settings', path: '/settings', description: 'App preferences', icon: 'setting' },
  ];

  activeKey = 'editor';
  collapsed = true;
  pinned = false;
  private sub = new Subscription();

  constructor(
    private router: Router,
    public device: DeviceService,
    @Inject(DEVICE_GATEWAY) private gateway: DeviceGateway,
    private message: NzMessageService
  ) {}

  get vm$() {
    return this.device.vm$;
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

  ngOnInit(): void {
    this.syncActiveKey(this.router.url);
    this.sub.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => this.syncActiveKey(e.urlAfterRedirects))
    );

    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      this.gateway
        .listDevices()
        .then(devs => console.log('[gateway] devices', devs))
        .catch(err => console.warn('[gateway] listDevices failed', err));
    }

    this.sub.add(
      this.device.error$.subscribe(err => {
        if (err) {
          this.message.remove();
          this.showSnackbar('error', err, { nzDuration: 0, nzClass: 'app-snackbar app-snackbar-error' });
        }
      })
    );
    this.sub.add(
      this.device.success$.subscribe(msg => {
        if (msg) {
          this.message.remove();
          this.showSnackbar('success', msg, {
            nzDuration: 3000,
            nzClass: 'app-snackbar app-snackbar-success',
          });
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private syncActiveKey(url: string) {
    const first = url.split('/').filter(Boolean)[0];
    this.activeKey = first || 'editor';
  }

  handleHover(inside: boolean) {
    if (this.pinned) return;
    this.collapsed = !inside;
  }

  togglePinned() {
    this.pinned = !this.pinned;
    this.collapsed = !this.pinned;
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
