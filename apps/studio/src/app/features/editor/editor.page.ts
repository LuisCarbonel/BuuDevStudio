import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';

import { StudioStateService } from '../../services/studio-state.service';
import { DragSourceDirective } from '../../directives/drag-source.directive';
import { DropTargetDirective } from '../../directives/drop-target.directive';

type TargetId =
  | 'key-01'
  | 'key-02'
  | 'key-03'
  | 'key-04'
  | 'key-05'
  | 'key-06'
  | 'key-07'
  | 'key-08'
  | 'key-09'
  | 'key-10'
  | 'key-11'
  | 'key-12'
  | 'key-13'
  | 'key-14'
  | 'key-15'
  | 'knob-1-ccw'
  | 'knob-1-cw'
  | 'knob-1-press'
  | 'knob-2-ccw'
  | 'knob-2-cw'
  | 'knob-2-press'
  | 'knob-main-ccw'
  | 'knob-main-cw'
  | 'knob-main-press';

interface DeviceKey {
  id: TargetId;
  label: string;
  x: number;
  y: number;
  ariaLabel?: string;
}

interface LayerSlot {
  id: number;
  x: number;
  ariaLabel: string;
}

type KnobZone =
  | {
      kind: 'arc';
      id: TargetId;
      label: string;
      path: string;
      textX: number;
      textY: number;
      ariaLabel?: string;
    }
  | {
      kind: 'press';
      id: TargetId;
      label: string;
      cx: number;
      cy: number;
      r: number;
      textX: number;
      textY: number;
      textAnchor?: 'start' | 'middle' | 'end';
      ariaLabel?: string;
    };

interface KnobSpec {
  id: string;
  cx: number;
  cy: number;
  r: number;
  indicator?: { x1: number; y1: number; x2: number; y2: number };
  zones: KnobZone[];
}

interface DeviceLayout {
  keys: DeviceKey[];
  layers: LayerSlot[];
  knobs: KnobSpec[];
}

const buildArcPath = (cx: number, cy: number, outer: number, inner: number, clockwise: boolean) => {
  const sweepOuter = clockwise ? 1 : 0;
  const sweepInner = clockwise ? 0 : 1;
  return `M${cx} ${cy - outer} A${outer} ${outer} 0 0 ${sweepOuter} ${cx} ${cy + outer} A${inner} ${inner} 0 0 ${sweepInner} ${cx} ${cy - outer} Z`;
};

const DEVICE_LAYOUT: DeviceLayout = {
  layers: [
    { id: 1, x: 380, ariaLabel: 'Activate layer 1' },
    { id: 2, x: 420, ariaLabel: 'Activate layer 2' },
    { id: 3, x: 460, ariaLabel: 'Activate layer 3' },
    { id: 4, x: 500, ariaLabel: 'Activate layer 4' },
  ],
  keys: [
    { id: 'key-01', label: 'K01', x: 42, y: 42 },
    { id: 'key-02', label: 'K02', x: 102, y: 42 },
    { id: 'key-03', label: 'K03', x: 162, y: 42 },
    { id: 'key-04', label: 'K04', x: 222, y: 42 },
    { id: 'key-05', label: 'K05', x: 282, y: 42 },
    { id: 'key-06', label: 'K06', x: 42, y: 122 },
    { id: 'key-07', label: 'K07', x: 102, y: 122 },
    { id: 'key-08', label: 'K08', x: 162, y: 122 },
    { id: 'key-09', label: 'K09', x: 222, y: 122 },
    { id: 'key-10', label: 'K10', x: 282, y: 122 },
    { id: 'key-11', label: 'K11', x: 42, y: 202 },
    { id: 'key-12', label: 'K12', x: 102, y: 202 },
    { id: 'key-13', label: 'K13', x: 162, y: 202 },
    { id: 'key-14', label: 'K14', x: 222, y: 202 },
    { id: 'key-15', label: 'K15', x: 282, y: 202 },
  ],
  knobs: [
    {
      id: 'knob-1',
      cx: 410,
      cy: 80,
      r: 35,
      indicator: { x1: 410, y1: 80, x2: 410, y2: 45 },
      zones: [
        {
          kind: 'arc',
          id: 'knob-1-ccw',
          label: 'CCW',
          path: buildArcPath(410, 80, 35, 18, false),
          textX: 377,
          textY: 82,
        },
        {
          kind: 'arc',
          id: 'knob-1-cw',
          label: 'CW',
          path: buildArcPath(410, 80, 35, 18, true),
          textX: 430,
          textY: 82,
        },
        {
          kind: 'press',
          id: 'knob-1-press',
          label: 'P',
          cx: 410,
          cy: 80,
          r: 18,
          textX: 410,
          textY: 112,
          textAnchor: 'middle',
        },
      ],
    },
    {
      id: 'knob-2',
      cx: 510,
      cy: 80,
      r: 35,
      indicator: { x1: 510, y1: 80, x2: 510, y2: 45 },
      zones: [
        {
          kind: 'arc',
          id: 'knob-2-ccw',
          label: 'CCW',
          path: buildArcPath(510, 80, 35, 18, false),
          textX: 477,
          textY: 82,
        },
        {
          kind: 'arc',
          id: 'knob-2-cw',
          label: 'CW',
          path: buildArcPath(510, 80, 35, 18, true),
          textX: 530,
          textY: 82,
        },
        {
          kind: 'press',
          id: 'knob-2-press',
          label: 'P',
          cx: 510,
          cy: 80,
          r: 18,
          textX: 510,
          textY: 112,
          textAnchor: 'middle',
        },
      ],
    },
    {
      id: 'knob-main',
      cx: 460,
      cy: 250,
      r: 80,
      indicator: { x1: 460, y1: 250, x2: 460, y2: 170 },
      zones: [
        {
          kind: 'arc',
          id: 'knob-main-ccw',
          label: 'CCW',
          path: buildArcPath(460, 250, 80, 42, false),
          textX: 385,
          textY: 255,
        },
        {
          kind: 'arc',
          id: 'knob-main-cw',
          label: 'CW',
          path: buildArcPath(460, 250, 80, 42, true),
          textX: 525,
          textY: 255,
        },
        {
          kind: 'press',
          id: 'knob-main-press',
          label: 'PRESS',
          cx: 460,
          cy: 250,
          r: 42,
          textX: 460,
          textY: 345,
          textAnchor: 'middle',
        },
      ],
    },
  ],
};

