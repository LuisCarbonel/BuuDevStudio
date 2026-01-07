import { Component, inject, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';

import { EditorLibraryComponent, LibraryMode } from '../editor/library/editor-library.component';

import { RecorderSequenceStore } from './recorder-sequence.store';
import { RecorderEngine } from './recorder-engine';
import { RecorderFacade } from './recorder.facade';
import { toSteps } from './recorder-sequence.adapter';
import {
  SequenceItem,
  isKeyItem,
  isDelayItem,
  StrokeType,
  DEFAULT_DELAY_MS,
  createKeyItem,
} from './recorder-sequence.model';
import { resolveLibraryAction } from './recorder-keycode.util';

import { RecorderSequenceListComponent } from './components/recorder-sequence-list.component';
import { RecorderInspectorComponent } from './components/recorder-inspector.component';
import type { LibraryBlockItem } from '@shared/utils/keycodes/library-catalog';

@Component({
  selector: 'app-recorder-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzDropDownModule,
    NzModalModule,
    EditorLibraryComponent,
    RecorderSequenceListComponent,
    RecorderInspectorComponent,
  ],
  providers: [RecorderSequenceStore, RecorderEngine, RecorderFacade],
  templateUrl: './recorder.page.html',
  styleUrl: './recorder.page.scss',
})
export class RecorderPage implements OnDestroy {
  readonly facade = inject(RecorderFacade);
  readonly studio = this.facade.studio;
  readonly message = inject(NzMessageService);
  readonly modal = inject(NzModalService);
  readonly store = this.facade.store;
  readonly engine = this.facade.engine;

  // Library state (local to recorder flow)
  readonly profiles = this.facade.profiles;
  readonly selectedProfileId = this.facade.selectedProfileId;
  readonly sequencesForProfile = this.facade.sequencesForProfile;
  readonly selectedSequenceId = this.facade.selectedSequenceId;
  readonly libraryMode = this.facade.libraryMode;
  readonly librarySearch = this.facade.librarySearch;

  // Recording state
  readonly recording = this.facade.recording;

  // Sequence name (editable)
  readonly sequenceName = this.facade.sequenceName;

  // Store state
  readonly items = this.facade.items;
  readonly selectedId = this.facade.selectedId;
  readonly selectedItem = this.facade.selectedItem;
  readonly dirty = this.facade.dirty;
  readonly sourceSequenceId = this.facade.sourceSequenceId;
  // Computed
  readonly selectedSequence = this.facade.selectedSequence;

  readonly canSave = this.facade.canSave;

  ngOnDestroy() {
    if (this.recording()) {
      this.engine.stop();
    }
  }

  // Sequence name change
  onSequenceNameChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.sequenceName.set(input.value);
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    // Don't handle if recording (engine handles it)
    if (this.recording()) return;

