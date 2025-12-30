import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ControlElement, KeyElement } from '../../../shared/layout/models';

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
  @Input() selectedSequanceName: string | null = null;
  @Input() bindingType: 'sequanceRef' | 'simpleAction' | 'inlineSequence' | 'program' | 'none' = 'sequanceRef';
  @Input() bindingSequanceId: string | null = null;
  @Input() bindingAction = '';
  @Input() bindingActionArg = '';
  @Input() bindingInlineText = '';
  @Input() bindingProgramPath = '';
  @Input() bindingErrors: string[] = [];
  @Input() sequancesForProfile: { id: string; name: string }[] = [];
  @Input() actions: string[] = [];
  @Input() selectedStep: { id: number; name: string; op: string; arg?: string; class?: number } | null = null;

  @Output() bindingTypeChange = new EventEmitter<typeof this.bindingType>();
  @Output() bindingSequanceChange = new EventEmitter<string>();
  @Output() bindingActionChange = new EventEmitter<string>();
  @Output() bindingActionArgChange = new EventEmitter<string>();
  @Output() bindingInlineTextChange = new EventEmitter<string>();
  @Output() bindingProgramPathChange = new EventEmitter<string>();
  @Output() assign = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  isControlElement(el: KeyElement | ControlElement): el is ControlElement {
    return (el as ControlElement).kind !== undefined;
  }
}
