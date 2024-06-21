import { ItemSelector } from "./itemInfos"
import { range } from "./calc"

test("ItemSelector.rarity", () => {
    const f = ItemSelector.rarity
    expect(f(0)).toBe(1)
    expect(f(1)).toBe(5)
    const m = new Map<number, number>()
    const n = 10000
    for (const i of range(0, n + 1)) {
        const r = f(i / n)
        m.set(r, (m.get(r) ?? 0) + 1)
    }
    console.log(m)
    for (const i of range(1, 5)) {
        const ratio = m.get(i)! / m.get(i + 1)!
        expect(ratio).toBeCloseTo(1.7)
    }
    expect(Math.max(...m.keys())).toBe(5)
    expect(Math.min(...m.keys())).toBe(1)
})
