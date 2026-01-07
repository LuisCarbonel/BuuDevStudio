import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ControlElement, KeyElement } from '@shared/utils/layout/models';
import type { Binding, Capabilities as DeviceCapabilities } from '@shared/models/device';
import { KeyOption, encodeKeycodeToCode, keycodeEntries, decodeKeycodeLabel, resolveLegend } from '@shared/utils/keycodes/catalog';

@Component({
  selector: 'app-editor-inspector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor-inspector.component.html',
  styleUrl: './editor-inspector.component.scss',
})
export class EditorInspectorComponent {
  @Input() selectedTargetId: string | null = null;
  @Input() selectedLayoutElement: KeyElement | ControlElement | null = null;
  @Input() assignedTargetIds: string[] = [];
  @Input() activeLayer = 1;
  @Input() keycodeLabel: { primary: string; secondary?: string } | null = null;
  @Input() selectedSequenceName: string | null = null;
  @Input() currentBinding: Binding | null = null;
  @Input() pendingBindingText: string | null = null;
  @Input() bindingType: 'sequenceRef' | 'simpleAction' | 'inlineSequence' | 'program' | 'none' = 'sequenceRef';
  @Input() bindingOptions: { value: string; label: string }[] = [];
  @Input() bindingSequenceId: string | null = null;
  @Input() bindingAction = '';
  @Input() bindingActionArg = '';
  @Input() bindingInlineText = '';
  @Input() bindingProgramPath = '';
  @Input() bindingErrors: string[] = [];
  @Input() pendingChanges = false;
  @Input() sequencesForProfile: { id: string; name: string }[] = [];
  @Input() actions: string[] = [];
  @Input() selectedStep: { id: number; name: string; op: string; arg?: string; class?: number } | null = null;
  @Input() showSelectionSection = true;
  @Input() capabilities: DeviceCapabilities | null = null;
  @Input() readOnly = false;

  @Output() bindingTypeChange = new EventEmitter<typeof this.bindingType>();
  @Output() bindingSequenceChange = new EventEmitter<string>();
  @Output() bindingActionChange = new EventEmitter<string>();
  @Output() bindingActionArgChange = new EventEmitter<string>();
  @Output() bindingInlineTextChange = new EventEmitter<string>();
  @Output() bindingProgramPathChange = new EventEmitter<string>();
  @Output() assign = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  bindingLabel(binding: Binding | null): string {
    if (!binding) {
      if (this.keycodeLabel) {
        return this.keycodeLabel.secondary
          ? `${this.keycodeLabel.primary} / ${this.keycodeLabel.secondary}`
          : this.keycodeLabel.primary || 'None';
      }
      return 'None';
    }
    switch (binding.type) {
      case 'sequenceRef': {
        const seq = this.sequencesForProfile.find(s => s.id === binding.sequenceId);
        return seq ? `Sequence: ${seq.name}` : 'Sequence';
      }
      case 'simpleAction':
        return this.actionLabel(binding.action, binding.arg);
      case 'inlineSequence':
        return 'Inline macro';
      case 'program':
        return `Program: ${binding.path}`;
      case 'none':
      default:
        return 'None';
    }
  }

  pendingBindingLabel(): string {
    if (this.pendingBindingText) return this.pendingBindingText;
    switch (this.bindingType) {
      case 'sequenceRef': {
        const seq = this.sequencesForProfile.find(s => s.id === this.bindingSequenceId);
        return seq ? `Sequence: ${seq.name}` : 'Sequence (choose)';
      }
      case 'simpleAction':
        return this.bindingAction ? this.actionLabel(this.bindingAction, this.bindingActionArg) : 'Action (set)';
      case 'inlineSequence':
        return this.bindingInlineText ? 'Inline macro (pending)' : 'Inline macro (add text)';
      case 'program':
        return this.bindingProgramPath ? `Program: ${this.bindingProgramPath}` : 'Program (path required)';
      case 'none':
      default:
        return 'None';
    }
  }

  contextOpen = true;

  isControlElement(el: KeyElement | ControlElement): el is ControlElement {
    return (el as ControlElement).kind !== undefined;
  }

  get isEncoderTarget(): boolean {
    if (!this.selectedLayoutElement || !this.isControlElement(this.selectedLayoutElement)) return false;
    return this.selectedLayoutElement.flags?.encoder === true || this.selectedLayoutElement.kind === 'encoder-block';
  }

  get supportsEncoderActions(): boolean {
    const actions = this.capabilities?.actionTypes;
    return !!actions?.includes('encoder');
  }

  get encoderDescriptor() {
    if (!this.capabilities?.encoderDescriptors?.length) return null;
    if (!this.selectedLayoutElement || !this.isControlElement(this.selectedLayoutElement)) {
      return this.capabilities.encoderDescriptors[0];
    }
    const idx = this.selectedLayoutElement.layoutIndex ?? undefined;
    if (idx === undefined) {
      return this.capabilities.encoderDescriptors[0];
    }
    return this.capabilities.encoderDescriptors.find(d => d.id === idx) ?? this.capabilities.encoderDescriptors[0];
  }

  private actionLabel(action: string, arg?: string): string {
    if (action.startsWith('KC:')) {
      const keycodeId = action.slice(3);
      const text = this.formatKeycodeLabel(keycodeId);
      if (text) return text;
    }
    if (action.startsWith('KC_')) {
      const text = this.formatKeycodeLabel(action);
      if (text) return text;
    }
    return arg ? `${action} ${arg}` : action;
  }

  private formatKeycodeLabel(keycodeId: string, params?: any): string | null {
    const code = encodeKeycodeToCode(keycodeId, params);
    if (code == null) return null;
    const label = decodeKeycodeLabel(code);
    const entry = keycodeEntries.find(e => e.id === keycodeId);
    const group = (entry as any)?.group;
    const legend = entry ? resolveLegend(entry) : null;
    const primary = group === 'number' ? label.primary : (legend?.short ?? label.primary);
    if (!primary) return null;
    const secondary = label.secondary;
    if (!secondary || secondary === primary) return primary;
    return `${primary} / ${secondary}`;
  }
}
