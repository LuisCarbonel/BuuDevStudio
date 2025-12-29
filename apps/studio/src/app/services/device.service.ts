import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

import { StudioStateService } from './studio-state.service';

interface DeviceVm {
  connected: boolean;
  busy: boolean;
  running: boolean;
  ramLoaded: boolean;
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private connected = new BehaviorSubject<boolean>(false);
  private busy = new BehaviorSubject<boolean>(false);
  private running = new BehaviorSubject<boolean>(false);
  private ramLoaded = new BehaviorSubject<boolean>(false);
  private revision = 0;
  private lastUploadedChecksum: number | null = null;
  private lastUploadedProfileId: string | null = null;

  readonly connected$ = this.connected.asObservable();
  readonly busy$ = this.busy.asObservable();
  readonly running$ = this.running.asObservable();
  readonly ramLoaded$ = this.ramLoaded.asObservable();

  readonly vm$: Observable<DeviceVm> = combineLatest([
    this.connected$,
    this.busy$,
    this.running$,
    this.ramLoaded$,
  ]).pipe(
    map(([connected, busy, running, ramLoaded]) => ({
      connected,
      busy,
      running,
      ramLoaded,
    }))
  );

  constructor(private studio: StudioStateService) {}

  async connect() {
    if (this.busy.value) return;
    this.busy.next(true);
    // Simulate handshake + status fetch
    await new Promise(resolve => setTimeout(resolve, 150));
    this.connected.next(true);
    this.busy.next(false);
    console.log('Connected (mock handshake complete)');
  }

  disconnect() {
    if (this.busy.value) return;
    this.running.next(false);
    this.ramLoaded.next(false);
    this.connected.next(false);
    console.log('Disconnected (mock)');
  }

  async uploadToRam() {
    if (!this.connected.value || this.busy.value) return;
    this.busy.next(true);
    const compiled = this.studio.compileUploadPayload();
    await new Promise(resolve => setTimeout(resolve, 120));
    this.ramLoaded.next(true);
    this.busy.next(false);
    if (compiled.payload && compiled.stats) {
      const s = compiled.stats;
      this.lastUploadedChecksum = s.checksum;
      this.lastUploadedProfileId = compiled.payload.profileId;
      console.log(
        `Upload to RAM (mock) profile=${compiled.payload.profileId} targets=${s.targetsBound} scripts=${s.scriptsIncluded} steps=${s.steps} bytes=${s.byteSize} checksum=${s.checksum}`
      );
    } else {
      console.log('Upload to RAM (mock) no payload (no active profile)');
    }
  }

  run() {
    if (!this.connected.value || this.busy.value) return;
    this.running.next(true);
    console.log('Run (mock) started');
  }

  stopAll() {
    if (!this.connected.value) return;
    this.running.next(false);
    this.busy.next(false);
    console.log('Stop all (mock panic) — running cleared, held keys released');
  }

  async commitToFlash() {
    if (!this.connected.value || !this.ramLoaded.value || this.busy.value || this.running.value) return;
    this.busy.next(true);
    // Simulate safe flash commit
    await new Promise(resolve => setTimeout(resolve, 180));
    this.revision += 1;
    this.busy.next(false);
    console.log(`Commit to flash (mock) revision #${this.revision} saved`);
  }

  isDirty(): boolean {
    const compiled = this.studio.compileUploadPayload();
    if (!compiled.payload || !compiled.stats) return false;
    if (this.lastUploadedChecksum === null) return true;
    return !(
      compiled.payload.profileId === this.lastUploadedProfileId &&
      compiled.stats.checksum === this.lastUploadedChecksum
    );
  }

  getSyncStats() {
    const compiled = this.studio.compileUploadPayload();
    if (!compiled.payload || !compiled.stats) {
      return { dirty: false, current: null, last: null };
    }
    const dirty =
      this.lastUploadedChecksum === null ||
      compiled.payload.profileId !== this.lastUploadedProfileId ||
      compiled.stats.checksum !== this.lastUploadedChecksum;
    return {
      dirty,
      current: compiled.stats,
      last: this.lastUploadedChecksum,
      profileId: compiled.payload.profileId,
    };
  }
}
