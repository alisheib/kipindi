// Ambient types for the vendored Needle physics engine (`needle-physics.js`).
// The .js is a VENDORED library — do not edit it. This file only describes its
// public surface so imports typecheck under `allowJs: false`. If the engine and
// this file ever disagree, the engine wins (per 09-needle/CLAUDE-CODE-BRIEF.md).

export interface NeedleInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface NeedleBounds {
  w: number;
  h: number;
  insets?: NeedleInsets;
}

export interface NeedleImpact {
  speed: number;
  nx: number;
  ny: number;
  x: number;
  y: number;
}

export interface NeedleBest {
  turns: number;
  bounces: number;
  spinMs: number;
  cleanPasses: number;
}

export interface NeedleInteraction {
  turns: number;
  bounces: number;
  spinSeconds: number;
  presence: number;
  record: string | null;
  cleanPass: boolean;
}

export interface NeedleCatch {
  w: number;
  rpm: number;
}

export interface NeedleRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NeedleSample {
  x: number;
  y: number;
  a: number;
  t: number;
}

export interface NeedleOptions {
  size?: number;
  bounds: () => NeedleBounds;
  onImpact?: (i: NeedleImpact) => void;
  onCross?: () => void;
  onPark?: (edge: string) => void;
  onSleep?: () => void;
  onRecord?: (kind: string, best: NeedleBest) => void;
  onTrue?: () => void;
  onCatch?: (info: NeedleCatch) => void;
  onDetent?: (strength: number, quarters: number) => void;
  onInteraction?: (d: NeedleInteraction) => void;
  obstacles?: (() => NeedleRect[]) | null;
}

export const CONST: Record<string, number>;

export class NeedleBody {
  constructor(o: NeedleOptions);

  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  w: number;
  held: string | null;
  settling: boolean;
  parking: boolean;
  parked: boolean;
  edge: string;
  target: { x: number; y: number } | null;
  contact: number;
  acc: number;
  stillFor: number;
  calm: number;
  trueLock: number;
  presence: number;
  autoPark: boolean;
  best: NeedleBest;
  gesture: string | null;

  readonly radius: number;
  readonly cx: number;
  readonly cy: number;
  readonly rpm: number;
  readonly speed: number;
  readonly moving: boolean;
  readonly awake: boolean;

  limits(): { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number; i: NeedleInsets };
  setSize(next: number): boolean;
  setSession(minutes: number): boolean;
  acknowledge(): boolean;
  nearestEdge(): string;
  parkTo(edge?: string): void;
  wake(force?: boolean): boolean;
  unpark(): void;
  snapPark(edge?: string): void;
  reclamp(): void;
  advance(frameDt: number): void;
  grabKind(px: number, py: number): "move" | "spin";
  hold(kind: string): boolean;
  dragBy(dx: number, dy: number): void;
  turnTo(px: number, py: number, lastAngle: number): number;
  release(samples: NeedleSample[], kind: string | null): void;
  flick(strength?: number): void;
  padPx(): number;
}

export default NeedleBody;
