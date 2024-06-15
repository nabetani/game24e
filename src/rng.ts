
export class Rng {
  // from  pcg_oneseq_32_xsh_rs_16_random_r at https://github.com/imneme/pcg-c/
  state: number
  constructor(seed: number) {
    this.state = (Rng.step(seed) | 0x80000000) >>> 0;
    for (let i = 0; i < 8; ++i) {
      this.state = Rng.step(this.state);
    }
  }
  static output(n: number): number {
    // inline uint16_t pcg_output_xsh_rs_32_16(uint32_t state)
    // {
    //     return (uint16_t)(((state >> 11u) ^ state) >> ((state >> 30u) + 11u));
    // }
    return ((((n >> 11) ^ n) >>> 0) >> ((n >> 30) + 11)) & 0xffff;
  }
  next16(): number {
    // inline uint16_t pcg_oneseq_32_xsh_rs_16_random_r(struct pcg_state_32* rng)
    // {
    //     uint32_t oldstate = rng->state;
    //     pcg_oneseq_32_step_r(rng);
    //     return pcg_output_xsh_rs_32_16(oldstate);
    // }
    const old = this.state;
    this.state = Rng.step(old);
    return Rng.output(old);
  }
  next(): number {
    return ((this.next16() << 16) >>> 0) + this.next16();
  }
  i(sup: number): number {
    return this.next() % sup
  }
  static step(n: number): number {
    // #define PCG_DEFAULT_MULTIPLIER_32  747796405U
    // #define PCG_DEFAULT_INCREMENT_32   2891336453U
    // inline void pcg_oneseq_32_step_r(struct pcg_state_32* rng)
    // {
    //     rng->state = rng->state * PCG_DEFAULT_MULTIPLIER_32
    //                  + PCG_DEFAULT_INCREMENT_32;
    // }
    const mul = 747796405;
    const inc = 2891336453;
    // rng->state = rng->state * PCG_DEFAULT_MULTIPLIER_32 + PCG_DEFAULT_INCREMENT_32;
    return (((n * mul) >>> 0) + inc) >>> 0;
  }

  plusMinusF(d: number): number {
    const n = this.next() + 1; // 1〜2**32
    const f = n / (0x100000001); // 0〜1 両端含まず
    return (f * 2 - 1) * d;
  }
  sampleOfIter<T>(it: IterableIterator<T>): T {
    const a = [...it]
    const ix = this.i(a.length)
    return a[ix]
  }
  shuffle<T>(it: IterableIterator<T>): T[] {
    const a = [...it]
    let r = []
    while (0 < a.length) {
      const ix = this.i(a.length)
      r.push(a.splice(ix, 1)[0])
    }
    return r
  }
}
