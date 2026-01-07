import { Injectable, Signal, computed } from '@angular/core';

import { StudioStateService } from '@core/services/studio-state.service';
import { DeviceService } from '@core/services/device.service';
import type { Binding as StudioBinding } from '@shared/models/device';
import { BindingIndicator } from '@shared/ui/device-view/device-view.component';
import {
  decodeKeycode as decodeKeycodeFull,
  decodeKeycodeLabel,
  keycodeEntries,
  KeycodeLabel,
  encodeKeycodeToCode,
  resolveLegend,
} from '@shared/utils/keycodes/catalog';
import { ActionRegistry } from '@shared/utils/actions/action-registry';

@Injectable()
export class EditorFacade {
  readonly profiles: StudioStateService['profiles'];
  readonly sequences: StudioStateService['sequences'];
  readonly selectedProfile: StudioStateService['selectedProfile'];
  readonly selectedProfileId: StudioStateService['selectedProfileId'];
  readonly sequencesForProfile: StudioStateService['sequencesForProfile'];
  readonly selectedSequence: StudioStateService['selectedSequence'];
  readonly selectedSequenceId: StudioStateService['selectedSequenceId'];
  readonly currentSteps: StudioStateService['currentSteps'];
  readonly activeLayer: StudioStateService['activeLayer'];
  readonly selectedBinding: StudioStateService['selectedBinding'];
  readonly targets: StudioStateService['targets'];
  readonly normalizedLayout: StudioStateService['normalizedLayout'];
  readonly selectedTargetId: StudioStateService['selectedTargetId'];
  readonly libraryMode: StudioStateService['libraryMode'];
  readonly librarySearch: StudioStateService['librarySearch'];
  readonly selectedStepId: StudioStateService['selectedStepId'];
  readonly assignedTargetIds: StudioStateService['assignedTargetIds'];
  readonly devices: DeviceService['devices'];
  readonly vm: DeviceService['vm'];

  readonly deviceName: Signal<string | null>;
  readonly capabilityLevel: Signal<string | null>;
  readonly selectedDeviceId: Signal<string | null>;
  readonly syncStats: Signal<ReturnType<DeviceService['getSyncStats']>>;
  readonly capabilities: Signal<ReturnType<StudioStateService['state']>['device']['capabilities']>;

  readonly bindingIndicators: Signal<Record<string, BindingIndicator>>;
  readonly keycodeLabels: Signal<Record<string, KeycodeLabel>>;
  readonly encoderLabels: Signal<Record<string, { ccw: KeycodeLabel | null; cw: KeycodeLabel | null; press: KeycodeLabel | null }>>;
  readonly layoutUnitPx: Signal<number>;

