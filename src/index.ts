// copy from https://sbcode.net/threejs/renderer/
import * as THREE from 'three'

class Main {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  tloader = new THREE.TextureLoader()

  constructor() {
    this.camera.position.z = 1.5
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    });
    this.setInputEvents();
    this.initMap();
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
    const wallT = this.tloader.load("./assets/wall0.webp")
    wallT.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.BoxGeometry()
    const materialM = new THREE.MeshBasicMaterial({ map: wallT })
    const materialN = new THREE.MeshNormalMaterial({ wireframe: false })

    for (let i = 0; i < 1024; ++i) {
      const cube = new THREE.Mesh(geometry, i % 3 == 0 ? materialM : materialN)
      cube.applyMatrix4((new THREE.Matrix4()).multiplyScalar(0.3));
      const x = ((i & 31) - 15);
      const z = ((i >> 5) - 15);
      cube.translateX((x + (0 <= x ? 1 : 0)) * 0.35);
      cube.translateZ((z + (0 <= z ? 1 : 0)) * 0.35);
      this.scene.add(cube)
    }
  }
  animate() {
    const s = () => this.animate();
    requestAnimationFrame(s);
    this.renderer.render(this.scene, this.camera)
  }
}

(new Main()).animate();
