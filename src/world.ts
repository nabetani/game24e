import { range } from "./calc"
import { Rng } from "./rng"


export type wall = number
export const wallX: wall = 1
export const wallY: wall = 2
export const wallZ: wall = 4
export const emptyX: wall = 0x10
export const emptyY: wall = 0x20
export const emptyZ: wall = 0x40

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
const mulScalarXyz = (a: number, b: xyz): xyz => {
    return {
        x: a * b.x,
        y: a * b.y,
        z: a * b.z,
    }
}
const lessThanXyz = (a: xyz, b: xyz): boolean => {
    return a.x < b.x && a.y < b.y && a.z < b.z
}

const addXyz = (a: xyz, b: xyz): xyz => {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z,
    }
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

class Builder {
    size: xyz
    walls: wall[]
    rng: Rng
    constructor(size: xyz, seed: number) {
        this.size = size
        this.walls = [...range(0, size.x * size.y * size.z)].map(() => (0 as wall))
        this.rng = new Rng(seed)
    }
    eachPos(rs: xyz, proc: (d: xyz) => void) {
        for (const x of range(0, rs.x)) {
            for (const y of range(0, rs.y)) {
                for (const z of range(0, rs.z)) {
                    proc({ x: x, y: y, z: z })
                }
            }
        }
    }
    setWallByIx(ix: number, w: wall, make: boolean, clean: boolean) {
        if (make) {
            if (0 == (this.walls[ix] & (w << 4))) {
                this.walls[ix] |= w
            }
        } else if (clean) {
            this.walls[ix] &= ~w
            this.walls[ix] |= (w << 4)
        }
    }
    makeRoom(pos: xyz, rs: xyz) {
        this.eachPos(addXyz(rs, { x: 1, y: 1, z: 1 }), (d: xyz) => {
            const ix = posToIx(addXyz(pos, d), this.size)!
            this.setWallByIx(ix, wallX,
                (d.x == 0 || d.x == rs.x) && d.y != rs.y && d.z != rs.z,
                (0 < d.x && d.x < rs.x) && lessThanXyz(d, rs))
            this.setWallByIx(ix, wallY,
                (d.y == 0 || d.y == rs.y) && d.x != rs.x && d.z != rs.z,
                (0 < d.y && d.y < rs.y) && lessThanXyz(d, rs))
            this.setWallByIx(ix, wallZ,
                (d.z == 0 || d.z == rs.z) && d.y != rs.y && d.x != rs.x,
                (0 < d.z && d.z < rs.z) && lessThanXyz(d, rs))
        })
    }
    build() {
        this.makeRoom({ x: 0, y: 0, z: 0 }, { x: 4, y: 5, z: 6 })
        this.makeRoom({ x: 3, y: 3, z: 3 }, { x: 4, y: 5, z: 6 })
    }
}

const build = (seed: number): { walls: wall[], ws: xyz } => {
    const wsbase = 10
    const b = new Builder({ x: wsbase, y: wsbase, z: wsbase }, 1)
    b.build()
    return { walls: b.walls, ws: b.size }
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
        const f = mulScalarXyz(-0.3, this.fore)
        const p = addXyz(this.pos, f)
        return { pos: p, fore: this.fore, top: this.top }
    }

    turnY(d: number): boolean {
        // console.log(JSON.stringify({ d: d, f: this.iFore, t: this.iTop }))
        const t = [
            [2, 5, 3, 4],
            [0, 4, 1, 5],
            [0, 3, 1, 2],
        ][this.iTop >> 1]
        const e = (d < 0) == ((this.iTop & 1) == 0)
        this.iFore = t[(t.indexOf(this.iFore) + (e ? 1 : 3)) % 4]
        // console.log(JSON.stringify({ d: d, f: this.iFore, t: this.iTop }))
        return true
    }
    // up/down
    turnZ(d: number): boolean {
        [this.iFore, this.iTop] =
            (d < 0) ? [invDir(this.iTop), this.iFore] : [this.iTop, invDir(this.iFore)]
        return true
    }
    move(): boolean {
        const d = dirToXyz(this.iFore)
        const dest = addXyz(this.pos, d)
        const w0 = this.cellAt(this.pos)
        const w1 = this.cellAt(dest)
        const wallExists = (() => {
            const w = [w1, w0][this.iFore & 1]
            const b = 1 << ((this.iFore & 6) / 2)
            return 0 != (w & b);
        })()
        if (wallExists) { return false }
        this.pos = dest
        return true
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