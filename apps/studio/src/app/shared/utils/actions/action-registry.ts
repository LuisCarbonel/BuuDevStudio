import { KeycodeParams } from '../keycodes/catalog';

export type IntentDefinition =
  | { kind: 'keycode'; keycodeId: string; params?: KeycodeParams }
  | { kind: 'system'; plan: MacroPlan }
  | { kind: 'macro'; plan: MacroPlan }
  | { kind: 'sequence'; sequenceId: string };

export interface MacroPlan {
  op: string;
  args?: Record<string, string | number | boolean | undefined>;
}

const keycodeActions: Record<string, { keycodeId: string; params?: KeycodeParams }> = {
  // Alpha
  KEY_A: { keycodeId: 'KC_A' },
  KEY_B: { keycodeId: 'KC_B' },
  KEY_C: { keycodeId: 'KC_C' },
  KEY_D: { keycodeId: 'KC_D' },
  KEY_E: { keycodeId: 'KC_E' },
  KEY_F: { keycodeId: 'KC_F' },
  KEY_G: { keycodeId: 'KC_G' },
  KEY_H: { keycodeId: 'KC_H' },
  KEY_I: { keycodeId: 'KC_I' },
  KEY_J: { keycodeId: 'KC_J' },
  KEY_K: { keycodeId: 'KC_K' },
  KEY_L: { keycodeId: 'KC_L' },
  KEY_M: { keycodeId: 'KC_M' },
  KEY_N: { keycodeId: 'KC_N' },
  KEY_O: { keycodeId: 'KC_O' },
  KEY_P: { keycodeId: 'KC_P' },
  KEY_Q: { keycodeId: 'KC_Q' },
  KEY_R: { keycodeId: 'KC_R' },
  KEY_S: { keycodeId: 'KC_S' },
  KEY_T: { keycodeId: 'KC_T' },
  KEY_U: { keycodeId: 'KC_U' },
  KEY_V: { keycodeId: 'KC_V' },
  KEY_W: { keycodeId: 'KC_W' },
  KEY_X: { keycodeId: 'KC_X' },
  KEY_Y: { keycodeId: 'KC_Y' },
  KEY_Z: { keycodeId: 'KC_Z' },

  // Digits
  DIGIT_0: { keycodeId: 'KC_0' },
  DIGIT_1: { keycodeId: 'KC_1' },
  DIGIT_2: { keycodeId: 'KC_2' },
  DIGIT_3: { keycodeId: 'KC_3' },
  DIGIT_4: { keycodeId: 'KC_4' },
  DIGIT_5: { keycodeId: 'KC_5' },
  DIGIT_6: { keycodeId: 'KC_6' },
  DIGIT_7: { keycodeId: 'KC_7' },
  DIGIT_8: { keycodeId: 'KC_8' },
  DIGIT_9: { keycodeId: 'KC_9' },

  // Punctuation / controls
  MINUS: { keycodeId: 'KC_MINUS' },
  EQUALS: { keycodeId: 'KC_EQUAL' },
  LBRACKET: { keycodeId: 'KC_LBRC' },
  RBRACKET: { keycodeId: 'KC_RBRC' },
  BACKSLASH: { keycodeId: 'KC_BSLS' },
  SEMICOLON: { keycodeId: 'KC_SCLN' },
  QUOTE: { keycodeId: 'KC_QUOT' },
  BACKTICK: { keycodeId: 'KC_GRV' },
  COMMA: { keycodeId: 'KC_COMM' },
  PERIOD: { keycodeId: 'KC_DOT' },
  SLASH: { keycodeId: 'KC_SLSH' },
  SPACE: { keycodeId: 'KC_SPACE' },
  TAB: { keycodeId: 'KC_TAB' },
  ENTER: { keycodeId: 'KC_ENTER' },
  BACKSPACE: { keycodeId: 'KC_BSPC' },
  ESC: { keycodeId: 'KC_ESC' },
  CAPSLOCK: { keycodeId: 'KC_CAPS' },

  // Navigation
  ARROW_UP: { keycodeId: 'KC_UP' },
  ARROW_DOWN: { keycodeId: 'KC_DOWN' },
  ARROW_LEFT: { keycodeId: 'KC_LEFT' },
  ARROW_RIGHT: { keycodeId: 'KC_RIGHT' },
  HOME: { keycodeId: 'KC_HOME' },
  END: { keycodeId: 'KC_END' },

  // Function
  F1: { keycodeId: 'KC_F1' },
  F2: { keycodeId: 'KC_F2' },
  F3: { keycodeId: 'KC_F3' },
  F4: { keycodeId: 'KC_F4' },
  F5: { keycodeId: 'KC_F5' },

  // Numpad
  NUMPAD_0: { keycodeId: 'KC_P0' },
  NUMPAD_1: { keycodeId: 'KC_P1' },
  NUMPAD_2: { keycodeId: 'KC_P2' },
  NUMPAD_PLUS: { keycodeId: 'KC_PPLS' },
  NUMPAD_ENTER: { keycodeId: 'KC_PENT' },

  // Modifiers
  LCTRL: { keycodeId: 'KC_LCTL' },
  LSHIFT: { keycodeId: 'KC_LSFT' },
  LALT: { keycodeId: 'KC_LALT' },
  LGUI: { keycodeId: 'KC_LGUI' },
  RCTRL: { keycodeId: 'KC_RCTL' },
  RSHIFT: { keycodeId: 'KC_RSFT' },
  RALT: { keycodeId: 'KC_RALT' },
  RGUI: { keycodeId: 'KC_RGUI' },

  // Media / volume
  VOLUME_UP: { keycodeId: 'KC_VOLU' },
  VOLUME_DOWN: { keycodeId: 'KC_VOLD' },
  VOLUME_TOGGLE_MUTE: { keycodeId: 'KC_MUTE' },

  // Mouse
  MOUSE_LEFT: { keycodeId: 'KC_BTN1' },
  MOUSE_RIGHT: { keycodeId: 'KC_BTN2' },
  MOUSE_MIDDLE: { keycodeId: 'KC_BTN3' },
  MOUSE_BUTTON_4: { keycodeId: 'KC_BTN4' },
  MOUSE_BUTTON_5: { keycodeId: 'KC_BTN5' },
};

const systemActions: Record<string, MacroPlan> = {
  OPEN_FILE: { op: 'OPEN_FILE', args: { path: '{file}' } },
  OPEN_FOLDER: { op: 'OPEN_FOLDER', args: { path: '{folder}' } },
  OPEN_WEBSITE: { op: 'OPEN_WEBSITE', args: { url: '{url}' } },
  PASTE_TEXT: { op: 'PASTE_TEXT', args: { text: '{text}' } },
  SARCASIFY_TEXT: { op: 'SARCASIFY_TEXT', args: { text: '{text}' } },
};

export class ActionRegistry {
  static resolve(action: string, arg?: string): IntentDefinition | null {
    if (action.startsWith('KC:')) {
      const keycodeId = action.slice(3);
      return { kind: 'keycode', keycodeId };
    }

    const keycode = keycodeActions[action];
    if (keycode) {
      return { kind: 'keycode', keycodeId: keycode.keycodeId, params: keycode.params };
    }
    const system = systemActions[action];
    if (system) {
      const args = { ...(system.args ?? {}) };
      if (arg) {
        if ('path' in args) (args as any)['path'] = arg;
        if ('url' in args) (args as any)['url'] = arg;
        if ('text' in args) (args as any)['text'] = arg;
      }
      return { kind: 'system', plan: { ...system, args } };
    }
    return null;
  }
}
