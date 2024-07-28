// copy from https://sbcode.net/threejs/renderer/
import * as T from 'three'
import * as C from '../src/calc'

test("interVec.1", () => {
    const p0 = new T.Vector3(1, 0, 0)
    const p1 = new T.Vector3(0, 1, 0)
    const i = C.interVec(p0, p1, 0.2)
    expect(i.x).toBeCloseTo(Math.cos(Math.PI * 0.1), 0.01)
    expect(i.y).toBeCloseTo(Math.sin(Math.PI * 0.1), 0.01)
    expect(i.z).toBeCloseTo(0, 0.01)
});

test("interVec.2", () => {
    const p0 = new T.Vector3(1, 0, 0)
    const p1 = new T.Vector3(0, 0, -1)
    const i = C.interVec(p0, p1, 0.4)
    expect(i.x).toBeCloseTo(Math.cos(Math.PI * 0.2), 0.01)
    expect(i.y).toBeCloseTo(0, 0.01)
    expect(i.z).toBeCloseTo(-Math.sin(Math.PI * 0.2), 0.01)
});