  constructor(
    public readonly studio: StudioStateService,
    public readonly device: DeviceService
  ) {
    this.profiles = this.studio.profiles;
    this.sequences = this.studio.sequences;
    this.selectedProfile = this.studio.selectedProfile;
    this.selectedProfileId = this.studio.selectedProfileId;
    this.sequencesForProfile = this.studio.sequencesForProfile;
    this.selectedSequence = this.studio.selectedSequence;
    this.selectedSequenceId = this.studio.selectedSequenceId;
    this.currentSteps = this.studio.currentSteps;
    this.activeLayer = this.studio.activeLayer;
    this.selectedBinding = this.studio.selectedBinding;
    this.targets = this.studio.targets;
    this.normalizedLayout = this.studio.normalizedLayout;
    this.selectedTargetId = this.studio.selectedTargetId;
    this.libraryMode = this.studio.libraryMode;
    this.librarySearch = this.studio.librarySearch;
    this.selectedStepId = this.studio.selectedStepId;
    this.assignedTargetIds = this.studio.assignedTargetIds;
    this.devices = this.device.devices;
    this.vm = this.device.vm;

    this.deviceName = computed(() => this.studio.state().device.name ?? null);
    this.capabilityLevel = computed(() => this.studio.state().device.capabilityLevel ?? null);
    this.selectedDeviceId = computed(() => this.device.currentDeviceId ?? null);
    this.syncStats = computed(() => this.device.getSyncStats());
    this.capabilities = computed(() => this.studio.state().device.capabilities);

    this.bindingIndicators = computed(() => {
      const sequenceNames = new Map(
        this.sequencesForProfile().map(s => [s.id, s.name])
      );
      const indicators: Record<string, BindingIndicator> = {};
      Object.entries(this.studio.activeBindings()).forEach(([targetId, binding]) => {
        if (!binding || binding.type === 'none') return;
        indicators[targetId] = this.bindingToIndicator(binding, sequenceNames);
      });
      return indicators;
    });

    this.keycodeLabels = computed(() => {
      const layout = this.normalizedLayout();
      if (!layout) return {};
      const via = this.studio.viaState();
      const labels: Record<string, KeycodeLabel> = {};
      const layerIdx = via?.keymap?.length
        ? Math.min(Math.max(0, this.activeLayer() - 1), via.keymap.length - 1)
        : 0;
      const layer = via?.keymap?.length ? via.keymap[layerIdx] : null;

      const applyCode = (id: string, matrix: string | null | undefined) => {
        if (!matrix) return;
        const parts = matrix.split(',');
        if (parts.length !== 2) return;
        const row = Number(parts[0]);
        const col = Number(parts[1]);
        if (Number.isNaN(row) || Number.isNaN(col)) return;
        const code = layer?.[row]?.[col];
        const parsed = parseInt(code ?? '0', 16);
        const decoded = decodeKeycodeFull(Number.isNaN(parsed) ? 0 : parsed);
        const formatted = this.formatLabel(decoded);
        if (formatted) labels[id] = formatted;
      };

      if (via?.keymap?.length) {
        layout.keys.forEach(k => applyCode(k.elementId, k.matrixId));
        layout.controls.forEach(c => applyCode(c.elementId, c.matrixHint ?? null));
      }

      // Prefer freshly-assigned bindings so the canvas updates immediately.
      const bindings = this.studio.activeBindings();
      Object.entries(bindings).forEach(([targetId, binding]) => {
        if (!binding || binding.type !== 'simpleAction') return;
        const label = this.labelFromBinding(binding.action, binding.arg);
        if (label) {
          labels[targetId] = label;
        }
      });
      return labels;
    });

    this.encoderLabels = computed(() => {
      const via = this.studio.viaState();
      const layout = this.normalizedLayout();
      const encoderMap = via?.encoderMap;
      if (!layout) return {};

      const layerIdx = encoderMap?.length
        ? Math.min(Math.max(0, this.activeLayer() - 1), encoderMap.length - 1)
        : 0;
      const layerEncoders = encoderMap?.[layerIdx] ?? [];
      const encoders = layout.controls.filter(c => c.flags?.encoder || c.kind === 'encoder-block');
      const labels: Record<string, { ccw: KeycodeLabel | null; cw: KeycodeLabel | null; press: KeycodeLabel | null }> = {};

      const decodeHex = (hex?: string | null) => {
        if (!hex) return null;
        const parsed = parseInt(hex, 16);
        if (Number.isNaN(parsed)) return null;
        const decoded = decodeKeycodeFull(parsed);
        return this.formatLabel(decoded);
      };

      const pressLabel = (matrix: string | null | undefined) => {
        if (!matrix) return null;
        const parts = matrix.split(',');
        if (parts.length !== 2) return null;
        const row = Number(parts[0]);
        const col = Number(parts[1]);
        if (Number.isNaN(row) || Number.isNaN(col)) return null;
        const codeHex = via?.keymap?.[layerIdx]?.[row]?.[col];
        return decodeHex(codeHex ?? null);
      };

      if (encoderMap?.length) {
        encoders.forEach((ctrl, idx) => {
          const encoderIndex = ctrl.encoderId ?? idx;
          const entry = layerEncoders[encoderIndex];
          const ccw = decodeHex(entry?.[0]);
          const cw = decodeHex(entry?.[1]);
          const press = pressLabel(ctrl.matrixHint ?? null);
          if (ccw || cw || press) {
            labels[ctrl.elementId] = { ccw, cw, press };
          }
        });
      }

      // Prefer freshly-assigned bindings so the canvas updates immediately.
      const bindings = this.studio.activeBindings();
      Object.entries(bindings).forEach(([targetId, binding]) => {
        if (!binding || binding.type !== 'simpleAction') return;
        const label = this.labelFromBinding(binding.action, binding.arg);
        if (!label) return;
        const [baseId, role] = targetId.split('#');
        if (!role) return;
        const entry = labels[baseId] ?? { ccw: null, cw: null, press: null };
        if (role === 'ccw') entry.ccw = label;
        if (role === 'cw') entry.cw = label;
        if (role === 'press') entry.press = label;
        labels[baseId] = entry;
      });

      return labels;
    });

    this.layoutUnitPx = computed(() => {
      const bounds = this.normalizedLayout()?.bounds;
      if (!bounds) return 60;
      const paddedWidth = bounds.width + 2;
      const targetWidthPx = 900;
      const unit = targetWidthPx / paddedWidth;
      return Math.max(50, Math.min(unit, 110));
    });
  }

