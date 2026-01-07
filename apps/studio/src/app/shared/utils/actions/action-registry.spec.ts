import { ActionRegistry } from './action-registry';
import { encodeKeycodeToCode } from '../keycodes/catalog';

describe('ActionRegistry pattern actions', () => {
  it('resolves KC prefix to keycode intent', () => {
    const intent = ActionRegistry.resolve('KC:KC_A');
    expect(intent?.kind).toBe('keycode');
    const code = encodeKeycodeToCode('KC_A');
    expect(code).toBe(0x04);
  });

  it('resolves KC TRNS', () => {
    const intent = ActionRegistry.resolve('KC:KC_TRNS');
    expect(intent?.kind).toBe('keycode');
  });

  it('resolves media key', () => {
    const intent = ActionRegistry.resolve('KC:KC_VOLU');
    expect(intent?.kind).toBe('keycode');
  });
});
