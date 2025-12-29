import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';

interface ShellNavItem {
  key: string;
  label: string;
  path: string;
  description: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, NzLayoutModule, NzMenuModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  navMain: ShellNavItem[] = [
    { key: 'editor', label: 'Editor', path: '/editor', description: 'Macros & layouts' },
    { key: 'firmware', label: 'Firmware', path: '/firmware', description: 'QMK / device' },
    { key: 'recorder', label: 'Recorder', path: '/recorder', description: 'Capture inputs', disabled: true },
  ];
  navSettings: ShellNavItem[] = [
    { key: 'settings', label: 'Settings', path: '/settings', description: 'App preferences' },
  ];

  activeKey = 'editor';
  private sub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.syncActiveKey(this.router.url);
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.syncActiveKey(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private syncActiveKey(url: string) {
    const first = url.split('/').filter(Boolean)[0];
    this.activeKey = first || 'editor';
  }
}
