// copy from https://sbcode.net/threejs/renderer/
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
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
  constructor() {
    this.renderer.setSize(window.innerWidth, window.innerHeight)
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
    const oc = new OrbitControls(this.camera, document.body)
    console.log({ oc: oc })

  }
  initLight() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9))
  }

  setInputEvents() {
    const canvas = this.renderer.domElement;
    const p = canvas.parentElement;
    const actFrameCount = 32
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
    if (p) {
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
    };
  }
  initMap() {
    const wallT = this.tloader.load("./assets/wall0.webp")
    const material = new THREE.MeshStandardMaterial({ map: wallT })
    const geometry = new THREE.BoxGeometry()
    const size = this.world.size
    for (const x of range(0, size.x)) {
      for (const y of range(0, size.y)) {
        for (const z of range(0, size.z)) {
          const wall = this.world.at({ x: x, y: y, z: z })
          if (wall === 0) { continue }
          const cube = new THREE.Mesh(geometry, material)
          cube.applyMatrix4((new THREE.Matrix4()).multiplyScalar(0.9));
          cube.translateX(x)
          cube.translateY(y)
          cube.translateZ(z)
          this.scene.add(cube)
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
