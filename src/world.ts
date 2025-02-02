import { range, clamp } from "./calc"
import { ItemSelector } from "./itemInfos"
import { Rng } from "./rng"
import *  as WS from './wstorage'

export type wall = number
export const wallX: wall = 1
export const wallY: wall = 2
export const wallZ: wall = 4
export const emptyX: wall = 0x10
export const emptyY: wall = 0x20
export const emptyZ: wall = 0x40

export type walkResult = { animate: boolean, get: boolean, goal: boolean };

export type xyz = { x: number, y: number, z: number }

export type itemLocType = { id: number, p: xyz }

export type GoalInfo = {
  newItems: number[]
}

const numSign = (x: number): number => { return x < 0 ? -1 : (0 < x ? 1 : 0) }

export type CamPoseType = {
  readonly pos: xyz,
  readonly fore: xyz,
  readonly top: xyz
}

const posToIx = (pos: xyz, s: xyz): number | null => {
  if (pos.x < 0 || s.x <= pos.x) { return null }
  if (pos.y < 0 || s.y <= pos.y) { return null }
  if (pos.z < 0 || s.z <= pos.z) { return null }
  return pos.x + s.x * (pos.y + s.y * pos.z)
}

const ixToPos = (ix: number, s: xyz): xyz | null => {
  if (ix < 0) { return null }
  if ((ix | 0) != ix) { return null }
  const x = ix % s.x
  const ixY = (ix - x) / s.x
  const y = ixY % s.y
  const z = (ixY - y) / s.y
  if (s.z <= z) { return null }
  return { x: x, y: y, z: z }
}

const mulScalarXyz = (a: number, b: xyz): xyz => {
  return {
    x: a * b.x,
    y: a * b.y,
    z: a * b.z,
  }
}

