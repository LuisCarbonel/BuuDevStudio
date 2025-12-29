import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

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
    // Simulate serialize + send + ack
    await new Promise(resolve => setTimeout(resolve, 120));
    this.ramLoaded.next(true);
    this.busy.next(false);
    console.log('Uploaded to RAM (mock)');
  }

  run() {
    if (!this.connected.value || this.busy.value) return;
    this.running.next(true);
    console.log('Run (mock)');
  }

  stopAll() {
    if (!this.connected.value) return;
    this.running.next(false);
    this.busy.next(false);
    console.log('Stop all (mock panic)');
  }

  async commitToFlash() {
    if (!this.connected.value || !this.ramLoaded.value || this.busy.value || this.running.value) return;
    this.busy.next(true);
    // Simulate safe flash commit
    await new Promise(resolve => setTimeout(resolve, 180));
    this.busy.next(false);
    console.log('Commit to flash (mock)');
  }
}
