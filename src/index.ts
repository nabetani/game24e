// copy from https://sbcode.net/threejs/renderer/
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'
import { World } from './world'
import *  as W from './world'
import *  as C from './calc'
import { range } from './calc'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

type DoSomething = { (): boolean };

const xyzToVec3 = (i: W.xyz): THREE.Vector3 => {
  return new THREE.Vector3(i.x, i.y, i.z)
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
    document.getElementById("stats")!.appendChild(this.stats.dom);
  }

  initLight() {
    this.scene.add(new THREE.AmbientLight(0x88ffff, 0.7))
    const pol = new THREE.PointLight(0xffffff, 10, 20)
    pol.position.copy(this.world.pos)
    pol.position.add({ x: -0.3, y: 0.4, z: 0 })
    pol.castShadow = true
    this.scene.add(pol)
    // const dl = (x: number, y: number, z: number, i: number) => {
    //   const o = new THREE.DirectionalLight(0xffffff, i)
    //   o.position.set(x, y, z)
    //   this.scene.add(o)
    // }
    // dl(3, 10, 0, 0.5)
    // dl(1, -10, 1, 0.3)
    // let cix = 0
    // const cols = [0xff, 0xff00, 0xffff, 0xff00ff, 0xffff00, 0xffffff]
    // for (const d0 of [[1, 0.5, 0.1], [0.1, 1, 0.5], [0.5, 0.1, 1]]) {
    //   for (const s of [-1, 1]) {
    //     const d = d0.map((e) => e * s)
    //     const dl = new THREE.DirectionalLight(cols[cix], 0.5)
    //     ++cix
    //     dl.position.set(d[0], d[1], d[2]).normalize();
    //     this.scene.add(dl)
    //   }
    // }
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
    const actFrameCount = 4
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
  setStartObj() {
    const pos = this.world.pos
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
    me.position.set(pos.x, pos.y, pos.z)
    this.scene.add(me)
  }

  initMap() {
    const wallT = this.tloader.load("./assets/wall0.webp")
    const Mate = THREE.MeshLambertMaterial
    const size = this.world.size
    const th = 0.05
    this.setStartObj()
    let poco = 0
    let geoms: Map<number, THREE.BoxGeometry[]> = new Map<number, THREE.BoxGeometry[]>()
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
      const canvas = document.createElement("canvas")
      const cw = 512
      canvas.setAttribute("width", `${cw}`)
      canvas.setAttribute("height", `${cw}`)
      document.getElementsByTagName("body")[0].appendChild(canvas)
      const ctx = canvas.getContext("2d")!
      const ax = k >> 10
      const f = k & 1023
      const w = f * 30 + ax
      ctx.fillStyle = "blue"
      ctx.fillRect(0, 0, 512, 512)
      ctx.fillStyle = "green"
      ctx.fillRect(256 - w / 2, 128, w, 256)
      ctx.fillStyle = "red"
      ctx.fillRect(256 - w / 2, 256 - w / 2, w, w)
      const mate = new Mate({
        map: new THREE.CanvasTexture(canvas),
      })
      const geometry = BufferGeometryUtils.mergeGeometries(geomArray, true);
      const me = new THREE.Mesh(geometry, mate)
      me.receiveShadow = true;
      me.castShadow = true;
      this.scene.add(me)
    });
    console.log(`poco: ${poco * 12}`);
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
