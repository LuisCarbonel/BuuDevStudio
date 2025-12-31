import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceService } from '../../services/device.service';
import { StudioStateService, Sequance, Step } from '../../services/studio-state.service';

@Component({
  selector: 'app-recorder-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recorder.page.html',
  styleUrl: './recorder.page.scss',
})
export class RecorderPage {
  recording = false;
  steps: Step[] = [];
  name = 'Recorded macro';
  selectedTargetId: string | null = null;
  lastId = 0;

  constructor(public studio: StudioStateService, private device: DeviceService) {}

  start() {
    this.recording = true;
    this.steps = [];
    this.lastId = 0;
  }

  stop() {
    this.recording = false;
  }

  addStep(op: string, arg?: string) {
    this.steps = [...this.steps, { id: ++this.lastId, name: `${op}${arg ? ' ' + arg : ''}`, op: op.toUpperCase(), arg }];
  }

  saveAndAssign() {
    if (!this.steps.length) return;
    const profileId = this.studio.selectedProfileId || 'p-default';
    const seq: Sequance = {
      id: `rec-${Date.now()}`,
      profileId,
      name: this.name.trim() || 'Recorded macro',
      steps: this.steps,
    };
    this.studio.addSequance(seq);
    if (this.selectedTargetId) {
      this.studio.setTarget(this.selectedTargetId);
      this.studio.assignSequanceToTarget(seq.id);
      this.device.pushBinding(this.studio.activeLayer, this.selectedTargetId, { type: 'sequanceRef', sequanceId: seq.id });
    }
    this.resetForm();
  }

  resetForm() {
    this.name = 'Recorded macro';
    this.steps = [];
    this.lastId = 0;
    this.recording = false;
  }

  get targets() {
    return this.studio.targets;
  }
}
