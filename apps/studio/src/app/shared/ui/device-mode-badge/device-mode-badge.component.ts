import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-device-mode-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mode-badge" [ngClass]="'mode-' + mode">
      <span class="mode-icon">{{ icon }}</span>
      <span class="mode-label">{{ label }}</span>
    </div>
  `,
  styles: [`
    .mode-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      font-size: var(--text-xs);
      font-weight: 600;
      letter-spacing: 0.025em;
      text-transform: uppercase;
      transition: all 0.2s ease;
    }

    .mode-studio-hid {
      background: linear-gradient(135deg, 
        color-mix(in srgb, var(--accent) 20%, transparent),
        color-mix(in srgb, var(--accent) 10%, transparent)
      );
      color: var(--accent);
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
      box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 15%, transparent);
    }

    .mode-via-direct {
      background: linear-gradient(135deg,
        color-mix(in srgb, var(--accent-success) 20%, transparent),
        color-mix(in srgb, var(--accent-success) 10%, transparent)
      );
      color: var(--accent-success);
      border: 1px solid color-mix(in srgb, var(--accent-success) 30%, transparent);
      box-shadow: 0 0 12px color-mix(in srgb, var(--accent-success) 15%, transparent);
    }

    .mode-read-only {
      background: linear-gradient(135deg,
        color-mix(in srgb, var(--text-muted) 20%, transparent),
        color-mix(in srgb, var(--text-muted) 10%, transparent)
      );
      color: var(--text-muted);
      border: 1px solid color-mix(in srgb, var(--text-muted) 30%, transparent);
    }

    .mode-icon {
      font-size: 1.1em;
      line-height: 1;
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