@Component({
  selector: 'app-editor-page',
  standalone: true,
  imports: [CommonModule, DragDropModule, DragSourceDirective, DropTargetDirective],
  templateUrl: './editor.page.html',
  styleUrl: './editor.page.scss',
})
export class EditorPage {
  readonly deviceLayout = DEVICE_LAYOUT;
  readonly keyHitSize = 66;
  readonly keyHitRadius = 8;
  readonly keyCapSize = 50;
  readonly keyCapRadius = 5;
  readonly keyCapOffset = 8;
  @ViewChild('scriptsList', { read: CdkDropList, static: true }) scriptsDropList?: CdkDropList<unknown>;

  focusMode = false;
  libraryOpen = true;
  private prevLibraryOpen = true;
  bindingScriptId: string | null = null;
  bindingType: 'scriptRef' | 'simpleAction' | 'inlineSequence' | 'program' | 'none' = 'scriptRef';
  bindingAction = '';
  bindingActionArg = '';
  bindingInlineText = '';
  bindingProgramPath = '';

  actions = ['Wait', 'Key Down', 'Key Up', 'Tap', 'Mouse', 'If / Else', 'Set Variable', 'Loop'];

  presets = ['Micro-gap', 'Jitter pattern', 'Burst tap', 'Fast strafes'];

  constructor(private studio: StudioStateService) {}

  toggleLibrary() {
    this.libraryOpen = !this.libraryOpen;
  }

  toggleFocus() {
    const next = !this.focusMode;
    if (next) {
      this.prevLibraryOpen = this.libraryOpen;
      this.libraryOpen = false;
    } else {
      this.libraryOpen = this.prevLibraryOpen;
    }
    this.focusMode = next;
  }

  selectStep(id: number) {
    this.studio.selectStep(id);
  }

  get selectedStep() {
    return this.studio.currentSteps.find(s => s.id === this.selectedStepId) ?? null;
  }

  selectProfile(profileId: string) {
    this.studio.selectProfile(profileId);
  }

  selectScript(scriptId: string) {
    this.studio.selectScript(scriptId);
  }

  get selectedProfile() {
    return this.studio.selectedProfile;
  }

  get scriptsForProfile() {
    return this.studio.scriptsForProfile;
  }

  get selectedScript() {
    return this.studio.selectedScript;
  }

  get currentSteps() {
    return this.studio.currentSteps;
  }

  get profiles() {
    return this.studio.profiles;
  }

  get selectedProfileId() {
    return this.studio.selectedProfileId;
  }

  get selectedScriptId() {
    return this.studio.selectedScriptId;
  }

  get selectedStepId() {
    return this.studio.selectedStepId;
  }

  get activeLayer() {
    return this.studio.activeLayer;
  }

  get selectedBinding() {
    return this.studio.selectedBinding;
  }

  get targets() {
    return this.studio.targets;
  }

  get selectedTargetId() {
    return this.studio.selectedTargetId;
  }

  get scripts() {
    return this.studio.scripts;
  }

  get assignedTargetIds() {
    return this.studio.assignedTargetIds;
  }

