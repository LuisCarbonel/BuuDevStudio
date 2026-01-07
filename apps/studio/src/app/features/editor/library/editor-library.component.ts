import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { DragSourceDirective } from '@shared/directives/drag-source.directive';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { buildKeycodeBlockCategories, BuildKeycodeBlockCategoriesOptions, LibraryBlockCategory, isMacroSafeEntry } from '@shared/utils/keycodes/library-catalog';
import type { Capabilities as DeviceCapabilities } from '@shared/models/device';

export type LibraryMode = 'blocks' | 'sequences';

interface ProfileItem {
  id: string;
  name: string;
}

interface SequenceItem {
  id: string;
  name: string;
}

import type { LibraryBlockItem as BlockItem, LibraryBlockCategory as BlockCategory } from '@shared/utils/keycodes/library-catalog';

@Component({
  selector: 'app-editor-library',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    NzSegmentedModule,
    NzInputModule,
    NzCollapseModule,
    NzDividerModule,
    NzEmptyModule,
    NzListModule,
    NzButtonModule,
    DragSourceDirective,
  ],
  templateUrl: './editor-library.component.html',
  styleUrl: './editor-library.component.scss',
})
export class EditorLibraryComponent implements OnChanges, OnInit {
  @Input() profiles: ProfileItem[] = [];
  @Input() selectedProfileId: string | null = null;
  @Input() sequencesForProfile: SequenceItem[] = [];
  @Input() selectedSequenceId: string | null = null;
  @Input() focusMode = false;
  @Input() libraryMode: LibraryMode = 'blocks';
  @Input() librarySearch = '';
  @Input() enableBlockClick = false;
  @Input() blockPreset: 'default' | 'recorder' = 'default';
  @Input() capabilities: DeviceCapabilities | null = null;
  @Input() libraryVariant: 'editor' | 'recorder' = 'editor';

  @Output() selectProfile = new EventEmitter<string>();
  @Output() selectSequence = new EventEmitter<string>();
  @Output() modeChange = new EventEmitter<LibraryMode>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() createSequence = new EventEmitter<void>();
  @Output() blockClick = new EventEmitter<BlockItem>();

  showAdvanced = false;
  showDanger = false;
  showUnsupported = false;
  showKeyboardActions = false;
  showUserKeys = false;
  showExperimentalMouse = false;

  private readonly storageKeys = {
    showAdvanced: 'studio.library.showAdvanced',
    showDanger: 'studio.library.showDanger',
    showUnsupported: 'studio.library.showUnsupported',
    showKeyboardActions: 'studio.recorder.showKeyboardActions',
    showUserKeys: 'studio.recorder.showUserKeys',
    showExperimentalMouse: 'studio.recorder.showExperimentalMouse',
  };

  readonly blockListEnterPredicate: (drag: CdkDrag, drop: CdkDropList) => boolean = () => false;

  readonly modeOptions = [
    { label: 'Blocks', value: 'blocks' as LibraryMode },
    { label: 'Sequences', value: 'sequences' as LibraryMode },
  ];

  private _blockCategories: BlockCategory[] = this.buildCategories();
  
  private _cachedFilterTerm = '';
  private _cachedBlockCategories: BlockCategory[] = [];
  private _cachedSequences: SequenceItem[] = [];

  get searchPlaceholder() {
    return this.libraryMode === 'sequences' ? 'Search sequences...' : 'Search blocks and sequences...';
  }

  get selectedProfileName(): string {
    const profile = this.profiles.find(p => p.id === this.selectedProfileId);
    return profile?.name || 'No Profile';
  }

  get filteredBlockCategories(): BlockCategory[] {
    const term = this.librarySearch.trim().toLowerCase();
    if (!term) return this._blockCategories;
    
    // Return cached result if search term hasn't changed
    if (term === this._cachedFilterTerm && this._cachedBlockCategories.length) {
      return this._cachedBlockCategories;
    }
    
    this._cachedFilterTerm = term;
    this._cachedBlockCategories = this._blockCategories
      .map(cat => {
        const items = cat.items.filter(item => {
          const searchText = item.searchText ?? `${item.id} ${item.label} ${item.hint ?? ''}`.toLowerCase();
          return searchText.includes(term);
        });
        return { ...cat, items };
      })
      .filter(cat => cat.items.length);
    
    return this._cachedBlockCategories;
  }

