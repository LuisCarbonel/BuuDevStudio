import { decodeKeycodeLabel as decodeKeycodeLabelFromCatalog, KeycodeLabel } from './keycodes/catalog';

export type { KeycodeLabel };

export function decodeKeycode(code: number): KeycodeLabel {
  return decodeKeycodeLabelFromCatalog(code);
}
