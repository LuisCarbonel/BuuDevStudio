import { normalizeViaLayout } from './via-normalizer';

describe('normalizeViaLayout', () => {
  it('normalizes a simple VIA layout with keys and controls', () => {
    const result = normalizeViaLayout({
      layouts: {
        keymap: [
          ['0,0', '0,1', { w: 2 }, '0,2'],
          [{ y: 1 }, '1,0', 'x'],
        ],
      },
    });

    expect(result.diagnostics.length).toBe(0);
    expect(result.layout).toBeTruthy();
    const layout = result.layout!;
    expect(layout.keys.map(k => k.elementId)).toContain('key:0,0');
    expect(layout.keys.find(k => k.elementId === 'key:0,2')?.w).toBe(2);
    expect(layout.controls.length).toBeGreaterThan(0);
    expect(layout.bounds.width).toBeGreaterThan(0);
    expect(layout.bounds.height).toBeGreaterThan(0);
  });

  it('emits an error when keymap is missing', () => {
    const result = normalizeViaLayout({});
    expect(result.layout).toBeNull();
    expect(result.diagnostics.some(d => d.level === 'error')).toBeTrue();
  });
});
