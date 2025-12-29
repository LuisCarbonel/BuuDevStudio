import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AngularSplitModule } from 'angular-split';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTreeModule, NzFormatEmitEvent } from 'ng-zorro-antd/tree';
import { NzTagModule } from 'ng-zorro-antd/tag';

type StepOp = 'OP_WAIT' | 'OP_KD' | 'OP_KU' | 'OP_TAP' | 'OP_GAP' | 'OP_MD' | 'OP_MU';

interface MacroStep {
  id: number;
  op: StepOp;
  arg?: string;      // keycode / mouse btn / etc.
  ms?: number;       // delay for wait
  class?: number;    // delay class
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,

    AngularSplitModule,

    NzLayoutModule,
    NzButtonModule,
    NzTabsModule,
    NzTreeModule,
    NzTagModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Mocked “device status” for now (we’ll wire Rust later)
  isConnected = false;
  transport: 'mock' | 'hid' = 'mock';

  // Left tree (Scripts/Profiles placeholder)
  treeNodes = [
    {
      title: 'Profiles',
      key: 'profiles',
      expanded: true,
      children: [
        { title: 'Default', key: 'profile_default', isLeaf: true },
        { title: 'Apex', key: 'profile_apex', isLeaf: true },
      ],
    },
    {
      title: 'Scripts',
      key: 'scripts',
      expanded: true,
      children: [
        { title: 'Sprint + Strafe', key: 'script_1', isLeaf: true },
        { title: 'Loot Routine', key: 'script_2', isLeaf: true },
      ],
    },
  ];

  activeTabKey: 'editor' | 'device' | 'settings' = 'editor';

  // Center editor mock data
  steps: MacroStep[] = [
    { id: 1, op: 'OP_KD', arg: 'KC_LSFT' },
    { id: 2, op: 'OP_KD', arg: 'KC_W' },
    { id: 3, op: 'OP_WAIT', ms: 484, class: 2 },
    { id: 4, op: 'OP_GAP', ms: 18 },
    { id: 5, op: 'OP_TAP', arg: 'KC_E' },
    { id: 6, op: 'OP_WAIT', ms: 1094, class: 3 },
    { id: 7, op: 'OP_KU', arg: 'KC_W' },
    { id: 8, op: 'OP_KU', arg: 'KC_LSFT' },
  ];

  selectedStepId: number | null = 3;

  get selectedStep(): MacroStep | null {
    return this.steps.find(s => s.id === this.selectedStepId) ?? null;
  }

  get activeTabIndex(): number {
    switch (this.activeTabKey) {
      case 'editor':
        return 0;
      case 'device':
        return 1;
      case 'settings':
        return 2;
    }
  }

  onTabIndexChange(index: number) {
    this.activeTabKey = index === 0 ? 'editor' : index === 1 ? 'device' : 'settings';
  }

  // Toolbar actions (no backend yet)
  toggleConnect() {
    this.isConnected = !this.isConnected;
  }

  uploadToRam() {
    // placeholder
    console.log('Upload to RAM (mock)');
  }

  run() {
    console.log('Run (mock)');
  }

  stopAll() {
    console.log('STOP ALL / Panic (mock)');
  }

  commitToFlash() {
    console.log('Commit to flash (mock)');
  }

  onTreeEvent(ev: NzFormatEmitEvent) {
    if (ev.eventName === 'click' && ev.node?.isLeaf) {
      console.log('Tree selected:', ev.node.key);
    }
  }

  selectStep(step: MacroStep) {
    this.selectedStepId = step.id;
  }
}
