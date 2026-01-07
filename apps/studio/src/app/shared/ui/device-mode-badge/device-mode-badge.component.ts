import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-device-mode-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="studio-chip mode-badge" [ngClass]="'mode-' + mode">
      <span class="mode-icon">{{ icon }}</span>
      <span class="mode-label">{{ label }}</span>
    </span>
  `,
  styles: [`
    .mode-badge {
      height: var(--chip-height);
      padding: 0 var(--chip-padding-x);
      gap: var(--chip-gap);
      font-size: var(--ctrl-font-size);
      font-weight: 600;
      letter-spacing: 0.02em;
      transition: all 0.2s ease;
    }

    .mode-studio-hid {
      background: color-mix(in srgb, var(--accent) 15%, transparent);
      color: var(--accent);
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    }

    .mode-via-direct {
      background: color-mix(in srgb, var(--accent-success) 15%, transparent);
      color: var(--accent-success);
      border: 1px solid color-mix(in srgb, var(--accent-success) 30%, transparent);
    }

    .mode-read-only {
      background: color-mix(in srgb, var(--text-muted) 12%, transparent);
      color: var(--text-muted);
      border: 1px solid color-mix(in srgb, var(--text-muted) 30%, transparent);
    }

    .mode-icon {
      font-size: 1em;
      line-height: 1;
      display: inline-flex;
      align-items: center;
    }

    .mode-label {
      line-height: 1;
    }
  `]
})
export class DeviceModeBadgeComponent {
  @Input() mode: 'studio-hid' | 'via-direct' | 'read-only' = 'read-only';

  get icon(): string {
    switch (this.mode) {
      case 'studio-hid': return '🚀';
      case 'via-direct': return '⚡';
      case 'read-only': return '👁️';
    }
  }

  get label(): string {
    switch (this.mode) {
      case 'studio-hid': return 'Session Mode';
      case 'via-direct': return 'Direct Write';
      case 'read-only': return 'Preview Only';
    }
  }
}