    // Don't handle if typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    // Delete selected item
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedId()) {
        event.preventDefault();
        this.removeSelectedItem();
      }
    }

    // Escape to clear selection
    if (event.key === 'Escape') {
      this.store.clearSelection();
    }

    // Duplicate with Ctrl/Cmd+D
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      if (this.selectedId()) {
        event.preventDefault();
        this.store.duplicateSelected();
      }
    }
  }

  // Library interactions
  onSelectProfile(profileId: string) {
    this.studio.selectProfile(profileId);
  }

  onSelectSequence(sequenceId: string) {
    if (this.recording()) {
      this.modal.confirm({
        nzTitle: 'Recording in progress',
        nzContent: 'Stop recording before switching sequences?',
        nzOkText: 'Stop and Switch',
        nzCancelText: 'Cancel',
        nzWrapClassName: 'studio-overlay studio-overlay--modal',
        nzOnOk: () => {
          this.stopRecording();
          this.onSelectSequence(sequenceId);
        },
      });
      return;
    }

    if (this.dirty()) {
      this.modal.confirm({
        nzTitle: 'Unsaved Changes',
        nzContent: 'You have unsaved changes. Do you want to discard them?',
        nzOkText: 'Discard',
        nzOkDanger: true,
        nzCancelText: 'Cancel',
        nzWrapClassName: 'studio-overlay studio-overlay--modal',
        nzOnOk: () => this.facade.loadSequence(sequenceId),
      });
    } else {
      this.facade.loadSequence(sequenceId);
    }
  }

  onLibraryModeChange(mode: LibraryMode) {
    this.libraryMode.set(mode);
  }

  onLibrarySearchChange(term: string) {
    this.librarySearch.set(term);
  }

  onCreateSequence() {
    this.facade.resetForNewSequence();
  }

  onLibraryBlockClick(item: LibraryBlockItem) {
    const resolved = resolveLibraryAction(item.action);
    if (!resolved) {
      this.message.warning('Only key blocks can be added to a recording right now.');
      return;
    }

    if (this.recording()) {
      this.stopRecording();
    }

    const keyItem = createKeyItem(resolved.keyId, resolved.displayLabel, 'full', undefined, resolved.deviceCode);
    this.store.appendItem(keyItem);
    this.store.select(keyItem.id);
  }

  // Recording controls
  startRecording() {
    if (this.recording()) return;

    if (this.items().length) {
      this.modal.confirm({
        nzTitle: 'Start Recording',
        nzContent: 'Do you want to append to current steps or start fresh?',
        nzOkText: 'Append',
        nzCancelText: 'Start Fresh',
        nzWrapClassName: 'studio-overlay studio-overlay--modal',
        nzOnOk: () => this.doStartRecording(false),
        nzOnCancel: () => this.doStartRecording(true),
      });
    } else {
      this.doStartRecording(true);
    }
  }

  private doStartRecording(clear: boolean) {
    if (clear) {
      this.store.clear();
    }
    this.engine.start({ captureMode: 'separate' });
    this.message.info('Recording started. Press keys to capture...');
  }

  stopRecording() {
    if (!this.recording()) return;

    const newItems = this.engine.stop();
    this.message.success(`Recording stopped. Captured ${newItems.length} items.`);
  }

  // List interactions
  onSelectItem(id: string | null) {
    this.store.select(id);
  }

  onReorder(event: { fromIndex: number; toIndex: number }) {
    this.store.moveItem(event.fromIndex, event.toIndex);
  }

  onAddDelay() {
    const selectedId = this.selectedId();
    this.store.insertDelay(selectedId, DEFAULT_DELAY_MS);
  }

  onItemContextMenu(event: { event: MouseEvent; item: SequenceItem }) {
    // Context menu handled by nz-dropdown in template
  }

  onItemAction(event: { item: SequenceItem; action: 'duplicate' | 'remove' }) {
    if (event.action === 'duplicate') {
      this.store.duplicateItem(event.item.id);
      return;
    }
    if (event.action === 'remove') {
      this.store.removeItem(event.item.id);
    }
  }

  // Inspector interactions
  onStrokeChange(stroke: StrokeType) {
    const id = this.selectedId();
    if (id) {
      this.store.setStroke(id, stroke);
    }
  }

  onHoldMsChange(ms: number) {
    const id = this.selectedId();
    if (id) {
      this.store.setHoldMs(id, ms);
    }
  }

  onDelayMsChange(ms: number) {
    const id = this.selectedId();
    if (id) {
      this.store.setDelayMs(id, ms);
    }
  }

  onResetItem() {
    const id = this.selectedId();
    if (id) {
      this.store.resetToDefault(id);
    }
  }

  removeSelectedItem() {
    const id = this.selectedId();
    if (id) {
      this.store.removeItem(id);
    }
  }

  // Save operations
  async saveToSequence() {
    const items = this.items();
    const name = this.sequenceName().trim();

    if (!items.length) {
      this.message.warning('No steps to save');
      return;
    }

    if (!name) {
      this.message.warning('Please enter a sequence name');
      return;
    }

    const steps = toSteps(items);
    const sourceId = this.sourceSequenceId();

    if (sourceId) {
      await this.facade.updateExistingSequence(sourceId, name, steps);
      this.message.success('Sequence updated');
    } else {
      await this.facade.createNewSequence(name, steps);
      this.message.success('Sequence created');
    }
  }
  // Clear all
  clearAll() {
    if (!this.items().length) return;

    this.modal.confirm({
      nzTitle: 'Clear All',
      nzContent: 'Are you sure you want to clear all steps?',
      nzOkText: 'Clear',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzWrapClassName: 'studio-overlay studio-overlay--modal',
      nzOnOk: () => {
        this.facade.resetForNewSequence();
        this.message.info('All steps cleared');
      },
    });
  }
}