  get filteredSequences(): SequenceItem[] {
    const term = this.librarySearch.trim().toLowerCase();
    if (!term) return this.sequencesForProfile;
    
    // Return cached result if search term hasn't changed
    if (term === this._cachedFilterTerm && this._cachedSequences.length) {
      return this._cachedSequences;
    }
    
    this._cachedFilterTerm = term;
    this._cachedSequences = this.sequencesForProfile.filter(s => s.name.toLowerCase().includes(term));
    
    return this._cachedSequences;
  }

  onSearchChange(value: string) {
    const newSearch = value ?? '';
    if (newSearch !== this.librarySearch) {
      this.librarySearch = newSearch;
      // Invalidate cache when search changes
      this._cachedFilterTerm = '';
      this._cachedBlockCategories = [];
      this._cachedSequences = [];
    }
    this.searchChange.emit(this.librarySearch);
  }

  ngOnInit(): void {
    if (this.libraryVariant === 'recorder') {
      this.showAdvanced = this.readToggle(this.storageKeys.showAdvanced, false);
      this.showDanger = this.readToggle(this.storageKeys.showDanger, false);
      this.showKeyboardActions = this.readToggle(this.storageKeys.showKeyboardActions, false);
      this.showUserKeys = this.readToggle(this.storageKeys.showUserKeys, false);
      this.showExperimentalMouse = this.readToggle(this.storageKeys.showExperimentalMouse, false);
    } else {
      this.showAdvanced = this.readToggle(this.storageKeys.showAdvanced, false);
      this.showDanger = this.readToggle(this.storageKeys.showDanger, false);
      this.showUnsupported = this.readToggle(this.storageKeys.showUnsupported, false);
    }
    this.refreshBlockCategories();
  }

  toggleAdvanced() {
    this.showAdvanced = !this.showAdvanced;
    this.writeToggle(this.storageKeys.showAdvanced, this.showAdvanced);
    this.refreshBlockCategories();
  }

  toggleDanger() {
    this.showDanger = !this.showDanger;
    this.writeToggle(this.storageKeys.showDanger, this.showDanger);
    this.refreshBlockCategories();
  }

  toggleUnsupported() {
    this.showUnsupported = !this.showUnsupported;
    this.writeToggle(this.storageKeys.showUnsupported, this.showUnsupported);
    this.refreshBlockCategories();
  }
  toggleKeyboardActions() {
    this.showKeyboardActions = !this.showKeyboardActions;
    this.writeToggle(this.storageKeys.showKeyboardActions, this.showKeyboardActions);
    this.refreshBlockCategories();
  }

  toggleUserKeys() {
    this.showUserKeys = !this.showUserKeys;
    this.writeToggle(this.storageKeys.showUserKeys, this.showUserKeys);
    this.refreshBlockCategories();
  }

  toggleExperimentalMouse() {
    this.showExperimentalMouse = !this.showExperimentalMouse;
    this.writeToggle(this.storageKeys.showExperimentalMouse, this.showExperimentalMouse);
    this.refreshBlockCategories();
  }

  blockPayload(item: BlockItem) {
    return { kind: 'block', id: item.id, action: item.action, arg: item.arg };
  }

  sequencePayload(seq: SequenceItem) {
    return { kind: 'sequence', id: seq.id };
  }

  trackByCategory(index: number, cat: BlockCategory): string {
    return cat.key;
  }

  trackByItem(index: number, item: BlockItem): string {
    return item.id;
  }

  trackBySequence(index: number, seq: SequenceItem): string {
    return seq.id;
  }

  onBlockClick(item: BlockItem, event?: MouseEvent) {
    if (!this.enableBlockClick) return;
    event?.preventDefault();
    event?.stopPropagation();
    this.blockClick.emit(item);
  }

