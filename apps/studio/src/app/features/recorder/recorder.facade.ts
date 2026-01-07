import { Injectable, Signal, computed, signal, effect } from '@angular/core';

import { StudioStateService } from '@core/services/studio-state.service';
import type { Sequence, Step } from '@shared/models/device';
import { RecorderSequenceStore } from './recorder-sequence.store';
import { RecorderEngine } from './recorder-engine';
import { fromSteps } from './recorder-sequence.adapter';
import { recorderKeyMeta } from './recorder-keycode.util';
import type { LibraryMode } from '../editor/library/editor-library.component';

@Injectable()
export class RecorderFacade {
  readonly profiles: StudioStateService['profiles'];
  readonly selectedProfileId: StudioStateService['selectedProfileId'];
  readonly sequencesForProfile: StudioStateService['sequencesForProfile'];
  readonly selectedSequenceId: StudioStateService['selectedSequenceId'];

  readonly libraryMode = signal<LibraryMode>('sequences');
  readonly librarySearch = signal('');
  readonly sequenceName = signal('New Recording');
  readonly recording: RecorderEngine['recording'];

  readonly items: RecorderSequenceStore['items'];
  readonly selectedId: RecorderSequenceStore['selectedId'];
  readonly selectedItem: RecorderSequenceStore['selectedItem'];
  readonly dirty: RecorderSequenceStore['dirty'];
  readonly sourceSequenceId: RecorderSequenceStore['sourceSequenceId'];

  private lastLoadedSequenceId: string | null = null;

  readonly selectedSequence: Signal<Sequence | null>;

  readonly canSave: Signal<boolean>;

  constructor(
    public readonly studio: StudioStateService,
    public readonly store: RecorderSequenceStore,
    public readonly engine: RecorderEngine
  ) {
    this.profiles = this.studio.profiles;
    this.selectedProfileId = this.studio.selectedProfileId;
    this.sequencesForProfile = this.studio.sequencesForProfile;
    this.selectedSequenceId = this.studio.selectedSequenceId;
    this.recording = this.engine.recording;

    this.items = this.store.items;
    this.selectedId = this.store.selectedId;
    this.selectedItem = this.store.selectedItem;
    this.dirty = this.store.dirty;
    this.sourceSequenceId = this.store.sourceSequenceId;

    this.selectedSequence = computed(() =>
      this.studio.sequences().find(s => s.id === this.selectedSequenceId()) ?? null
    );

    this.canSave = computed(() =>
      this.items().length > 0 && this.sequenceName().trim().length > 0
    );

    effect(() => {
      const id = this.selectedSequenceId();
      if (!id || id === this.lastLoadedSequenceId) return;
      if (this.dirty() && this.sourceSequenceId() && id !== this.sourceSequenceId()) return;
      this.loadSequence(id);
      this.lastLoadedSequenceId = id;
    });
  }

  get lastLoadedSequence() {
    return this.lastLoadedSequenceId;
  }

  set lastLoadedSequence(value: string | null) {
    this.lastLoadedSequenceId = value;
  }

  resetForNewSequence() {
    this.store.clear();
    this.sequenceName.set('New Recording');
    this.lastLoadedSequenceId = null;
  }

  loadSequence(sequenceId: string) {
    if (this.selectedSequenceId() !== sequenceId) {
      this.studio.selectSequence(sequenceId);
    }
    const sequence = this.studio.sequences().find(s => s.id === sequenceId);
    if (sequence) {
      const items = fromSteps(sequence.steps);
      this.store.setItems(items, sequenceId);
      this.sequenceName.set(sequence.name);
      this.lastLoadedSequenceId = sequenceId;
    }
  }

  async updateExistingSequence(sequenceId: string, name: string, steps: Step[]) {
    const profileId = this.studio.selectedProfileId() || 'p-default';
    const newSeq: Sequence = {
      id: sequenceId,
      profileId,
      name,
      steps,
      meta: { ...(this.selectedSequence()?.meta ?? {}), ...recorderKeyMeta() },
    };

    this.studio.updateSequence(newSeq);
    this.store.markSaved();
  }

  async createNewSequence(name: string, steps: Step[]): Promise<string | null> {
    const profileId = this.studio.selectedProfileId() || 'p-default';

    const id = `rec-${Date.now()}`;
    const seq: Sequence = {
      id,
      profileId,
      name,
      steps,
      meta: recorderKeyMeta(),
    };

    this.studio.addSequence(seq);
    this.store.setItems(this.items(), seq.id);
    this.store.markSaved();
    this.lastLoadedSequenceId = seq.id;
    return id;
  }
}
