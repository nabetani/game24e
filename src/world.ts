import { range } from "./calc"
import { Rng } from "./rng"


export type wall = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
export const wallX: wall = 1
export const wallY: wall = 2
export const wallZ: wall = 4
export type xyz = { x: number, y: number, z: number }
export type CamPoseType = {
    readonly pos: xyz,
    readonly fore: xyz,
    readonly top: xyz
}

const posToIx = (pos: xyz, s: xyz): number | null => {
    if (pos.x < 0 && s.x <= pos.x) { return null }
    if (pos.y < 0 && s.y <= pos.y) { return null }
    if (pos.z < 0 && s.z <= pos.z) { return null }
    return pos.x + s.x * (pos.y + s.y * pos.z)
}
const dirToXyz = (d: number): xyz => {
    return {
        x: [1, -1, 0, 0, 0, 0][d],
        y: [0, 0, 1, -1, 0, 0][d],
        z: [0, 0, 0, 0, 1, -1][d],
    }
}
const invDir = (d: number): number => {
    return d ^ 1;
}
const progress = (p: xyz, d: number): xyz => {
    const dp = dirToXyz(d)
    return {
        x: p.x + dp.x,
        y: p.y + dp.y,
        z: p.z + dp.z,
    }
}


const build = (seed: number): { walls: wall[], ws: xyz } => {
    const ws = { x: 4, y: 9, z: 20 }
    const len = 20
    const walls: wall[] = [...range(0, ws.x * ws.y * ws.z)].map(() => (7 as wall))
    const rng: Rng = new Rng(seed)
    const inWorld = (p: xyz): boolean => {
        return (0 <= p.x && p.x + 1 < ws.x &&
            0 <= p.y && p.y + 1 < ws.y &&
            0 <= p.z && p.z + 1 < ws.z)
    }
    for (const i of range(0, 6)) {
        let dir = i % 6
        let pos = { x: 0, y: 0, z: 0 }
        for (const _ of range(0, len)) {
            const npos = ((): xyz | null => {
                for (const _ of range(0, 6)) {
                    const npos = progress(pos, dir)
                    if (inWorld(npos)) { return npos }
                    dir = rng.i(6)
                }
                return null
            })()
            if (npos == null) {
                break
            }
            const dp = dirToXyz(dir)
            if (dp.x < 0) {
                walls[posToIx(pos, ws)!] &= ~wallX
            } else if (0 < dp.x) {
                walls[posToIx(npos, ws)!] &= ~wallX
            } else if (dp.y < 0) {
                walls[posToIx(pos, ws)!] &= ~wallY
            } else if (0 < dp.y) {
                walls[posToIx(npos, ws)!] &= ~wallY
            } else if (dp.z < 0) {
                walls[posToIx(pos, ws)!] &= ~wallZ
            } else if (0 < dp.z) {
                walls[posToIx(npos, ws)!] &= ~wallZ
            }
            pos = npos
            if (rng.i(3) == 0) {
                dir = rng.i(6)
            }
        }
    }
    return { walls: walls, ws: ws }
}


export class World {
    walls: wall[]
    worldSize: xyz
    pos: xyz = { x: 0, y: 0, z: 0 }
    iFore: number = 0
    iTop: number = 2
    get fore(): xyz {
        return dirToXyz(this.iFore)
    }
    get top(): xyz {
        return dirToXyz(this.iTop)
    }
    get camPose(): CamPoseType {
        return { pos: this.pos, fore: this.fore, top: this.top }
    }

    turnY(d: number) {
        // console.log(JSON.stringify({ d: d, f: this.iFore, t: this.iTop }))
        const t = [
            [2, 5, 3, 4],
            [0, 4, 1, 5],
            [0, 3, 1, 2],
        ][this.iTop >> 1]
        const e = (d < 0) == ((this.iTop & 1) == 0)
        this.iFore = t[(t.indexOf(this.iFore) + (e ? 1 : 3)) % 4]
        // console.log(JSON.stringify({ d: d, f: this.iFore, t: this.iTop }))
    }
    // up/down
    turnZ(d: number) {
        [this.iFore, this.iTop] =
            (d < 0) ? [invDir(this.iTop), this.iFore] : [this.iTop, invDir(this.iFore)]
    }
    move() {
        const d = dirToXyz(this.iFore)
        this.pos.x += d.x
        this.pos.y += d.y
        this.pos.z += d.z
    }
    constructor(seed: number) {
        const { walls, ws } = build(seed)
        this.walls = walls
        this.worldSize = ws
    }
    posToIx(pos: xyz): number | null {
        return posToIx(pos, this.size)
    }
    get size(): xyz {
        return this.worldSize
    }
    cellAt(pos: xyz): wall {
        const ix = this.posToIx(pos)
        if (ix === null) { return 0 }
        return this.walls[ix];
    }
}