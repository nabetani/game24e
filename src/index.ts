// copy from https://sbcode.net/threejs/renderer/
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'
import { World } from './world'
import { range } from './calc'

type DoSomething = { (): void };

class Main {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  tloader = new THREE.TextureLoader()
  stats = new Stats();
  world: World
  queue: [number, DoSomething][] = []
  touchStart: { x: number, y: number } | null = null
  touchMove: { x: number, y: number } | null = null
  flickTh = 40
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
    this.world = new World();
    document.body.appendChild(this.renderer.domElement)
    document.body.appendChild(this.stats.dom);
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    });
    this.setInputEvents();
    this.initLight();
    this.initMap();

  }
  initLight() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9))
  }

  setInputEvents() {
    const p = window;
    const actFrameCount = 16
    const move = () => {
      const camera = this.camera
      const dir0 = camera.getWorldDirection(new THREE.Vector3());
      const dir = dir0.clone().setLength(1)
      console.log({ dir0: dir0, dir: dir0 })
      this.queue.push([actFrameCount, () => camera.position.add(dir.clone().multiplyScalar(1 / actFrameCount))])
    };
    const turnY = (x: number) => {
      const camera = this.camera
      this.queue.push([actFrameCount, () => this.camera.rotateY(Math.PI / 2 / actFrameCount * x)])
    };
    const turnZ = (x: number) => {
      const camera = this.camera
      this.queue.push([actFrameCount, () => this.camera.rotateX(Math.PI / 2 / actFrameCount * x)])
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
    const material = new THREE.MeshStandardMaterial({ map: wallT })
    const geometry = new THREE.BoxGeometry()
    const size = this.world.size
    const th = 0.1
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
          const wall = this.world.at({ x: x, y: y, z: z })
          for (const ax of [0, 1, 2]) {
            const d = (a: number) => (a == ax ? -0.5 : 0)
            if ((wall & (1 << ax)) != 0) {
              const p = new THREE.Mesh(geometry, material)
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
      this.queue[0][1]();
      if (0 === --this.queue[0][0]) {
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
