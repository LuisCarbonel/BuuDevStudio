import { EditorPage } from './editor.page';

class MockStudioStateService {
  selectedScript = { id: 's-1', name: 'Script 1' };
  selectedScriptId: string | null = 's-1';
  selectedProfileId = 'p-1';
  selectedTargetId: string | null = null;
  selectedProfile = { id: 'p-1', name: 'Default' } as unknown;
  activeLayer = 1;
  selectedBinding = null;
  scriptsForProfile = [this.selectedScript];
  assignedTargetIds: string[] = [];
  currentSteps = [];
  profiles = [this.selectedProfile] as unknown[];
  scripts = [this.selectedScript];
  targets = [];

  setTarget = jasmine.createSpy('setTarget').and.callFake((id: string) => {
    this.selectedTargetId = id;
  });
  selectScript = jasmine.createSpy('selectScript');
  selectProfile = jasmine.createSpy('selectProfile');
  selectStep = jasmine.createSpy('selectStep');

  assignScriptToTarget = jasmine.createSpy('assignScriptToTarget');
  assignSimpleAction = jasmine.createSpy('assignSimpleAction');
  assignInlineSequence = jasmine.createSpy('assignInlineSequence');
  assignProgram = jasmine.createSpy('assignProgram');
  clearBinding = jasmine.createSpy('clearBinding');
  setLayer = jasmine.createSpy('setLayer');
}

describe('EditorPage (logic only)', () => {
  let studio: MockStudioStateService;
  let component: EditorPage;

  beforeEach(() => {
    studio = new MockStudioStateService();
    component = new EditorPage(studio as unknown as any);
  });

  it('parses inline sequence text into normalized steps', () => {
    const steps = component.parseInlineSequence(' tap kc_a  \n wait   30 ');
    expect(steps).toEqual([
      { id: 1, name: 'tap kc_a', op: 'TAP', arg: 'kc_a' },
      { id: 2, name: 'wait   30', op: 'WAIT', arg: '30' },
    ]);
  });

  it('assigns script references when a script is selected', () => {
    component.bindingType = 'scriptRef';
    component.bindingScriptId = 's-custom';
    studio.selectedTargetId = 'key-01';

    component.assignSelectedScriptToTarget();

    expect(studio.assignScriptToTarget).toHaveBeenCalledWith('s-custom');
  });

  it('requires simple actions to have a command before assigning', () => {
    component.bindingType = 'simpleAction';
    studio.selectedTargetId = 'key-02';
    component.bindingAction = '';
    component.bindingActionArg = 'KC_A';

    component.assignSelectedScriptToTarget();
    expect(studio.assignSimpleAction).not.toHaveBeenCalled();

    component.bindingAction = '  tap KC_B  ';
    component.assignSelectedScriptToTarget();

    expect(studio.assignSimpleAction).toHaveBeenCalledWith('tap KC_B', 'KC_A');
  });

  it('blocks empty inline sequences and assigns parsed steps otherwise', () => {
    component.bindingType = 'inlineSequence';
    studio.selectedTargetId = 'key-03';
    component.bindingInlineText = '';

    component.assignSelectedScriptToTarget();
    expect(studio.assignInlineSequence).not.toHaveBeenCalled();

    component.bindingInlineText = 'tap KC_C\nwait 40';
    component.assignSelectedScriptToTarget();

    expect(studio.assignInlineSequence).toHaveBeenCalledWith([
      { id: 1, name: 'tap KC_C', op: 'TAP', arg: 'KC_C' },
      { id: 2, name: 'wait 40', op: 'WAIT', arg: '40' },
    ]);
  });
});
