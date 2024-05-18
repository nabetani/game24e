// copy from https://sbcode.net/threejs/renderer/
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 1.5

const renderer = new THREE.WebGLRenderer({antialias: true})
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

new OrbitControls(camera, renderer.domElement)
const tloader = new THREE.TextureLoader()
const wallT = tloader.load("./assets/wall0.webp")
wallT.colorSpace = THREE.SRGBColorSpace;const geometry = new THREE.BoxGeometry()
const materialM = new THREE.MeshBasicMaterial({map:wallT})
const materialN = new THREE.MeshNormalMaterial({ wireframe: false })

for( let i=0 ; i<1024 ; ++i ){
  const cube = new THREE.Mesh(geometry, i%3==0 ? materialM : materialN)
  cube.applyMatrix4( (new THREE.Matrix4()).multiplyScalar(0.3) );
  const x = ( (i & 31) - 15 );
  const z = ( (i >>5) - 15 );
  cube.translateX(x*0.35);
  cube.translateZ(z*0.35);
  scene.add(cube)
}

function animate() {
  requestAnimationFrame(animate)

  renderer.render(scene, camera)
}

animate()

