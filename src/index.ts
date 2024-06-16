// copy from https://sbcode.net/threejs/renderer/
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'
import { World } from './world'
import *  as W from './world'
import *  as C from './calc'
import { range } from './calc'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

type DoSomething = { (): boolean };

const rotataCtx = (ctx: CanvasRenderingContext2D, th: number, x: number, y: number) => {
  ctx.translate(x, y);
  ctx.rotate(th)
  ctx.translate(-x, -y)
}

const drawF = (
  f: number, x0: number, y0: number, r0: number, th0: number,
  drawer: (x: number, y: number, r: number, th: number) => void) => {
  if (f == 1) {
    drawer(x0, y0, r0, th0)
  } else {
    const cands = [...[...range(1, f - 1)].map(x => f - x), f]
    for (const i of cands) {
      if (f % i != 0) {
        continue
      }
      const as = Math.asin(Math.PI / i)
      const r = i <= 3 ? r0 / (1.5 + i / 4) : r0 * as / (1 + as) * 0.9
      for (const t of range(0, i)) {
        const th = (t + 0.5 / i) / i * Math.PI * 2
        const x = x0 + (r0 - r) * Math.cos(th + th0)
        const y = y0 + (r0 - r) * Math.sin(th + th0)
        drawF(f / i, x, y, r, th + Math.PI / 2 + th0, drawer)
      }
      return
    }
  }
}

const labToRgb = (l: number, a: number, b: number): string => {
  const xn = 0.95
  const yn = 1
  const zn = 1.089
  const sig = 6 / 29
  const fi = (t: number) => (t < sig ? (3 * sig ** 2 * (t - 4 / 29)) : t ** 3)
  const x = xn * fi((l + 16) / 116 + a / 500)
  const y = yn * fi((l + 16) / 116)
  const z = zn * fi((l + 16) / 116 + b / 500)

  const cs = (x: number) => x < 0.0031308 ? 12.19 * x : (
    1.055 * x ** (1 / 2.4) - 0.055
  )
  const sr = cs(+3.2406 * x - 1.5372 * y - 0.4986 * z)
  const sg = cs(-0.9689 * x + 1.8758 * y + 0.0415 * z)
  const sb = cs(+0.0557 * x - 0.2040 * y + 1.0570 * z)
  const col = (x: number): string => {
    const v0 = Math.round(x * 255)
    const v = v0 < 0 ? 0 : (v0 < 255 ? v0 : 255)
    return `${(v >> 4).toString(16)}${(v & 15).toString(16)}`
  }
  return `#${col(sr)}${col(sg)}${col(sb)}`
}

const drawWall = (ctx: CanvasRenderingContext2D, cw: number, ax: number, f: number) => {
  const col = (l: number, sa: number, co: number): string => {
    const t = co * Math.PI / 180
    const a = sa * Math.sin(t)
    const b = sa * Math.cos(t)
    return labToRgb(l, a, b)
  }
  const baseCol = ctx.createLinearGradient(0, 0, cw, cw);
  baseCol.addColorStop(0, col(80, 50, ax * 120))
  baseCol.addColorStop(1, col(30, 100, ax * 120))
  ctx.fillStyle = baseCol;
  const g = 10
  ctx.fillRect(g, g, cw - g * 2, cw - g * 2)
  const markCol = ctx.createLinearGradient(0, cw, cw, 0);
  const dcol = 90
  markCol.addColorStop(0, col(10, 100, ax * 120 + 180 + dcol))
  markCol.addColorStop(1, col(10, 20, ax * 120 + 180 - dcol))
  ctx.fillStyle = markCol
  ctx.strokeStyle = markCol
  drawF(f + 1, cw / 2, cw / 2, cw * 0.4, Math.PI * 0, (x: number, y: number, r: number, th: number) => {
    switch (ax) {
      case 0:
        {
          ctx.beginPath()
          const r0 = r * 0.5
          ctx.ellipse(x, y, r, r0, th, 0, Math.PI * 2)
          ctx.fill()
        }
        break
      case 1:
        {
          ctx.beginPath()
          const d0 = Math.PI / 5
          const d1 = Math.PI * 2 - d0
          const [r0, r1] = [r * 0.8, r * 0.7]
          ctx.ellipse(x, y, r0, r0, th, d0, d1)
          ctx.ellipse(x, y, r1, r1, th, d1, d0, true)
          ctx.fill()
        }
        break
      case 2:
        {
          ctx.save()
          rotataCtx(ctx, th, x, y)
          ctx.beginPath()
          ctx.lineWidth = r / 10
          const [rx, ry] = [r * 0.8, r * 0.5]
          ctx.roundRect(x - rx, y - ry, rx * 2, ry * 2, r / 5)
          ctx.stroke()
          ctx.restore()
        }
        break
    }
  })
  ctx.strokeStyle = "black"
  ctx.lineWidth = g * 2
  ctx.strokeRect(0, 0, cw, cw)

}

