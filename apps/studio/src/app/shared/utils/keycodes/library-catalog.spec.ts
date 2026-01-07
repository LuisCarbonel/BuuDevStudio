import { buildKeycodeBlockCategories } from './library-catalog';

describe('library catalog builder', () => {
  it('produces non-empty categories', () => {
    const cats = buildKeycodeBlockCategories();
    const map = new Map(cats.map(c => [c.key, c.items.length]));
    expect((map.get('alphanumeric') ?? 0) > 10).toBeTrue();
    expect((map.get('function') ?? 0) > 5).toBeTrue();
    expect((map.get('navigation') ?? 0) > 3).toBeTrue();
    expect((map.get('modifier') ?? 0) > 3).toBeTrue();
    expect((map.get('numpad') ?? 0) > 3).toBeTrue();
    expect((map.get('media-volume') ?? 0) > 1).toBeTrue();
    expect((map.get('media-track') ?? 0) > 1).toBeTrue();
    expect((map.get('mouse') ?? 0) > 2).toBeTrue();
  });
});