  selectTarget(id: string) {
    this.studio.setTarget(id);
    const binding = this.selectedBinding;
    this.bindingType = binding?.type ?? 'none';
    this.bindingScriptId =
      binding && binding.type === 'scriptRef' ? binding.scriptId : this.selectedScriptId ?? null;
    if (binding?.type === 'simpleAction') {
      this.bindingAction = binding.action;
      this.bindingActionArg = binding.arg ?? '';
    } else {
      this.bindingAction = '';
      this.bindingActionArg = '';
    }
    if (binding?.type === 'inlineSequence') {
      this.bindingInlineText = binding.steps.map(s => `${s.op} ${s.arg ?? ''}`.trim()).join('\n');
    } else {
      this.bindingInlineText = '';
    }
    if (binding?.type === 'program') {
      this.bindingProgramPath = binding.path;
    } else {
      this.bindingProgramPath = '';
    }
  }

  assignSelectedScriptToTarget() {
    if (!this.selectedTargetId) return;
    if (this.bindingType !== 'none' && this.bindingErrors.length) return;
    switch (this.bindingType) {
      case 'scriptRef': {
        const scriptId = this.bindingScriptId || this.selectedScript?.id;
        if (!scriptId) return;
        this.studio.assignScriptToTarget(scriptId);
        break;
      }
      case 'simpleAction': {
        if (!this.bindingAction.trim()) return;
        this.studio.assignSimpleAction(this.bindingAction.trim(), this.bindingActionArg.trim() || undefined);
        break;
      }
      case 'program': {
        if (!this.bindingProgramPath.trim()) return;
        this.studio.assignProgram(this.bindingProgramPath.trim());
        break;
      }
      case 'inlineSequence': {
        const steps = this.parseInlineSequence(this.bindingInlineText);
        if (!steps.length) return;
        this.studio.assignInlineSequence(steps);
        break;
      }
      case 'none':
        this.studio.clearBinding();
        break;
    }
  }

  clearBinding() {
    this.studio.clearBinding();
    this.bindingScriptId = null;
    this.bindingAction = '';
    this.bindingActionArg = '';
    this.bindingInlineText = '';
    this.bindingProgramPath = '';
    this.bindingType = 'none';
  }

  setLayer(layer: number) {
    this.studio.setLayer(layer);
  }

  onBindingScriptChange(value: string) {
    this.bindingScriptId = value;
  }

  scriptName(id: string | null) {
    if (!id) return '';
    return this.scripts.find(s => s.id === id)?.name ?? '';
  }

  get scriptBindingId(): string | null {
    const b = this.selectedBinding;
    return b && b.type === 'scriptRef' ? b.scriptId : null;
  }

  onDropAssign(targetId: string, payload: unknown) {
    const scriptId = payload as string | null;
    if (!scriptId) return;
    this.selectTarget(targetId);
    this.bindingType = 'scriptRef';
    this.bindingScriptId = scriptId;
    this.studio.assignScriptToTarget(scriptId);
  }

  onTargetKeydown(event: KeyboardEvent, targetId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectTarget(targetId);
    }
  }

  onLayerKeydown(event: KeyboardEvent, layer: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.setLayer(layer);
    }
  }

  keyHitboxStyle(key: DeviceKey) {
    return {
      left: `${key.x}px`,
      top: `${key.y}px`,
      width: `${this.keyHitSize}px`,
      height: `${this.keyHitSize}px`,
    };
  }

  knobZoneHitboxStyle(knob: KnobSpec, zone: KnobZone) {
    const size = zone.kind === 'press' ? zone.r * 2 : knob.r * 2;
    return {
      left: `${(zone.kind === 'press' ? zone.cx : knob.cx) - size / 2}px`,
      top: `${(zone.kind === 'press' ? zone.cy : knob.cy) - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
    };
  }

  get bindingErrors(): string[] {
    const errors: string[] = [];
    switch (this.bindingType) {
      case 'scriptRef': {
        const scriptId = this.bindingScriptId || this.selectedScript?.id;
        if (!scriptId) errors.push('Select a script to assign.');
        break;
      }
      case 'simpleAction':
        if (!this.bindingAction.trim()) {
          errors.push('Action is required.');
        }
        break;
      case 'program':
        if (!this.bindingProgramPath.trim()) {
          errors.push('Program path is required.');
        }
        break;
      case 'inlineSequence': {
        const steps = this.parseInlineSequence(this.bindingInlineText);
        if (!steps.length) {
          errors.push('Add at least one macro line (e.g., TAP KC_SPACE).');
        }
        break;
      }
      case 'none':
        break;
    }
    return errors;
  }

  parseInlineSequence(text: string) {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    return lines.map((line, idx) => {
      const [op, ...rest] = line.split(' ');
      return { id: idx + 1, name: line, op: op.toUpperCase(), arg: rest.join(' ') };
    });
  }
}
