// copy from https://sbcode.net/threejs/renderer/
import * as T from 'three'
import Stats from 'three/addons/libs/stats.module.js'
import *  as W from '../src/world'

const newQA = (x: number, y: number, z: number, angle: number): T.Quaternion => {
    const d = 1 / ((x ** 2 + y ** 2 + z ** 2) ** 0.5)
    return new T.Quaternion().setFromAxisAngle({ x: x * d, y: y * d, z: z * d }, angle * Math.PI / 180)
}


const camSetRotFromQ = (cam: T.Camera, q: T.Quaternion) => {
    cam.setRotationFromEuler(new T.Euler().setFromQuaternion(q))
}

const camWorldDir = (cam: T.Camera): T.Vector3 => {
    const { x, y, z } = cam.getWorldDirection(new T.Vector3())
    const n = 1000
    const r = (i: number): number => 0 + Math.round(i * n) / n
    return new T.Vector3(r(x), r(y), r(z))
}

test("simpleQ", () => {
    const q = newQA(1, 0, 0, 0).multiply(newQA(0, 1, 0, -90))
    console.log(`q:${q.toJSON()}`)
    const cam = new T.PerspectiveCamera()
    camSetRotFromQ(cam, q)
    const o = camWorldDir(cam)
    expect(o.toArray()).toStrictEqual([1, 0, 0])
});
