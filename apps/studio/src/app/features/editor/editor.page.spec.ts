import { of } from 'rxjs';
import { EditorPage } from './editor.page';

class MockStudioStateService {
  selectedSequence = { id: 's-1', name: 'Sequence 1' };
  selectedSequenceId: string | null = 's-1';
  selectedProfileId = 'p-1';
  selectedTargetId: string | null = null;
  selectedProfile = { id: 'p-1', name: 'Default' } as unknown;
  activeLayer = 1;
  selectedBinding = null;
  libraryMode: 'blocks' | 'sequences' = 'blocks';
  librarySearch = '';
  sequencesForProfile = [this.selectedSequence];
  assignedTargetIds: string[] = [];
  currentSteps = [];
  profiles = [this.selectedProfile] as unknown[];
  sequences = [this.selectedSequence];
  targets = [];

  setTarget = jasmine.createSpy('setTarget').and.callFake((id: string) => {
    this.selectedTargetId = id;
  });
  selectSequence = jasmine.createSpy('selectSequence');
  selectProfile = jasmine.createSpy('selectProfile');
  selectStep = jasmine.createSpy('selectStep');
  setLibraryMode = jasmine.createSpy('setLibraryMode');
  setLibrarySearch = jasmine.createSpy('setLibrarySearch');

  assignSequenceToTarget = jasmine.createSpy('assignSequenceToTarget');
  assignSimpleAction = jasmine.createSpy('assignSimpleAction');
  assignInlineSequence = jasmine.createSpy('assignInlineSequence');
  assignProgram = jasmine.createSpy('assignProgram');
  clearBinding = jasmine.createSpy('clearBinding');
  setLayer = jasmine.createSpy('setLayer');
}

class MockDeviceService {
  vm$ = of({ connected: false, busy: false, running: false, ramLoaded: false });
  getSyncStats() {
    return { committed: null, applied: null, staged: null, dirty: false, sessionId: null };
  }
}

describe('EditorPage (logic only)', () => {
  let studio: MockStudioStateService;
  let device: MockDeviceService;
  let component: EditorPage;

  beforeEach(() => {
    studio = new MockStudioStateService();
    device = new MockDeviceService();
    component = new EditorPage(studio as unknown as any, device as unknown as any);
  });

  it('parses inline sequence text into normalized steps', () => {
    const steps = component.parseInlineSequence(' tap kc_a  \n wait   30 ');
    expect(steps).toEqual([
      { id: 1, name: 'tap kc_a', op: 'TAP', arg: 'kc_a' },
      { id: 2, name: 'wait   30', op: 'WAIT', arg: '30' },
    ]);
  });

  it('assigns sequence references when a sequence is selected', () => {
    component.bindingType = 'sequenceRef';
    component.bindingSequenceId = 's-custom';
    studio.selectedTargetId = 'key-01';

    component.assignSelectedSequenceToTarget();

    expect(studio.assignSequenceToTarget).toHaveBeenCalledWith('s-custom');
  });

  it('requires simple actions to have a command before assigning', () => {
    component.bindingType = 'simpleAction';
    studio.selectedTargetId = 'key-02';
    component.bindingAction = '';
    component.bindingActionArg = 'KC_A';

    component.assignSelectedSequenceToTarget();
    expect(studio.assignSimpleAction).not.toHaveBeenCalled();

    component.bindingAction = '  tap KC_B  ';
    component.assignSelectedSequenceToTarget();

    expect(studio.assignSimpleAction).toHaveBeenCalledWith('tap KC_B', 'KC_A');
  });

  it('blocks empty inline sequences and assigns parsed steps otherwise', () => {
    component.bindingType = 'inlineSequence';
    studio.selectedTargetId = 'key-03';
    component.bindingInlineText = '';

    component.assignSelectedSequenceToTarget();
    expect(studio.assignInlineSequence).not.toHaveBeenCalled();

    component.bindingInlineText = 'tap KC_C\nwait 40';
    component.assignSelectedSequenceToTarget();

    expect(studio.assignInlineSequence).toHaveBeenCalledWith([
      { id: 1, name: 'tap KC_C', op: 'TAP', arg: 'KC_C' },
      { id: 2, name: 'wait 40', op: 'WAIT', arg: '40' },
    ]);
  });
});
