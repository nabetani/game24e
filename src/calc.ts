import * as T from 'three'

export const sincos = (a: number, b: number | null = null): { sin: number, cos: number } => {
  const t = b === null ? a : (Math.PI * 2 * a / b)
  return { sin: Math.sin(t), cos: Math.cos(t) }
}

export function* range(start: number, end: number) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}

export const clamp = (v: number, low: number, high: number): number => {
  const lo = Math.min(low, high)
  const hi = Math.max(low, high)
  if (v < lo) {
    return lo
  }
  if (hi < v) { return hi }
  return v
}

export const interVec = (a0: T.Vector3Like, b0: T.Vector3Like, r: number): T.Vector3 => {
  const a = new T.Vector3(a0.x, a0.y, a0.z)
  const b = new T.Vector3(b0.x, b0.y, b0.z)
  const ang = a.angleTo(b)
  if (Math.abs(ang) < 1e-5) {
    const r0 = a.clone()
    const len = (a.length() * (1 - r) + b.length() * r)
    return r0.setLength(len)
  } else {
    const c = a.clone().cross(b)
    const r0 = a.clone().applyQuaternion(new T.Quaternion().setFromAxisAngle(c, ang * r))
    const len = (a.length() * (1 - r) + b.length() * r)
    return r0.setLength(len)
  }
}

export const interVecL = (a: T.Vector3Like, b: T.Vector3Like, r: number): T.Vector3 => {
  return new T.Vector3(
    a.x * (1 - r) + b.x * r,
    a.y * (1 - r) + b.y * r,
    a.z * (1 - r) + b.z * r)
}
