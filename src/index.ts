// copy from https://sbcode.net/threejs/renderer/
import * as THREE from 'three'

class Main {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  tloader = new THREE.TextureLoader()

  constructor() {
    this.camera.position.z = 0
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    });
    // this.setInputEvents();
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
    const N = 4;
    const floorY = -2
    {
      const geometry = new THREE.PlaneGeometry(10, 10)
      const material = new THREE.MeshBasicMaterial({ map: wallT })
      const floor = new THREE.Mesh(geometry, material)
      floor.translateY(floorY)
      floor.translateZ(-6)
      floor.rotateX(-Math.PI / 2)
      this.scene.add(floor)
    }
    {
      const geometry = new THREE.BoxGeometry()
      const material = new THREE.MeshBasicMaterial({ map: wallT })
      for (let i = 0; i < N; ++i) {
        const cube = new THREE.Mesh(geometry, material)
        cube.applyMatrix4((new THREE.Matrix4()).multiplyScalar(0.9));
        const x = i - (N - 1) / 2
        const z = -6
        cube.translateX(x)
        cube.translateY(floorY + 0.5)
        cube.translateZ(z)
        this.scene.add(cube)
      }
    }
  }
  animate() {
    const s = () => this.animate();
    requestAnimationFrame(s);
    this.renderer.render(this.scene, this.camera)
  }
}

(new Main()).animate();
