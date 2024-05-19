// copy from https://sbcode.net/threejs/renderer/
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ShadowMesh } from 'three/addons/objects/ShadowMesh.js';

class Main {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  light = new THREE.DirectionalLight(0xd5deff, 1);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true })
  tloader = new THREE.TextureLoader()

  constructor() {
    this.camera.position.z = 0
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true;
    // this.renderer.physicallyCorrectLights = true;
    // this.renderer.outputEncoding = THREE.GammaEncoding;

    document.body.appendChild(this.renderer.domElement)
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    });
    // this.setInputEvents();
    this.initLight();
    this.initMap();
    const oc = new OrbitControls(this.camera, document.body)
    console.log({ oc: oc })

  }
  initLight() {
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 2048;
    this.light.shadow.mapSize.height = 2048;
    this.light.position.x = 0;
    this.light.position.y = 300;
    this.light.position.z = 3;
    this.light.shadow.camera.right = -100;
    this.light.shadow.camera.left = 100;
    this.light.shadow.camera.top = -100;
    this.light.shadow.camera.bottom = 100;

    this.scene.add(this.light);
    // this.scene.add(new THREE.CameraHelper(this.light.shadow.camera));
  }


  setInputEvents() {
    const canvas = this.renderer.domElement;
    const p = canvas.parentElement;
    const move = (n: number) => {
      const dir = this.camera.getWorldDirection(new THREE.Vector3(1, 0, 0))
      console.log({ dir: dir })
      this.camera.position.add(dir.multiplyScalar(0.1))
    };
    const turn = (n: number) => {
      this.camera.rotateY(n * Math.PI / 2)
    };
    if (p) {
      p.addEventListener("keydown", (event) => {
        if (event.code == "ArrowRight") {
          turn(1);
          event.preventDefault();
        } else if (event.code == "ArrowLeft") {
          turn(-1);
          event.preventDefault();
        } else if (event.code == "ArrowUp") {
          move(1);
          event.preventDefault();
        }
        console.log({ name: "keydown", event: event })
      })
    };
  }
  initMap() {
    const floorY = -2
    {
      // const tx = this.tloader.load("./assets/floor.svg")
      // tx.colorSpace = THREE.SRGBColorSpace;
      // tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
      // tx.repeat.set(20, 20);
      const geometry = new THREE.PlaneGeometry(100, 100)
      // const material = new THREE.MeshBasicMaterial({ map: tx })
      const material = new THREE.MeshStandardMaterial();
      const floor = new THREE.Mesh(geometry, material)
      floor.castShadow = true;
      floor.receiveShadow = true;
      floor.translateY(floorY)
      floor.translateZ(-6)
      floor.rotateX(-Math.PI / 2)
      this.scene.add(floor)
    }
    {
      const W = 10;
      const N = W * W;
      const wallT = this.tloader.load("./assets/wall0.webp")
      // wallT.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshBasicMaterial({ map: wallT })
      for (let i = 0; i < N; ++i) {
        const geometry = new THREE.BoxGeometry()
        const cube = new THREE.Mesh(geometry, material)
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.applyMatrix4((new THREE.Matrix4()).multiplyScalar(0.9));
        // const r = 8
        // const th = Math.PI * (2 / N) * i
        // const x = Math.cos(th) * r
        // const z = Math.sin(th) * r
        const path = (e: number) => { return 3 * (e + (e < 0 ? -1 : 1) * 0.5); }
        const x = path(i % W - (W - 1) / 2)
        const z = path(Math.floor(i / W) - (W - 1) / 2)
        cube.translateX(x)
        cube.translateY(0)
        // cube.translateY(floorY + (i * 11 % 5) * 17 % 3 + 1)
        cube.translateZ(z)
        this.scene.add(cube)
        this.scene.add(new ShadowMesh(cube));
      }
    }
  }
  animate() {
    this.camera.rotateY(0.003);
    this.renderer.render(this.scene, this.camera)
    const s = () => this.animate();
    requestAnimationFrame(s);
  }
}

(new Main()).animate();
