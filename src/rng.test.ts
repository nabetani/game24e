import { Rng } from "./rng"

test("rng", () => {
  const rng = new Rng([1, 2, 3, 4])
  expect(rng.next()).toBe(0x1d896e9b)
});
