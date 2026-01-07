import { decodeKeycode, decodeKeycodeLabel, encodeKeycodeToCode, findKeyOption } from './catalog';

describe('keycodes catalog', () => {
  it('encodes and decodes a layer key', () => {
    const code = encodeKeycodeToCode('QK_MO', { layer: 3 });
    expect(code).toBe(0x5223);
    const decoded = decodeKeycode(code!);
    expect(decoded?.id).toBe('QK_MO');
    expect(decoded?.params?.layer).toBe(3);
    expect(decoded?.label.primary).toBe('MO(3)');
  });

  it('decodes a basic arrow key', () => {
    const opt = findKeyOption(0x52);
    expect(opt?.label.primary).toBe('Up');
  });

  it('encodes a mod-tap', () => {
    const code = encodeKeycodeToCode('QK_MT', { mod: 'LSFT', tap: 'KC_A' });
    expect(code).toBe(0x6204);
    const decoded = decodeKeycode(code!);
    expect(decoded?.id).toBe('QK_MT');
    expect(decoded?.params?.mod).toBe('LSFT');
    expect(decoded?.params?.tap).toBe('KC_A');
  });

  it('decodes fallback label', () => {
    const label = decodeKeycodeLabel(0xFFFF);
    expect(label.primary).toBe('0xFFFF');
  });

  it('encodes catalog-prefixed action', () => {
    const code = encodeKeycodeToCode('KC_A');
    expect(code).toBe(0x04);
  });
});
