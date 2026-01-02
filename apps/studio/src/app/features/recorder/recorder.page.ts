import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { NzMessageService } from 'ng-zorro-antd/message';
import { DeviceService } from '../../services/device.service';
import { StudioStateService, Sequence, Step } from '../../services/studio-state.service';

@Component({
  selector: 'app-recorder-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recorder.page.html',
  styleUrl: './recorder.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecorderPage {
  readonly studio = inject(StudioStateService);
  readonly device = inject(DeviceService);
  readonly message = inject(NzMessageService);

  private store = toSignal(this.studio.state$, { initialValue: this.studio.snapshot });
  readonly targets = computed(() => this.store().targets);
  readonly recording = signal(false);
  readonly steps = signal<Step[]>([]);
  readonly name = signal('Recorded macro');
  readonly selectedTargetId = signal<string | null>(null);
  lastId = 0;

  start() {
    this.recording.set(true);
    this.steps.set([]);
    this.lastId = 0;
  }

  stop() {
    this.recording.set(false);
  }

  addStep(op: string, arg?: string) {
    if (!this.recording()) return;
    const normalizedOp = op.trim().toUpperCase();
    if (!normalizedOp) return;
    const normalizedArg = arg?.trim();
    this.steps.update(steps => [
      ...steps,
      {
        id: ++this.lastId,
        name: `${normalizedOp}${normalizedArg ? ' ' + normalizedArg : ''}`,
        op: normalizedOp,
        arg: normalizedArg || undefined,
      },
    ]);
  }

  async saveAndAssign() {
    if (!this.steps().length) return;
    const profileId = this.studio.selectedProfileId || 'p-default';
    const targetId = this.selectedTargetId();
    if (targetId && !this.targets().includes(targetId)) {
      this.message.error('Selected target is no longer available.');
      return;
    }
    const seq: Sequence = {
      id: `rec-${Date.now()}`,
      profileId,
      name: this.name().trim() || 'Recorded macro',
      steps: this.steps(),
    };
    this.studio.addSequence(seq);
    if (targetId) {
      this.studio.setTarget(targetId);
      this.studio.assignSequenceToTarget(seq.id);
      const pushed = await this.device.pushBinding(this.studio.activeLayer, targetId, {
        type: 'sequenceRef',
        sequenceId: seq.id,
      });
      if (!pushed) {
        this.message.error('Failed to push binding to device.');
        return;
      }
      this.message.success('Binding updated');
    }
    this.resetForm();
  }

  resetForm() {
    this.name.set('Recorded macro');
    this.steps.set([]);
    this.selectedTargetId.set(null);
    this.lastId = 0;
    this.recording.set(false);
  }
}
