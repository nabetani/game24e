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