  private bindingToIndicator(binding: StudioBinding, sequenceNames: Map<string, string>): BindingIndicator {
    switch (binding.type) {
      case 'sequenceRef':
        return { label: `Sequence: ${this.truncateLabel(sequenceNames.get(binding.sequenceId) ?? 'Unknown')}` };
      case 'simpleAction':
        return { label: `Action: ${this.truncateLabel(binding.action || 'Action')}` };
      case 'inlineSequence':
        return { label: 'Inline macro' };
      case 'program':
        return { label: 'Program' };
      default:
        return { label: 'Set' };
    }
  }

  private truncateLabel(label: string, max = 10) {
    return label.length > max ? `${label.slice(0, max)}.` : label;
  }

  private formatLabel(decoded: ReturnType<typeof decodeKeycodeFull>) {
    if (!decoded) return null;
    const entry = keycodeEntries.find(e => e.id === decoded.id);
    const group = (entry as any)?.group;
    const legend = entry ? resolveLegend(entry) : null;

    if (group === 'number') {
      const primary = decoded.label.primary || legend?.short || '';
      const secondary = decoded.label.secondary;
      if (!primary) return null;
      return primary === secondary ? { primary } : { primary, secondary };
    }

    // For layer-style keys, surface the target layer/tap info.
    if (group === 'layer' || group === 'layerTap' || group === 'modTap' || group === 'oneshot') {
      const primary = legend?.short ?? decoded.label.primary;
      const secondary = decoded.label.primary ?? decoded.label.secondary;
      if (!primary) return null;
      return primary === secondary ? { primary } : { primary, secondary };
    }

    const primary = legend?.short ?? decoded.label.primary;
    const secondary = decoded.label.secondary;
    if (!primary) return null;
    return { primary, secondary };
  }

  private labelFromBinding(action: string, arg?: string): KeycodeLabel | null {
    const intent = ActionRegistry.resolve(action, arg);
    let keycodeId: string | null = null;
    let params: any = undefined;
    if (intent?.kind === 'keycode') {
      keycodeId = intent.keycodeId;
      params = intent.params;
    } else if (action.startsWith('KC:')) {
      keycodeId = action.slice(3);
    } else if (action.startsWith('KC_')) {
      keycodeId = action;
    }
    if (!keycodeId) return null;
    const code = encodeKeycodeToCode(keycodeId, params);
    if (code == null) return null;
    const decoded = decodeKeycodeFull(code);
    return this.formatLabel(decoded);
  }

  formatActionLabel(action: string, arg?: string | null): string {
    const intent = ActionRegistry.resolve(action, arg ?? undefined);
    if (intent?.kind === 'keycode') {
      const code = encodeKeycodeToCode(intent.keycodeId, intent.params);
      if (code != null) {
        const label = decodeKeycodeLabel(code);
        return label.secondary ? `${label.primary} / ${label.secondary}` : label.primary;
      }
    }
    return arg ? `${action} ${arg}` : action;
  }
}
