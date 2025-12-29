import { NormalizationResult } from './models';
import { normalizeViaLayout } from './via-normalizer';

export function normalizeAnyLayout(raw: unknown): NormalizationResult {
  const isVia = !!(raw as any)?.layouts?.keymap;
  if (isVia) {
    return normalizeViaLayout(raw);
  }

  return {
    layout: null,
    diagnostics: [
      {
        level: 'error',
        message: 'Unsupported layout format.',
      },
    ],
  };
}