  private buildCategories(): BlockCategory[] {
    const catalogCategories = buildKeycodeBlockCategories(this.buildCategoryOptions());

    const appActions: BlockCategory = {
      key: 'app-actions',
      label: 'App Actions',
      density: 'normal',
      items: [
        { id: 'open-file', label: 'Open File', action: 'OPEN_FILE' },
        { id: 'open-folder', label: 'Open Folder', action: 'OPEN_FOLDER' },
        { id: 'open-website', label: 'Open Website', action: 'OPEN_WEBSITE' },
        { id: 'paste-text', label: 'Paste Text', action: 'PASTE_TEXT' },
        { id: 'sarcasm', label: 'Sarcastify Text', action: 'SARCASIFY_TEXT' },
        { id: 'vol-up', label: 'Increase Volume', action: 'VOLUME_UP' },
        { id: 'vol-down', label: 'Decrease Volume', action: 'VOLUME_DOWN' },
        { id: 'vol-toggle', label: 'Toggle Mute Volume', action: 'VOLUME_TOGGLE_MUTE' },
      ],
    };

    const order = [
      'alphanumeric',
      'modifier',
      'navigation',
      'layers',
      'lighting',
      'function',
      'numpad',
      'media-volume',
      'media-track',
      'media-web',
      'media-display',
      'media-other',
      'mouse',
      'system',
      'macros',
      'special',
      'other',
    ];

    const ordered = order
      .map(key => catalogCategories.find(cat => cat.key === key))
      .filter((cat): cat is BlockCategory => !!cat);

    return [...ordered, appActions];
  }

  private buildCategoryOptions(): BuildKeycodeBlockCategoriesOptions | undefined {
    const isRecorder = this.libraryVariant === 'recorder' || this.blockPreset === 'recorder';
    const levelFilter = (entry: any) => {
      const level = entry.level ?? 'common';
      if (!this.showAdvanced && level === 'advanced') return false;
      if (!this.showDanger && level === 'danger') return false;
      if (!isRecorder && !this.showUnsupported && this.isUnsupported(entry) === true) return false;
      return true;
    };

    if (!isRecorder) {
      return {
        itemFilter: levelFilter,
      };
    }

    const allowedCategoryKeys = [
      'alphanumeric',
      'modifier',
      'navigation',
      'function',
      'numpad',
      'media-volume',
      'media-track',
      'media-web',
      'media-display',
      'media-other',
      'system',
    ];

    if (this.showExperimentalMouse) {
      allowedCategoryKeys.push('mouse');
    }

    const mouseButtons = new Set(['KC_BTN1', 'KC_BTN2', 'KC_BTN3', 'KC_BTN4', 'KC_BTN5']);

    return {
      allowedCategoryKeys,
      excludeKeyIds: ['KC_NO', 'KC_TRNS'],
      itemFilter: entry => {
        if (!levelFilter(entry)) return false;
        if (!isMacroSafeEntry(entry, {
          includeKeyboardActions: this.showKeyboardActions,
          includeUserKeys: this.showUserKeys,
          includeDanger: this.showDanger,
          includeAdvanced: this.showAdvanced,
          includeMouse: this.showExperimentalMouse,
        })) {
          return false;
        }
        if (entry.group === 'mouse') {
          return mouseButtons.has(entry.id);
        }
        return true;
      },
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['blockPreset'] || changes['capabilities'] || changes['libraryVariant']) {
      this.refreshBlockCategories();
    }
  }

  private refreshBlockCategories() {
    this._cachedFilterTerm = '';
    this._cachedBlockCategories = [];
    this._cachedSequences = [];
    this._blockCategories = this.buildCategories();
  }

  private readToggle(key: string, fallback: boolean): boolean {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'true';
  }

  private writeToggle(key: string, value: boolean) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value ? 'true' : 'false');
  }

  isUnsupported(item: { requires?: string[] }): boolean | null {
    if (!item.requires?.length) return false;
    if (!this.capabilities) return null;
    for (const req of item.requires) {
      if (Object.prototype.hasOwnProperty.call(this.capabilities, req)) {
        if (!(this.capabilities as any)[req]) return true;
      } else {
        return null;
      }
    }
    return false;
  }

  requiresLabel(item: { requires?: string[] }): string | null {
    if (!item.requires?.length) return null;
    return `Requires ${item.requires.join(', ')}`;
  }
}
