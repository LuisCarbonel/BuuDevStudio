// Core types for device layout geometry, independent of UI/rendering concerns.

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface KeyElement {
  elementId: string; // unique ID, e.g., "key:0,3"
  matrixId: string | null; // matrix coordinate if applicable, e.g., "0,3"
  row: number;
  col: number;
  x: number; // in u units
  y: number; // in u units
  w: number; // in u units
  h: number; // in u units
  rotation?: number; // degrees, optional
  rawLabel?: string; // original string when not a standard row,col key
}

export interface ControlElement {
  elementId: string;
  kind: 'block' | 'encoder-block' | 'knob' | 'encoder' | 'oled' | 'button' | 'other';
  x: number;
  y: number;
  w: number;
  h: number;
  rawLabel?: string;
  matrixHint?: string | null;
  layoutIndex?: number; // stable order from layout parsing
  flags?: {
    encoder?: boolean;
  };
}

export interface NormalizedLayout {
  keys: KeyElement[];
  controls: ControlElement[];
  bounds: Bounds;
}

export interface DiagnosticEntry {
  level: 'info' | 'warning' | 'error';
  message: string;
  path?: string; // optional JSON path hint
}

export interface NormalizationResult {
  layout: NormalizedLayout | null;
  diagnostics: DiagnosticEntry[];
  format?: string;
}
