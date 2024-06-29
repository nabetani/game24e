// copy from https://sbcode.net/threejs/renderer/
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'
import { World } from './world'
import *  as W from './world'
import *  as C from './calc'
import { range } from './calc'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { ItemSelector, itemInfo } from './itemInfos'

type DoSomething = { (): boolean };

const domItem = (tag: string, text: null | string = null): HTMLElement => {
  const o = document.createElement(tag)
  if (text != null) {
    o.textContent = text
  }
  return o
}

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
  clock = new THREE.Clock(true)
  items: Map<number, () => void> = new Map<number, () => void>()
  seed: number
  simpleMsg = document.getElementById("msg")!
  domMsg = document.getElementById("domMsg")!
  simpleMsgT = 0

  adaptToWindowSize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(2);
  }
  constructor(seed: number, day: number) {
    this.seed = seed
    this.adaptToWindowSize()
    this.world = new World(this.seed, day);
    document.body.appendChild(this.renderer.domElement)
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    });
    this.renderer.shadowMap.enabled = false;
    this.setInputEvents();
    this.walk(() => false);
    this.initMap();
    this.initLight();
    this.clock.start()
    this.stats.showPanel(0);
    this.world.onItem = (i: W.itemLocType) => { this.onItem(i) }
    this.world.onGoal = (gi: W.GoalInfo) => this.onGoal(gi)
    document.getElementById("stats")!.appendChild(this.stats.dom);
    this.updateItemState();
  }
  tGoal(gi: W.GoalInfo) {
    const msg = domItem("div", gi.newItems.includes(World.goalID) ? "タイツとともに帰還成功!" : "生還!");
    msg.appendChild(domItem("br"))
    const ul = domItem("ul")
    let lineCount = 0
    for (const id of gi.newItems) {
      if (id == World.goalID) { continue }
      ++lineCount
      const i = itemInfo(id)
      const stars = "★".repeat(i.rarity)
      const li = domItem("li", i.uname)
      const dl = domItem("dl")
      dl.appendChild(domItem("dt", "正体"))
      dl.appendChild(domItem("dd", i.name))
      dl.appendChild(domItem("dt", "希少性"))
      dl.appendChild(domItem("dd", stars))
      li.appendChild(dl)
      ul.appendChild(li)
    }
    if (0 < lineCount) {
      msg.appendChild(domItem("div", "入手アイテムを調べてもらった"))
      msg.appendChild(ul)
    }
    this.showDom(msg)
  }
  onGoal(gi: W.GoalInfo) {
    this.updateItemState()
    if (this.world.hasTights()) {
      this.tGoal(gi)
    } else {
      this.showMsg("タイツがないので帰れない...")
    }
  }
  showDom(msg: HTMLElement) {
    while (this.domMsg.firstChild) {
      this.domMsg.removeChild(this.domMsg.firstChild);
    }
    this.domMsg.appendChild(msg)

    const b = domItem("button", "OK")
    const proc = () => this.domMsg.style.display = "none";
    b.onclick = proc
    b.ontouchend = proc
    this.domMsg.appendChild(b)
    this.domMsg.style.display = "block";
    this.domMsg.style.opacity = "1"
  }
  showMsg(msg: string) {
    this.simpleMsg.style.display = "block";
    this.simpleMsg.innerText = msg
    this.simpleMsgT = this.clock.getElapsedTime() + 3
  }
  onItem(i: W.itemLocType) {
    const proc = this.items.get(i.id)
    if (proc != null) { proc() }
  }
  initLight() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.5))
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
      // console.log(JSON.stringify({ rt: ((this.clock.elapsedTime - now) / t), r: r, pos: pos, cp: [cp0.pos, cp1.pos] }))
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

  startObjMaterial(): THREE.Material {
    const envMap = this.tloader.load("assets/env0.webp")
    const tMap = this.tloader.load("assets/env0.webp")
    envMap.mapping = THREE.EquirectangularReflectionMapping
    envMap.magFilter = THREE.LinearFilter
    envMap.minFilter = THREE.LinearMipMapLinearFilter
    const ma = new THREE.MeshBasicMaterial({
      envMap: envMap,
      map: tMap,
      combine: THREE.MultiplyOperation,
    })
    return ma
  }


  addStartObj(item: W.itemLocType) {
    const ma = this.startObjMaterial()
    const size = 1 / 20
    const ge = new THREE.TorusGeometry(size, size / 3, 8, 7)
    const me = new THREE.Mesh(ge, ma)
    me.castShadow = me.receiveShadow = false
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

  addGoalObj(item: W.itemLocType) {
    const ma = this.itemMaterial()
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
    me.castShadow = me.receiveShadow = false
    this.addStdObj(item, me)
  }

  itemMaterial(): THREE.Material {
    const envMap = this.tloader.load("assets/env0.webp")
    envMap.mapping = THREE.EquirectangularReflectionMapping
    envMap.magFilter = THREE.LinearFilter
    envMap.minFilter = THREE.LinearMipMapLinearFilter
    const ma = new THREE.MeshPhongMaterial({
      color: 0x0000ff,
      envMap: envMap,
    })
    ma.combine = THREE.MixOperation
    return ma
  }

  addStdObj(item: W.itemLocType, me: THREE.Mesh) {
    let got: null | number = null
    this.animates.push(() => {
      const [s, t] = ((): [number | null, number] => {
        const tick = this.clock.getElapsedTime()
        if (got == null) {
          const t = tick * 0.1
          return [null, t]
        } else {
          const dt = tick - got
          return [Math.max(0, 1 - dt) ** 0.7, tick * 0.1 + dt ** 3]
        }
      })()
      const [tx, ty, tz] = [t * 2 ** 1, t * 2 ** 1.333, t * 2 * 1.666].map((e) => Math.sin(e) * Math.PI)
      me.setRotationFromEuler(new THREE.Euler(tx, ty, tz))
      if (s != null) {
        me.scale.set(s, s, s)
      }
    })

    me.position.set(item.p.x, item.p.y, item.p.z)
    this.scene.add(me)
    this.items.set(item.id, () => {
      if (got == null) {
        // console.log({ item: item })
        this.world.addToBag(item.id)
        const name = item.id == World.goalID ? "魔法のタイツ" : itemInfo(item.id).uname
        this.showMsg(`${name} を手に入れた。`)
        console.log({ getItem: item.id })
        got = this.clock.getElapsedTime()
        this.items.delete(item.id)
        this.updateItemState()
      }
    })
  }
  updateItemState() {
    const s = this.world.itemStates()
    const g = document.getElementById("tsign")!
    const i = [document.getElementById("isign0")!, document.getElementById("isign1")!]
    g.style.opacity = `${s.g == null ? 0 : 1}`
    if (s.g == "stock") {
      g.style.borderStyle = "solid"
    } else if (s.g == "bag") {
      g.style.borderStyle = "dotted"
    }
    for (let ix = 0; ix < s.stock; ix++) {
      const e = i.shift()
      if (e) {
        e.style.opacity = "1"
        e.style.borderStyle = "solid"
      }
    }
    for (let ix = 0; ix < s.bag; ix++) {
      const e = i.shift()
      if (e) {
        e.style.opacity = "1"
        e.style.borderStyle = "dotted"
      }
    }
  }

  addItemObj(item: W.itemLocType) {
    const ma = this.itemMaterial()
    const ra = 0.2
    const ge = BufferGeometryUtils.mergeGeometries([
      // new THREE.DodecahedronGeometry(ra,3),
      new THREE.TetrahedronGeometry(ra),
      new THREE.TetrahedronGeometry(ra).rotateX(Math.PI / 2),
    ], true);
    const me = new THREE.Mesh(ge, ma)
    me.castShadow = me.receiveShadow = false
    this.addStdObj(item, me)
  }

  placeObjects() {
    const items = [...this.world.items]
    this.addStartObj({ id: -1, p: this.world.pos })
    for (const item of items) {
      switch (item.id) {
        case World.goalID:
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
    const th = 0.1
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
      drawWall(ctx, cw, ax, f)
      const mate = new Mate({
        map: new THREE.CanvasTexture(canvas),
      })
      const geometry = BufferGeometryUtils.mergeGeometries(geomArray, true);
      const me = new THREE.Mesh(geometry, mate)
      me.receiveShadow = false;
      me.castShadow = false;
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
    {
      const o = document.getElementById("msg")!
      const opa = parseFloat(o.style.opacity);
      if (0 < opa) {
        o.style.opacity = `${Math.max(0, opa - 0.01)}`;
      }
    }
    {
      const t = this.simpleMsgT - this.clock.getElapsedTime()
      const opa = C.clamp(t, 0, 1);
      this.simpleMsg.style.opacity = `${opa}`
      if (opa === 0) {
        this.simpleMsg.style.display = "none";
      }
    }
    // console.log(`renderer.info: ${JSON.stringify(this.renderer.info)}`)
  }
}

const onReize = () => {
  const titleImg = document.getElementById("title-img")!
  const html = document.getElementsByTagName("html")[0]
  html.style.setProperty("--sizeUnit", titleImg.clientHeight * 0.01 + "px")
  const start = document.getElementById("start")
  if (start != null) {
    start.style.display = "block"
  }
  const bottom = document.getElementById("bottom")
  if (bottom != null) {
    bottom.style.display = "block"
    bottom.style.minWidth = titleImg.clientWidth + "px"
    bottom.style.width = titleImg.clientWidth + "px"
    bottom.style.top = (titleImg.clientHeight * 0.97 - bottom.clientHeight) + "px"
  }
}
window.onresize = () => onReize()

const setStyle = (id: string, attr: string, value: string) => {
  const o = document.getElementById(id)!;
  o.style.setProperty(attr, value)
}

window.onload = () => {
  onReize()
  const t = new Date().getTime();
  const t0 = new Date('2024-01-01T00:00:00+09:00').getTime();
  // const t0 = new Date('2024-06-01T20:48:00+09:00').getTime();
  const day = Math.floor((t - t0) / (5 * 60 * 1000));
  const seed = (day * 101) ^ 0x55
  console.log({ seed: seed });
  const setEvent = (id: string, proc: () => void) => {
    const o = document.getElementById(id)
    if (o != null) {
      o.onclick = o.ontouchend = proc
    }
  };
  setEvent("startGame", () => {
    setStyle("title", "display", "none");
    setStyle("msg", "opacity", "0");
    setStyle("msg", "display", "block");
    setStyle("domMsg", "display", "none");
    (new Main(seed, day)).animate();
  })
}
