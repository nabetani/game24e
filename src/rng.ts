
const rotl = (x: number, k: number): number => {
  return ((x << k) | (x >>> (32 - k))) >>> 0
}

export type seedType = [number, number, number, number]

export class Rng {
  static genSeed(s: number): seedType {
    const f = (x: number): number => (rotl(x * 23 + 19, 17) * 31) >>> 0 // nonsense calc
    const s0 = f(s)
    const s1 = f(s0)
    const s2 = f(s1)
    const s3 = f(s2)
    return [s0, s1, s2, s3]
  }

  // using algorithm in https://prng.di.unimi.it/xoshiro128plusplus.c
  s: seedType
  constructor(seed0: seedType) {
    this.s = [...seed0]
    this.s[2] |= 1 // avoid all-zero
    for (let i = 0; i < 8; ++i) {
      this.next()
    }
  }
  next(): number {
    const result = rotl(this.s[0] + this.s[3], 7) + this.s[0];
    const t = this.s[1] << 9;
    this.s[2] ^= this.s[0];
    this.s[3] ^= this.s[1];
    this.s[1] ^= this.s[2];
    this.s[0] ^= this.s[3];
    this.s[2] ^= t;
    this.s[3] = rotl(this.s[3], 11);
    return result >>> 0;
  }
  i(sup: number): number {
    return this.next() % sup
  }
  plusMinusF(d: number): number {
    const n = this.next() + 1; // 1〜2**32
    const f = n / (0x100000001); // 0〜1 両端含まず
    return (f * 2 - 1) * d;
  }
  f(sup: number): number {
    const n = this.next() // 0〜2**32-1
    const f = n / (2 ** 32) // 0〜1（上端含まず）
    return f * sup
  }
  sampleOfIter<T>(it: IterableIterator<T>): T {
    const a = [...it]
    const ix = this.i(a.length)
    return a[ix]
  }
  shuffle<T>(it: IterableIterator<T>): T[] {
    const a = [...it]
    const r = []
    while (0 < a.length) {
      const ix = this.i(a.length)
      r.push(a.splice(ix, 1)[0])
    }
    return r
  }
}