const isSameXyz = (a: xyz, b: xyz): boolean => {
  return a.x === b.x && a.y === b.y && a.z === b.z
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

const neiboursXyz = (): xyz[] => {
  return [
    { x: -1, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 0, z: 1 },
  ]
}

const invDir = (d: number): number => {
  return d ^ 1;
}

class Builder {
  size: xyz
  walls: wall[]
  reachables: Set<number>
  rng: Rng
  itemSelector: ItemSelector
  src: WSrc

  constructor(size: xyz, src: WSrc) {
    this.size = size
    this.src = src
    this.walls = [...range(0, size.x * size.y * size.z)].map(() => (0 as wall))
    this.rng = new Rng(Rng.genSeed(src.seed))
    this.reachables = new Set<number>()
    this.itemSelector = new ItemSelector(src.seed * 23 + 29)
  }
  posToIx(pos: xyz): number | null {
    return posToIx(pos, this.size)
  }
  ixToPos(ix: number): xyz | null {
    return ixToPos(ix, this.size)
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
    // console.log({ n: "makeRoom", p0: pos, rs: rs, p1: addXyz(pos, rs) })
    this.eachPos(rs, (d: xyz) => {
      const ix = this.posToIx(addXyz(pos, d))!
      this.reachables.add(ix)
    })
    this.eachPos(addXyz(rs, { x: 1, y: 1, z: 1 }), (d: xyz) => {
      const ix = this.posToIx(addXyz(pos, d))!
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
  makeCuboid(p: xyz, d: xyz) {
    const q = addXyz(p, d)
    const p0 = {
      x: Math.min(p.x, q.x),
      y: Math.min(p.y, q.y),
      z: Math.min(p.z, q.z),
    }
    const s = {
      x: Math.max(p.x, q.x) - p0.x + 1,
      y: Math.max(p.y, q.y) - p0.y + 1,
      z: Math.max(p.z, q.z) - p0.z + 1,
    }
    this.makeRoom(p0, s)
  }
  makePath(a: xyz, b: xyz) {
    let count = 0
    for (let p = a; !isSameXyz(p, b) && count < 1000; count++) {
      const dx = Math.abs(b.x - p.x + this.rng.plusMinusF(0.1))
      const dy = Math.abs(b.y - p.y + this.rng.plusMinusF(0.1))
      const dz = Math.abs(b.z - p.z + this.rng.plusMinusF(0.1))
      const dmax = Math.max(dx, dy, dz)
      const dp = (() => {
        if (dmax === dx) {
          return { x: numSign(b.x - p.x), y: 0, z: 0 }
        } else if (dmax == dy) {
          return { x: 0, y: numSign(b.y - p.y), z: 0 }
        } else {
          return { x: 0, y: 0, z: numSign(b.z - p.z) }
        }
      })()
      // console.log({ b: b, p: p, dp: dp, d: [dx, dy, dz, dmax] })
      this.makeCuboid(p, dp)
      p = addXyz(p, dp)
    }
  }
  randomReachable(): xyz {
    const ix = this.rng.sampleOfIter(this.reachables.keys())
    // console.log({ ix: ix, pos: this.ixToPos(ix) })
    return this.ixToPos(ix)!
  }
  makeRing() {
    const p0 = this.randomReachable()
    const randPos = (): xyz => {
      return {
        x: this.rng.i(this.size.x - 2),
        y: this.rng.i(this.size.y - 2),
        z: this.rng.i(this.size.z - 2)
      }
    }
    const p1 = randPos()
    const p2 = randPos()
    this.makePath(p0, p1)
    this.makePath(p1, p2)
    this.makePath(p2, p0)
  }
  canGoTo(p: xyz): boolean {
    return 0 <= p.x && p.x < this.size.x - 1 &&
      0 <= p.y && p.y < this.size.y - 1 &&
      0 <= p.z && p.z < this.size.z - 1
  }
  dig() {
    // console.log("dig")
    let p0 = this.randomReachable()
    for (const _ of range(0, 4)) {
      if (p0 == null) {
        return
      }
      // console.log({ p0: p0 })
      const d = this.rng.sampleOfIter(neiboursXyz().values())
      const p1 = addXyz(p0, d)
      const ix1 = this.posToIx(p1)
      if (ix1 == null || this.reachables.has(ix1) || !this.canGoTo(p1)) {
        continue
      }
      this.makeCuboid(p0, d)
      p0 = p1
    }
  }
  centerRoom() {
    const c = this.randomReachable()
    const s = {
      x: this.rng.i(4) + 1,
      y: this.rng.i(4) + 1,
      z: this.rng.i(4) + 1
    }
    c.x = clamp(c.x, 0, this.size.x - s.x - 2)
    c.y = clamp(c.y, 0, this.size.y - s.y - 2)
    c.z = clamp(c.z, 0, this.size.z - s.z - 2)
    this.makeRoom(c, s)
  }
  farPos(ax: number): xyz {
    const sepa = (e: number): [number, number] =>
      [Math.round(e / 3), Math.round(e / 3) + 1]
    const [gx, rx] = sepa(this.size.x)
    const [gy, ry] = sepa(this.size.y)
    const [gz, rz] = sepa(this.size.z)
    const x = (): number => this.size.x - gx - this.rng.i(rx)
    const y = (): number => this.size.y - gy - this.rng.i(ry)
    const z = (): number => this.size.z - gz - this.rng.i(rz)
    switch (ax) {
      case 0: return { x: this.size.x - 2, y: y(), z: z() }
      case 1: return { x: x(), y: this.size.y - 2, z: z() }
      case 2: return { x: x(), y: y(), z: this.size.z - 2 }
    }
    throw "logic error"
  }
  build() {
    this.makeRoom({ x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 })
    const rep = (n: number, proc: () => void) => {
      for (const _ of range(0, n)) {
        proc()
      }
    }
    for (const a of range(0, 3)) {
      this.makePath({ x: 0, y: 0, z: 0 }, this.farPos(a))
    }
    const ring = { "T1": 2, "T2": 3, "REAL": 4 }[this.src.t]
    rep(ring, () => this.makeRing())
    this.centerRoom()
    const dig = { "T1": 2, "T2": 4, "REAL": 6 }[this.src.t]
    rep(dig, () => this.dig())
    // this.reachables.forEach(e => {
    //     console.log(this.ixToPos(e))
    // })
  }
  canMove(p: xyz, d: xyz): boolean {
    const w0 = this.walls[this.posToIx(p)!]
    if (d.x < 0) { return 0 === (w0 & wallX) }
    if (d.y < 0) { return 0 === (w0 & wallY) }
    if (d.z < 0) { return 0 === (w0 & wallZ) }
    const p1 = addXyz(p, d)
    if (!this.canGoTo(p1)) { return false }
    const ix1 = this.posToIx(p1)
    if (ix1 == null) { return false }
    const w1 = this.walls[ix1]
    if (0 < d.x) { return 0 === (w1 & wallX) }
    if (0 < d.y) { return 0 === (w1 & wallY) }
    if (0 < d.z) { return 0 === (w1 & wallZ) }
    // unreachable
    throw "logic error"
  }
  farthest(s: xyz[]): xyz {
    const q = [...s]
    const qs = new Set<number>()
    for (const e of q) {
      qs.add(this.posToIx(e)!)
    }
    let r = { x: -1, y: -1, z: -1 }
    for (; ;) {
      const dirs = this.rng.shuffle(neiboursXyz().values())
      const p = q.shift()
      if (p == null) {
        // console.log({ r: r })
        return r
      }
      for (const d of dirs) {
        if (!this.canMove(p, d)) {
          continue
        }
        const p1 = addXyz(p, d)
        const ix = this.posToIx(p1)
        if (ix === null || qs.has(ix)) {
          continue
        }
        // console.log({ p1: p1, qss: qs.size, qs: [...qs.keys()].map((e: number) => this.ixToPos(e)) })
        r = p1
        q.push(p1)
        qs.add(ix)
      }
    }
  }
  items(ty: WType): itemLocType[] {
    const r: itemLocType[] = []
    const ids = ty === "REAL" ? this.rng.shuffle([World.goalID, ...this.itemSelector.getIDs(2)]) : [World.goalID]
    const s = [{ x: 0, y: 0, z: 0 }]
    for (const id of ids) {
      const p = this.farthest(s)
      r.push({ id: id, p: p })
      s.push(p)
    }
    return r
  }
}
const currentStocks = (day: number, write: boolean): WS.CurrentStocks => {
  {
    const r = WS.currentStocks.value
    if (r.day === day) {
      return r
    }
  }
  const r: WS.CurrentStocks = { day: day, stocks: [] }
  if (write) {
    WS.currentStocks.write(r)
  }
  return r
}


const build = (src: WSrc): { walls: wall[], ws: xyz, items: itemLocType[] } => {
  const wsbase = { "T1": 6, "T2": 7, "REAL": 10 }[src.t]
  const b = new Builder({ x: wsbase, y: wsbase, z: wsbase }, src)
  b.build()
  return {
    walls: b.walls, ws: b.size, items: b.items(src.t)
  }
}

export type WType = "T1" | "T2" | "REAL"

export type WSrc = {
  seed: number,
  day: number,
  t: WType,
}

export class World {
  walls: wall[]
  worldSize: xyz
  pos: xyz = { x: 0, y: 0, z: 0 }
  iFore: number = 0
  iTop: number = 2
  static get goalID() { return -1 }
  items: itemLocType[] = []
  onItem: (i: itemLocType) => void = () => { }
  onGoal: (gi: GoalInfo) => void = () => { }
  itemsInBag = new Set<number>()
  itemsInStock = new Set<number>()
  src: WSrc
  walkCount: number

  static initialWalkCount(src: WSrc): number {
    if (src.t !== "REAL") {
      return 0
    }
    const wc = WS.walkCount.value
    if (wc.day === src.day) {
      return wc.c
    }
    return 0
  }

  constructor(seed: WSrc) {
    this.src = seed
    this.walkCount = World.initialWalkCount(this.src)
    const cs = currentStocks(this.src.day, this.src.t == "REAL")
    for (const id of cs.stocks) {
      this.itemsInStock.add(id)
    }
    const { walls, ws, items } = build(seed)
    // this.itemsInStock.add(World.goalID)
    this.walls = walls
    this.worldSize = ws
    this.items = items.filter(e => !this.itemsInStock.has(e.id))
  }

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

  addToBag(id: number) {
    this.itemsInBag.add(id)
  }
  itemStates(): { g: ("stock" | "bag" | "?"), stock: number, bag: number, total: number } {
    const gs = this.itemsInStock.has(World.goalID)
    const gb = this.itemsInBag.has(World.goalID)
    const sc = this.itemsInStock.size - (gs ? 1 : 0)
    const bc = this.itemsInBag.size - (gb ? 1 : 0)
    return {
      g: (gs ? "stock" : (gb ? "bag" : "?")),
      stock: sc,
      bag: bc,
      total: this.src.t == "REAL" ? 2 : 0
    }
  }

  turnY(d: number): walkResult {
    // console.log(JSON.stringify({ d: d, f: this.iFore, t: this.iTop }))
    const t = [
      [2, 5, 3, 4],
      [0, 4, 1, 5],
      [0, 3, 1, 2],
    ][this.iTop >> 1]
    const e = (d < 0) == ((this.iTop & 1) == 0)
    this.iFore = t[(t.indexOf(this.iFore) + (e ? 1 : 3)) % 4]
    // console.log(JSON.stringify({ d: d, f: this.iFore, t: this.iTop }))
    return { animate: true, goal: false, get: false }
  }
  // up/down
  turnZ(d: number): walkResult {
    [this.iFore, this.iTop] =
      (d < 0) ? [invDir(this.iTop), this.iFore] : [this.iTop, invDir(this.iFore)]
    return { animate: true, goal: false, get: false }
  }
  hasTights(): boolean {
    return this.itemsInBag.has(World.goalID) || this.itemsInStock.has(World.goalID)
  }
  get tpos(): xyz | null {
    if (this.hasTights()) { return null }
    for (const i of this.items) {
      if (i.id == World.goalID) {
        return i.p;
      }
    }
    return null
  }
  move(): walkResult {
    const d = dirToXyz(this.iFore)
    const dest = addXyz(this.pos, d)
    const w0 = this.cellAt(this.pos)
    const w1 = this.cellAt(dest)
    const wallExists = (() => {
      const coli = true
      if (coli) {
        const w = [w1, w0][this.iFore & 1]
        const b = 1 << ((this.iFore & 6) / 2)
        return 0 != (w & b);
      } else {
        return false
      }
    })()
    if (wallExists) { return { animate: false, get: false, goal: false } }
    this.incWalkCount()
    this.pos = dest
    const item = this.items.find((i) => isSameXyz(i.p, this.pos) && !this.itemsInBag.has(i.id))
    let goal = false;
    if (item != null) { this.onItem(item) }
    if (isSameXyz(this.pos, { x: 0, y: 0, z: 0 })) {
      if (this.hasTights()) {
        goal = true
        const cs = currentStocks(this.src.day, this.src.t == "REAL")
        const gi: GoalInfo = { newItems: [...this.itemsInBag.keys()] }
        const itemCounts = WS.itemCounts.value
        for (const id of this.itemsInBag.keys()) {
          this.itemsInStock.add(id)
          cs.stocks.push(id)
          itemCounts[id] = (itemCounts[id] || 0) + 1
        }
        if (this.src.t == "REAL") {
          WS.itemCounts.write(itemCounts)
          WS.currentStocks.write(cs)
        }
        this.itemsInBag.clear()
        this.onGoal(gi)
      } else {
        this.onGoal({ newItems: [] })
      }
    }
    return { animate: true, get: item != null, goal: goal }
  }
  incWalkCount() {
    ++this.walkCount;
    if (this.src.t !== "REAL") {
      return
    }
    WS.walkCount.write({ day: this.src.day, c: this.walkCount })
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