const newCanvas = (cw: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas")
  canvas.setAttribute("width", `${cw}`)
  canvas.setAttribute("height", `${cw}`)
  document.getElementsByTagName("body")[0].appendChild(canvas)
  return canvas
}

class Main {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  tloader = new THREE.TextureLoader()
  stats = new Stats();
  world: World
  queue: DoSomething[] = []
  animates: (() => void)[] = []
  touchStart: { x: number, y: number } | null = null
  touchMove: { x: number, y: number } | null = null
  flickTh = 40
  clock = new THREE.Clock(true)
  items: Map<number, () => void> = new Map<number, () => void>()
  adaptToWindowSize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.flickTh = w / 7
  }
  constructor() {
    this.adaptToWindowSize()
    this.world = new World(1);
    document.body.appendChild(this.renderer.domElement)
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    });
    this.renderer.shadowMap.enabled = true;
    this.setInputEvents();
    this.walk(() => false);
    this.initMap();
    this.initLight();
    this.clock.start()
    this.stats.showPanel(0);
    this.world.onItem = (i: W.itemLocType) => { this.onItem(i) }
    document.getElementById("stats")!.appendChild(this.stats.dom);
  }
  onItem(i: W.itemLocType) {
    const proc = this.items.get(i.id)
    if (proc != null) { proc() }
  }
  addPointlight(pos: W.xyz, col: number, intensity: number): THREE.PointLight {
    const pol = new THREE.PointLight(col, intensity, 0)
    pol.position.copy(pos)
    pol.castShadow = true
    this.scene.add(pol)
    return pol
  }

  initLight() {
    this.scene.add(new THREE.AmbientLight(0x88ffff, 0.7))
  }
  walk(proc: () => boolean) {
    if (1 < this.queue.length) {
      return
    }
    const cp0 = structuredClone(this.world.camPose)
    const animate = proc()
    const cp1 = structuredClone(this.world.camPose)
    let now: null | number = null
    const t = animate ? 0.3 : 1 / 1000
    this.queue.push(() => {
      if (now == null) {
        now = this.clock.getElapsedTime()
      }
      const r0 = Math.min(1, (this.clock.getElapsedTime() - now) / t)
      const r = 1 - (1 - r0) ** 2
      const pos = C.interVecL(cp0.pos, cp1.pos, r)
      console.log(JSON.stringify({ rt: ((this.clock.elapsedTime - now) / t), r: r, pos: pos, cp: [cp0.pos, cp1.pos] }))
      this.camera.position.set(pos.x, pos.y, pos.z)
      this.camera.up = C.interVec(cp0.top, cp1.top, r)
      this.camera.lookAt(C.interVec(cp0.fore, cp1.fore, r).multiplyScalar(1e10))
      this.camera.updateMatrix()
      return r0 == 1
    })
  }
  setInputEvents() {
    const p = window;
    const move = () => {
      this.walk(() => this.world.move())
    };
    const turnY = (x: number) => {
      this.walk(() => this.world.turnY(x))
    };
    const turnZ = (x: number) => {
      this.walk(() => this.world.turnZ(x))
    };
    p.addEventListener('touchstart', (e) => {
      this.touchStart = { x: e.touches[0].pageX, y: e.touches[0].pageY };
      this.touchMove = null
    })
    p.addEventListener('touchmove', (e) => {
      this.touchMove = { x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY };
    })
    p.addEventListener('touchend', (e) => {
      if (this.touchStart == null) { return }
      if (this.touchMove == null) {
        move()
      } else {
        const dx = this.touchMove.x - this.touchStart.x
        const dy = this.touchMove.y - this.touchStart.y
        const dist = Math.sqrt(dx ** 2 + dy ** 2)
        console.log({
          dist: dist, dx: dy, dy: dy,
          move: this.touchMove,
          st: this.touchStart
        })
        const dir = Math.floor(Math.atan2(dy, dx) * 2 / Math.PI + 4.5) % 4
        switch (dir) {
          case 0: turnY(1); break
          case 1: turnZ(1); break
          case 2: turnY(-1); break
          case 3: turnZ(-1); break
        }
      }
      e.preventDefault();
      this.touchStart = null
    })

    p.addEventListener("keydown", (event) => {
      if (event.code == "ArrowRight") {
        turnY(-1);
        event.preventDefault();
      } else if (event.code === "ArrowLeft") {
        turnY(1);
        event.preventDefault();
      } else if (event.code === "ArrowUp") {
        turnZ(1);
        event.preventDefault();
      } else if (event.code === "ArrowDown") {
        turnZ(-1);
        event.preventDefault();
      } else if (event.code === "Space") {
        move();
        event.preventDefault();
      } else {
        console.log({ name: "keydown", event: event })
      }
    })
  }
  addStartObj(item: W.itemLocType) {
    const lp = 0.1
    this.addPointlight({ x: -lp, y: -lp, z: -lp }, 0xffffff, 2)
    const ma = new THREE.MeshStandardMaterial({
      color: 0x002844
    })
    const size = 1 / 20
    const ge = new THREE.TorusGeometry(size, size / 3, 8, 7)
    const me = new THREE.Mesh(ge, ma)
    me.castShadow = me.receiveShadow = true
    this.animates.push(() => {
      const t = this.clock.getElapsedTime() * 2
      const ta = t / 3
      const tb = t / 17 + 1.5
      const si = Math.sin(tb)
      const co = Math.cos(tb)
      const v0 = new THREE.Vector3(si * Math.sin(ta), si * Math.cos(ta), co)
      me.setRotationFromAxisAngle(v0, Math.sin(t / 7) * 10)
    })

    me.position.set(item.p.x, item.p.y, item.p.z)
    this.scene.add(me)
  }
  addItemLights(item: W.itemLocType, col: number): THREE.PointLight[] {
    const r: THREE.PointLight[] = []
    const add = (x: number, y: number, z: number) => {
      const w = 0.15
      const p = {
        x: item.p.x + x * w,
        y: item.p.y + y * w,
        z: item.p.z + z * w,
      }
      r.push(this.addPointlight(p, col, 1 / 3))
    }
    add(1, 1, 1)
    add(-1, -1, 1)
    add(1, -1, -1)
    add(-1, 1, -1)
    return r
  }

  addGoalObj(item: W.itemLocType) {
    const lights = this.addItemLights(item, 0xffff88)
    const ma = new THREE.MeshStandardMaterial({
      color: 0x002844
    })
    const scale = 0.7
    const ra = 0.05 * scale
    const le = 0.22 * scale
    const wi = 0.18 * scale
    const ge = BufferGeometryUtils.mergeGeometries([
      new THREE.CapsuleGeometry(ra, le, 10).translate(wi / 2, 0, 0),
      new THREE.CapsuleGeometry(ra, le, 10).translate(-wi / 2, 0, 0),
      new THREE.CapsuleGeometry(ra, wi, 10).translate(-le / 2, 0, 0).rotateZ(Math.PI / 2)
    ], true);
    const me = new THREE.Mesh(ge, ma)
    me.castShadow = me.receiveShadow = true
    this.animates.push(() => {
      const t = this.clock.getElapsedTime() * 0.1
      const [tx, ty, tz] = [t * 2 ** 1, t * 2 ** 1.333, t * 2 * 1.666].map((e) => Math.sin(e) * Math.PI)
      me.setRotationFromEuler(new THREE.Euler(tx, ty, tz))
    })
    me.position.set(item.p.x, item.p.y, item.p.z)
    this.scene.add(me)

  }

  addItemObj(item: W.itemLocType) {
    const lights = this.addItemLights(item, 0x8888ff)
    const ma = new THREE.MeshStandardMaterial({
      color: 0xffee88
    })
    const ra = 0.2
    const ge = BufferGeometryUtils.mergeGeometries([
      new THREE.TetrahedronGeometry(ra),
      new THREE.TetrahedronGeometry(ra).rotateX(Math.PI / 2),
    ], true);
    const me = new THREE.Mesh(ge, ma)
    me.castShadow = me.receiveShadow = true
    this.animates.push(() => {
      const t = this.clock.getElapsedTime() * 0.1
      const [tx, ty, tz] = [t * 2 ** 1, t * 2 ** 1.333, t * 2 * 1.666].map((e) => Math.sin(e) * Math.PI)
      me.setRotationFromEuler(new THREE.Euler(tx, ty, tz))
    })

    me.position.set(item.p.x, item.p.y, item.p.z)
    this.scene.add(me)
    this.items.set(item.id, () => {
      this.scene.remove(me)
      lights.forEach((e) => this.scene.remove(e))
    })
  }

  placeObjects() {
    const items = [...this.world.items]
    items.push({ id: -1, p: this.world.pos })
    for (const item of items) {
      switch (item.id) {
        case -1:
          this.addStartObj(item)
          break
        case 2:
          this.addGoalObj(item)
          break
        default:
          this.addItemObj(item)
          break
      }
    }
  }

  initMap() {
    const Mate = THREE.MeshLambertMaterial
    const size = this.world.size
    const th = 0.05
    this.placeObjects()
    const geoms: Map<number, THREE.BoxGeometry[]> = new Map<number, THREE.BoxGeometry[]>()
    for (const ax of [0, 1, 2]) {
      const g = [
        new THREE.BoxGeometry(th, 1, 1),
        new THREE.BoxGeometry(1, th, 1),
        new THREE.BoxGeometry(1, 1, th)][ax]
      for (const x of range(0, size.x)) {
        for (const y of range(0, size.y)) {
          for (const z of range(0, size.z)) {
            const wall = this.world.cellAt({ x: x, y: y, z: z })
            const d = (a: number) => (a == ax ? -0.5 : 0)
            if ((wall & (1 << ax)) != 0) {
              const cg = g.clone().translate(x + d(0), y + d(1), z + d(2))
              const key = ax * 1024 + [x, y, z][ax]
              const v = geoms.get(key)
              if (v === undefined) {
                geoms.set(key, [cg])
              } else {
                v.push(cg)
              }
            }
          }
        }
      }
    }
    geoms.forEach((geomArray, k) => {
      const cw = 512
      const canvas = newCanvas(cw)
      const ctx = canvas.getContext("2d")!
      const ax = k >> 10
      const f = k & 1023
      console.log({ ax: ax, f: f })
      drawWall(ctx, cw, ax, f)
      const mate = new Mate({
        map: new THREE.CanvasTexture(canvas),
      })
      const geometry = BufferGeometryUtils.mergeGeometries(geomArray, true);
      const me = new THREE.Mesh(geometry, mate)
      me.receiveShadow = true;
      me.castShadow = true;
      this.scene.add(me)
    });
  }
  animate() {
    this.stats.begin();
    if (0 < this.queue.length) {
      if (this.queue[0]()) {
        this.queue.shift();
      }
    }
    for (const p of this.animates) {
      p()
    }
    this.renderer.render(this.scene, this.camera)
    const s = () => this.animate();
    requestAnimationFrame(s);
    this.stats.end();
    // console.log(`renderer.info: ${JSON.stringify(this.renderer.info)}`)
  }
}

(new Main()).animate();
