// copy from https://sbcode.net/threejs/renderer/
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'
import { World } from './world'
import *  as W from './world'
import *  as C from './calc'
import { range } from './calc'

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
    document.body.appendChild(this.stats.dom);
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    });
    this.setCamPose(this.camPose)
    this.setInputEvents();
    this.initLight();
    this.initMap();
    this.clock.start()
    this.walk(() => false);
  }
  initLight() {
    this.scene.add(new THREE.AmbientLight(0x88ffff, 0.9))
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
  camPose: W.CamPoseType = {
    pos: new THREE.Vector3(0, 1, 1),
    fore: new THREE.Vector3(0, 0, 1),
    top: new THREE.Vector3(0, 1, 0),
  }
  setCamPose(cp: W.CamPoseType) {
    this.camera.position.set(cp.pos.x, cp.pos.y, cp.pos.z)
    this.camera.up = xyzToVec3(cp.top)
    this.camera.lookAt(xyzToVec3(cp.fore).multiplyScalar(1e10))
  }
  walk(proc: () => boolean) {
    const cp0 = structuredClone(this.world.camPose)
    const animate = proc()
    const cp1 = structuredClone(this.world.camPose)
    const now = this.clock.getElapsedTime()
    const t = animate ? 0.3 : 1 / 1000
    this.queue.push(() => {
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
  initMap() {
    const wallT = this.tloader.load("./assets/wall0.webp")
    const m0 = [
      new THREE.MeshLambertMaterial({ map: wallT }),
      new THREE.MeshLambertMaterial({ map: wallT, color: 0xffff00 }),
    ]
    const m1 = [
      new THREE.MeshLambertMaterial({ map: wallT, color: 0xffff }),
      new THREE.MeshLambertMaterial({ map: wallT, color: 0xff00ff }),
    ]
    const m2 = [
      new THREE.MeshLambertMaterial({ map: wallT, color: 0xff0000 }),
      new THREE.MeshLambertMaterial({ map: wallT, color: 0xff00 }),
    ]
    const s0 = new THREE.MeshLambertMaterial({ color: 0xffaaaa })
    const s1 = new THREE.MeshLambertMaterial({ color: 0xaaffaa })
    const s2 = new THREE.MeshLambertMaterial({ color: 0xaaaaff })
    const ms0 = [s0, s0]
    const ms1 = [s1, s1]
    const ms2 = [s2, s2]
    const geometry = new THREE.BoxGeometry()
    const size = this.world.size
    const th = 0.05
    const txyz = (p: THREE.Mesh, x: number, y: number, z: number, ax: 0 | 1 | 2) => {
      const scale = new THREE.Vector3(ax == 0 ? th : 1, ax == 1 ? th : 1, ax == 2 ? th : 1)
      p.applyMatrix4((new THREE.Matrix4()).scale(scale))
      p.translateX(x)
      p.translateY(y)
      p.translateZ(z)
    }
    for (const x of range(0, size.x)) {
      for (const y of range(0, size.y)) {
        for (const z of range(0, size.z)) {
          const wall = this.world.cellAt({ x: x, y: y, z: z })
          for (const ax of [0, 1, 2]) {
            const d = (a: number) => (a == ax ? -0.5 : 0)
            if ((wall & (1 << ax)) != 0) {
              const ma = [...(ax == 0 ? m0 : ms0), ...(ax == 1 ? m1 : ms1), ...(ax == 2 ? m2 : ms2)]
              const p = new THREE.Mesh(geometry, ma)
              txyz(p, x + d(0), y + d(1), z + d(2), ax as (0 | 1 | 2))
              this.scene.add(p)
            }
          }
        }
      }
    }
  }
  animate() {
    this.stats.begin();
    if (0 < this.queue.length) {
      if (this.queue[0]()) {
        this.queue.shift();
      }
    }
    this.renderer.render(this.scene, this.camera)
    const s = () => this.animate();
    requestAnimationFrame(s);
    this.stats.end();
  }
}

(new Main()).animate();
