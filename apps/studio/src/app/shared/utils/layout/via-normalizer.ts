import { Bounds, DiagnosticEntry, KeyElement, NormalizationResult, NormalizedLayout } from './models';
import { ControlElement } from './models';

interface ViaLikeLayout {
  layouts?: {
    keymap?: unknown;
  };
}

// VIA layout entries can be strings ("0,0") or objects adjusting cursor (x/y) or size (w/h).
type ViaKeymapRow = Array<string | Record<string, number>>;

function computeBounds(rects: Array<Pick<KeyElement, 'x' | 'y' | 'w' | 'h'>>): Bounds {
  const minX = Math.min(...rects.map(k => k.x));
  const minY = Math.min(...rects.map(k => k.y));
  const maxX = Math.max(...rects.map(k => k.x + k.w));
  const maxY = Math.max(...rects.map(k => k.y + k.h));
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function normalizeViaLayout(raw: unknown): NormalizationResult {
  const diagnostics: DiagnosticEntry[] = [];
  const parsed = raw as ViaLikeLayout;
  const keymap = parsed?.layouts?.keymap as ViaKeymapRow[] | undefined;
  const realKeyPattern = /^\d+,\d+$/;
  let blockCounter = 1;
  let controlLayoutIndex = 0;
  let encoderBlockIndex = 0;
  let lastEncoderHint: { row: number; col: number; id: number } | null = null;

  if (!Array.isArray(keymap)) {
    diagnostics.push({
      level: 'error',
      message: 'Missing or invalid layouts.keymap array.',
      path: 'layouts.keymap',
    });
    return { layout: null, diagnostics, format: 'via' };
  }

  const keys: KeyElement[] = [];
  const controls: ControlElement[] = [];

  keymap.forEach((rowEntries, rowIndex) => {
    if (!Array.isArray(rowEntries)) {
      diagnostics.push({
        level: 'warning',
        message: `Row ${rowIndex} is not an array; skipping.`,
        path: `layouts.keymap[${rowIndex}]`,
      });
      return;
    }
    let cursorX = 0;
    let cursorY = rowIndex;
    let nextW = 1;
    let nextH = 1;

    rowEntries.forEach((entry, colIndex) => {
      if (typeof entry === 'string') {
        const raw = entry;
        const trimmed = raw.trim();
        const firstLine = raw.split('\n')[0] || '';
        const isRealKey = realKeyPattern.test(trimmed);

        if (isRealKey) {
          const [rStr, cStr] = trimmed.split(',');
          const r = Number(rStr);
          const c = Number(cStr);
          if (Number.isNaN(r) || Number.isNaN(c)) {
            diagnostics.push({
              level: 'warning',
              message: `Unparseable key id "${raw}"`,
              path: `layouts.keymap[${rowIndex}][${colIndex}]`,
            });
          }

          keys.push({
            elementId: `key:${trimmed}`,
            matrixId: trimmed,
            row: r,
            col: c,
            x: cursorX,
            y: cursorY,
            w: nextW,
            h: nextH,
          });
        } else {
          const rawId = `blk-${String(blockCounter).padStart(3, '0')}`;
          blockCounter += 1;
          const isEncoder = raw.includes('\ne');
          const hint = firstLine && realKeyPattern.test(firstLine.trim()) ? firstLine.trim() : null;
          let encoderId: number | undefined;
          if (isEncoder) {
            if (hint) {
              const [rStr, cStr] = hint.split(',');
              const row = Number(rStr);
              const col = Number(cStr);
              if (!Number.isNaN(row) && !Number.isNaN(col)) {
                if (lastEncoderHint && lastEncoderHint.row === row && lastEncoderHint.col + 1 === col) {
                  encoderId = lastEncoderHint.id;
                  lastEncoderHint = { row, col, id: lastEncoderHint.id };
                } else {
                  encoderId = encoderBlockIndex;
                  lastEncoderHint = { row, col, id: encoderBlockIndex };
                  encoderBlockIndex += 1;
                }
              }
            }
            if (encoderId === undefined) {
              encoderId = encoderBlockIndex;
              encoderBlockIndex += 1;
              lastEncoderHint = null;
            }
          }
          controls.push({
            elementId: rawId,
            kind: isEncoder ? 'encoder-block' : 'block',
            x: cursorX,
            y: cursorY,
            w: nextW,
            h: nextH,
            rawLabel: raw,
            matrixHint: hint,
            layoutIndex: controlLayoutIndex++,
            encoderId,
            flags: { encoder: isEncoder },
          });
        }

        cursorX += nextW;
        nextW = 1;
        nextH = 1;
        return;
      }

      if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, number>;
        if (typeof obj['x'] === 'number') {
          cursorX += obj['x'];
        }
        if (typeof obj['y'] === 'number') {
          cursorY += obj['y'];
        }
        if (typeof obj['w'] === 'number') {
          nextW = obj['w'];
        }
        if (typeof obj['h'] === 'number') {
          nextH = obj['h'];
        }
      }
    });
  });

  const boundsSource = [...keys, ...controls];
  if (!boundsSource.length) {
    diagnostics.push({
      level: 'error',
      message: 'No keys or controls found after normalization.',
    });
    return { layout: null, diagnostics, format: 'via' };
  }

  const bounds = computeBounds(boundsSource);

  const layout: NormalizedLayout = {
    keys,
    controls,
    bounds,
  };

  return { layout, diagnostics, format: 'via' };
}
