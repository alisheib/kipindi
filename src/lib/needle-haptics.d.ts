// Ambient types for the vendored Needle haptics module (`needle-haptics.js`).
// VENDORED — do not edit the .js. This only describes its surface so imports
// typecheck under `allowJs: false`.

export function haptic(name: string): boolean;
export function hapticImpact(speed: number): boolean;
export function hapticDetent(strength: number, quarters: number): boolean;
export function setMuted(v: boolean): void;
export function getMuted(): boolean;
export function hapticsAvailable(): boolean;

declare const _default: {
  haptic: typeof haptic;
  hapticImpact: typeof hapticImpact;
  hapticDetent: typeof hapticDetent;
  setMuted: typeof setMuted;
  getMuted: typeof getMuted;
  hapticsAvailable: typeof hapticsAvailable;
};
export default _default;
