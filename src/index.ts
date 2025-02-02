// copy from https://sbcode.net/threejs/renderer/
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'
import { World } from './world'
import *  as W from './world'
import *  as C from './calc'
import *  as WS from './wstorage'
import { range } from './calc'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { itemInfo } from './itemInfos'

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

const labText = (l: number, a: number, b: number, o: number = 1): string => {
  const fi = (t: number): number => {
    const de = 6 / 29
    return de < t ? t ** 3 : (t - 16 / 116) * 3 * de * de
  };
  const [xn, yn, zn] = [95, 100, 108]
  const [xx, yy, zz] = [
    xn * fi((l + 16) / 116 + a / 500),
    yn * fi((l + 16) / 116),
    zn * fi((l + 16) / 116 - b / 200),
  ]
  const ga = (c: number): number => {
    const v = (c < 0.0031308) ? c * 12.92 : (1.055) * c ** (1 / 2.4) - 0.055;
    const z = 4
    return Math.max(0, Math.min(v, z)) * 255 / z
  };
  const sr = ga(2.365 * xx - 0.897 * yy - 0.468 * zz);
  const sg = ga(-0.515 * xx + 1.426 * yy + 0.08876 * zz);
  const sb = ga(0.0052037 * xx - 0.0144 * yy + 1.0092 * zz);
  if (o == 1) {
    return `rgb(${sr} ${sg} ${sb})`
  } else {
    return `rgb(${sr} ${sg} ${sb} / ${o})`
  }
}

const drawWall = (ctx: CanvasRenderingContext2D, cw: number, ax: number, f: number, fa: number) => {
  const col = (l: number, sa: number, ax_: number): string => {
    const t = (1.6 - ax_) * Math.PI * 2 / 3
    const a = sa * Math.sin(t)
    const b = sa * Math.cos(t)
    return labText(l, a, b)
  }
  const baseCol = ctx.createLinearGradient(0, 0, cw, cw);
  baseCol.addColorStop(0, col(40, 25, ax))
  baseCol.addColorStop(1, col(2, 25, ax))
  ctx.fillStyle = baseCol;
  const g = 0
  ctx.fillRect(g, g, cw - g * 2, cw - g * 2)
  const markCol = ctx.createLinearGradient(0, cw, cw, 0);
  const dcol = 0.3
  markCol.addColorStop(0, col(2, 20, ax + dcol))
  markCol.addColorStop(1, col(2, 20, ax - dcol))
  ctx.fillStyle = markCol
  drawF(f + 1 - fa, cw / 2, cw / 2, cw * 0.4, Math.PI * 0, (x: number, y: number, r: number, th: number) => {
    ctx.save()
    if (fa !== 0) {
      const region = new Path2D();
      region.arc(x, y, r / 5, 0, Math.PI * 2);
      region.rect(0, 0, cw, cw)
      ctx.clip(region, "evenodd")
    }
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
          ctx.beginPath();
          const path = new Path2D();
          for (const i of range(0, 5)) {
            const t = i * Math.PI * 4 / 5 - th
            const [xx, yy] = [x + r * Math.cos(t), y + r * Math.sin(t)]
            if (i == 0) {
              path.moveTo(xx, yy)
            } else {
              path.lineTo(xx, yy)
            }
          }
          ctx.fill(path, "nonzero")
        }
        break
      case 2:
        {
          rotataCtx(ctx, th + Math.PI / 4, x, y)
          ctx.beginPath()
          ctx.lineWidth = r / 10
          const [rx, ry] = [r * 0.8, r * 0.2]
          ctx.roundRect(x - rx, y - ry, rx * 2, ry * 2, r / 5)
          rotataCtx(ctx, Math.PI / 2, x, y)
          ctx.roundRect(x - rx, y - ry, rx * 2, ry * 2, r / 5)
          ctx.fill()
        }
        break
    }
    ctx.restore()
  })
  {
    ctx.save()
    const rnd = (e: number): number => {
      return e * Math.random()
    }
    const fs = (): string => {
      const r = f * 20
      const th = Math.random() * Math.PI * 2
      const a = r * Math.sin(th)
      const b = r * Math.cos(th)
      const o = f * 0.04
      return labText(40, a, b, o)
    }

    const n = 5 + f
    const g = cw / n * 0.1
    const h = cw / n - g
    const xa = cw / 8
    for (const iy of range(0, n)) {
      const yc = (iy + 0.5) / n * cw
      let x0 = -rnd(xa)
      while (x0 < cw) {
        const w = xa * (rnd(0.5) + 0.75)
        const xc = x0 + w / 2
        ctx.beginPath()
        ctx.fillStyle = fs();
        ctx.roundRect(xc - w / 2, yc - h / 2, w, h, h * 0.2)
        ctx.fill()
        x0 += w + g
      }
    }
    ctx.restore()
  }
}


const newCanvas = (cw: number, id: string): HTMLCanvasElement => {
  const canvas = document.createElement("canvas")
  canvas.setAttribute("width", `${cw}`)
  canvas.setAttribute("height", `${cw}`)
  canvas.setAttribute("id", id)
  document.getElementsByTagName("body")[0].appendChild(canvas)
  return canvas
}

type actionValues = "" | "hturn" | "vturn" | "forward";
type AudioType = THREE.Audio<GainNode>;
type AudioOpts = {
  volume?: number,
  loop?: number,
};

const createAudio = (stream: string, opts: AudioOpts = {}): AudioType => {
  const audioLoader = new THREE.AudioLoader();
  const listener = new THREE.AudioListener();
  const audio = new THREE.Audio(listener);
  audioLoader.load(stream, (buffer) => {
    audio.setBuffer(buffer);
    if (opts.volume != null) {
      audio.setVolume(opts.volume);
    }
    if (opts.loop != null) {
      audio.setLoopEnd(opts.loop);
      audio.setLoop(true);
    }
  });
  return audio
}


class Main {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  tloader = new THREE.TextureLoader()
  stats = new Stats();
  world_: World | null = null
  get world(): World { return this.world_! }
  queue: DoSomething[] = []
  animates: (() => void)[] = []
  touchStart: { x: number, y: number } | null = null
  touchMove: { x: number, y: number } | null = null
  clock = new THREE.Clock(true)
  items: Map<number, () => void> = new Map<number, () => void>()
  src: W.WSrc | null = null
  soundOn: boolean = false
  simpleMsg = document.getElementById("msg")!
  domMsg = document.getElementById("domMsg")!
  simpleMsgT = 0
  tutorialMessageTimerID: number = 0
  actions: Set<actionValues> = new Set<actionValues>();
  bgm: AudioType = createAudio("./assets/bgm.m4a", { volume: 0.3, loop: 30 });
  seWalk: AudioType = createAudio("./assets/walk.m4a", { volume: 0.8 });
  seGet: AudioType = createAudio("./assets/get.m4a", { volume: 0.6 });
  seGoal: AudioType = createAudio("./assets/goal.m4a", {});

  adaptToWindowSize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(2);
  }
  playSound(a: AudioType) {
    if (this.soundOn) { a.play() }
  }
  initWorld(src: W.WSrc) {
    this.src = src
    this.soundOn = WS.soundOn.value;
    this.world_ = new World(this.src!);
    this.initMap();
    this.world.onItem = (i: W.itemLocType) => { this.onItem(i) }
    this.world.onGoal = (gi: W.GoalInfo) => this.onGoal(gi)
    this.updateItemState();
    this.camera.updateProjectionMatrix()
    this.walk("", () => { return { animate: false, goal: false, get: false } });
    this.openingMessage()
    this.tutorialMessageTimerID = window.setTimeout(() => this.showHowToTurnHorz(), 10000);
    this.playSound(this.bgm);

  }
  openingMessage() {
    switch (this.src!.t) {
      case "REAL":
        {
          const s = this.world.itemStates()
          const rest = s.stock == 2 ? "なし" : `${2 - s.stock} 個`
          this.showMsg(`魔法のタイツ: ${s.g == "stock" ? "入手済み" : "未入手"}\n未回収アイテム: ${rest}`)
        }
        break
      case "T1":
      case "T2":
        this.showMsg("ここは練習ステージです。\nタイツはありますがアイテムはありません。")
    }
  }
  constructor() {
    this.adaptToWindowSize()
    this.scene.clear()
    document.body.appendChild(this.renderer.domElement)
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    });
    this.renderer.shadowMap.enabled = false;
    this.setInputEvents();
    this.initLight();
    this.clock.start()
    this.stats.showPanel(0);
    document.getElementById("stats")!.appendChild(this.stats.dom);
  }
  tGoal(gi: W.GoalInfo) {
    const msg = domItem("div", gi.newItems.includes(World.goalID) ? "タイツとともに帰還成功!" : "生還!");
    msg.appendChild(domItem("br"))
    msg.appendChild(domItem("div", `この迷宮を ${this.world.walkCount} 歩 彷徨った`))
    const ul = domItem("div")
    let lineCount = 0
    for (const id of gi.newItems) {
      if (id == World.goalID) { continue }
      ++lineCount
      const i = itemInfo(id)
      const stars = "★".repeat(i.rarity)
      const dl = domItem("dl")
      dl.appendChild(domItem("dt", "入手時"))
      dl.appendChild(domItem("dd", i.uname))
      dl.appendChild(domItem("dt", "正体"))
      dl.appendChild(domItem("dd", i.name))
      dl.appendChild(domItem("dt", "希少性"))
      dl.appendChild(domItem("dd", stars))
      ul.appendChild(dl)
    }
    if (0 < lineCount) {
      msg.appendChild(domItem("div", "入手アイテムの正体"))
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
  goToTitle() {
    this.bgm.stop();
    setStyle("title", "display", "flex");
    setStyle("game", "display", "none");
    this.scene = new THREE.Scene();
    if (0 < this.tutorialMessageTimerID) {
      clearTimeout(this.tutorialMessageTimerID);
      this.tutorialMessageTimerID = 0;
    }
    this.world_ = null;
    this.camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000)
  }
  taiitsu(text: string) {
    const encoded = encodeURIComponent(text);
    const url = "https://taittsuu.com/share?text=" + encoded;
    if (!window.open(url)) {
      location.href = url;
    }
  }

  showDom(msg: HTMLElement) {
    while (this.domMsg.firstChild) {
      this.domMsg.removeChild(this.domMsg.firstChild);
    }
    this.domMsg.appendChild(msg)
    const appendBtn = (name: string, proc: () => void) => {
      const b = domItem("button", name)
      b.classList.add("ingame");
      b.onclick = (ev) => { proc(); ev.preventDefault(); };
      b.ontouchend = (ev) => { proc(); ev.preventDefault(); };
      this.domMsg.appendChild(b)
    }
    appendBtn("OK", () => this.domMsg.style.display = "none");
    const walkCount = this.world.walkCount
    const itemStates = this.world.itemStates();
    const extMsg = ((): string => {
      switch (this.src!.t) {
        case 'REAL':
          return `第${this.src!.day} 迷宮 / 獲得アイテム ${itemStates.stock} 個`
        case 'T1':
          return "練習迷宮 (小)"
        case 'T2':
          return "練習迷宮 (中)"
        default:
          console.log("logic error")
          return "??"
      }
    })()
    appendBtn("タイーツ", () => this.taiitsu(
      `${[
        extMsg,
        `歩数 ${walkCount}`,
        "#魔法のタイツの迷宮",
        "https://nabetani.sakura.ne.jp/game24e/",
      ].join("\n")}`
    ));
    appendBtn("Go to title", () => this.goToTitle());
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
  writePos(id: string, p: W.xyz | null) {
    const e = document.getElementById(id)!
    if (p == null) {
      e.style.display = "none";
      return
    }
    e.style.display = "inline-block";
    const v: number[] = [p.x, p.y, p.z]
    for (const s of e.childNodes) {
      if (s.nodeName.toUpperCase() == "SPAN") {
        s.textContent = `${v.shift()! + 1}`
      }
      if (v.length == 0) {
        break
      }
    }
  }
  walk(a: actionValues, proc: () => W.walkResult) {
    if (1 < this.queue.length) {
      return
    }
    const cp0 = structuredClone(this.world.camPose)
    const walkResult = proc()
    if (walkResult.animate) {
      this.seWalk.stop();
      if (walkResult.get) {
        this.playSound(this.seGet);
      } else if (walkResult.goal) {
        this.playSound(this.seGoal);
      } else {
        this.playSound(this.seWalk);
      }
      this.actions.add(a);
    }
    const cp1 = structuredClone(this.world.camPose)
    this.writePos("YourPos", this.world.pos)
    let now: null | number = null
    const t = walkResult.animate ? 0.3 : 1 / 1000
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
      this.walk("forward", () => this.world.move())
    };
    const turnY = (x: number) => {
      this.walk("hturn", () => this.world.turnY(x))
    };
    const turnZ = (x: number) => {
      this.walk("vturn", () => this.world.turnZ(x))
    };
    p.addEventListener('touchstart', (e) => {
      if (null == this.world_) { return; }
      this.touchStart = { x: e.touches[0].pageX, y: e.touches[0].pageY };
      this.touchMove = null
    })
    p.addEventListener('touchmove', (e) => {
      if (null == this.world_) { return; }
      this.touchMove = { x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY };
    })
    p.addEventListener('touchend', (e) => {
      if (null == this.world_) { return; }
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
      if (null == this.world_) {
        return;
      }
      // if (event.code == "KeyD") {
      //   const x = this.world.pos.x;
      //   const y = 1e5;
      //   const z = 1e5;
      //   this.camera.lookAt(new THREE.Vector3(x, y, z));
      //   event.preventDefault();
      // } else
      if (event.code == "KeyF") {
        const s = document.getElementById("stats")!;
        if (s.style.display === "block") {
          s.style.display = "none";
        } else {
          s.style.display = "block";
          const e = (s.firstChild as HTMLElement)?.style
          if (e != null) {
            e.left = "50vw"
          }
        }
      } else if (event.code == "ArrowRight") {
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
        got = this.clock.getElapsedTime()
        this.items.delete(item.id)
        this.updateItemState()
      }
    })
  }
  showHowTo(proc: () => void, a: actionValues, text: string) {
    if (this.actions.has(a)) {
      proc();
    } else {
      this.showMsg(text);
      this.tutorialMessageTimerID = window.setTimeout(proc, 5000);
    }
  }
  showHowToTurnHorz() {
    this.showHowTo(() => this.showHowToTurnVert(), "hturn",
      "左右にフリックまたは左右カーソルキーで\n左右に向きを変えます。");
  }
  showHowToTurnVert() {
    this.showHowTo(() => this.showHowToMoveForward(), "vturn",
      "上下にフリックまたは上下カーソルキーで\n上下に向きを変えます。");
  }
  showHowToMoveForward() {
    this.showHowTo(() => { }, "forward",
      "タップまたはスペースキーで\n前進します。");
  }
  updateItemState() {
    this.writePos("TPos", this.world.tpos)
    const s = this.world.itemStates()
    const doms = [
      document.getElementById("tsign")!,
      document.getElementById("isign0")!,
      document.getElementById("isign1")!]
    const item = (n: number): ("stock" | "bag" | "?" | null) => {
      if (n < s.stock) { return "stock" }
      if (n - s.stock < s.bag) { return "bag" }
      if (n < s.total) { return "?" }
      return null
    }
    const iss = [s.g, item(0), item(1)];

    for (let ix = 0; ix < 3; ++ix) {
      const dom = doms[ix]
      const is = iss[ix]
      dom.style.borderStyle = is == "stock" ? "solid" : "dotted"
      dom.style.opacity = is == null ? "0" : (is == "?" ? "0.3" : "1")
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
  newTexture(ax: number, v: number, fa: number): THREE.Texture {
    const cw = 512
    const id = `wall_${ax}_${v}_${fa}`
    const o = (document.getElementById(id) as HTMLCanvasElement) || (() => {
      const canvas = newCanvas(cw, id)
      const ctx = canvas.getContext("2d")!
      drawWall(ctx, cw, ax, v, fa)
      return canvas
    })();
    return new THREE.CanvasTexture(o)
  }
  wallGT(x: number, y: number, z: number, ax: number, te: Map<string, THREE.Texture>): { ge: THREE.BufferGeometry[], ma: THREE.Material[] } {
    const th = 1 / 20
    const p0 = new THREE.PlaneGeometry(1, 1)
    const p1 = new THREE.PlaneGeometry(1, 1)
    const cr = 0.5 ** 0.5
    const side = new THREE.CylinderGeometry(cr, cr, th * 2, 4, 1, true, Math.PI / 4);
    side.rotateX(Math.PI / 2);
    // if (ax * 2 / 2 != 2) {
    //   return { ge: [], ma: [] }
    // }
    switch (ax) {
      case 0:
        p0.rotateX(Math.PI);
        p0.rotateY(-Math.PI / 2);
        p0.translate(x - 0.5 + th, y, z)
        p1.rotateY(-Math.PI / 2);
        p1.translate(x - 0.5 - th, y, z)
        side.rotateY(-Math.PI / 2)
        side.translate(x - 0.5, y, z);
        break;
      case 1:
        p0.rotateX(-Math.PI / 2);
        p0.translate(x, y - 0.5 + th, z)
        p1.rotateX(Math.PI / 2);
        p1.translate(x, y - 0.5 - th, z)
        side.rotateX(-Math.PI / 2)
        side.translate(x, y - 0.5, z);
        break;
      case 2:
        p0.translate(x, y, z - 0.5 + th)
        p1.rotateX(Math.PI);
        p1.translate(x, y, z - 0.5 - th)
        side.translate(x, y, z - 0.5);
        break;
    }
    const v = [x, y, z][ax]
    const ma = (n: number): THREE.Material => {
      const teKey = `${ax}:${v + n}:${v}`
      let t = te.get(teKey)
      if (t == null) {
        t = this.newTexture(ax, v, n)
        te.set(teKey, t)
      }
      return new THREE.MeshBasicMaterial({ map: t })
    }
    const maS = new THREE.MeshBasicMaterial({ color: "#777" })
    return { ge: [p0, p1, side], ma: [ma(0), ma(1), maS] }
  }
  initMap() {
    const size = this.world.size
    const gArray: THREE.BufferGeometry[] = []
    const maArray: THREE.Material[] = []
    const te: Map<string, THREE.Texture> = new Map<string, THREE.Texture>()
    for (const x of range(0, size.x)) {
      for (const y of range(0, size.y)) {
        for (const z of range(0, size.z)) {
          const wall = this.world.cellAt({ x: x, y: y, z: z })
          for (const ax of range(0, 3)) {
            if ((wall & (1 << ax)) == 0) { continue }
            const { ge: ge, ma: ma } = this.wallGT(x, y, z, ax, te)
            gArray.push(...ge)
            maArray.push(...ma)
          }
        }
      }
    }
    const me = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(gArray, true), maArray)
    me.receiveShadow = me.castShadow = false;
    this.scene.add(me)
    this.placeObjects()
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

const setSound = (on: boolean) => {
  const offBtn = document.getElementById("soundOffBtn")!;
  const onBtn = document.getElementById("soundOnBtn")!;
  (on ? onBtn : offBtn).classList.add("checked");
  (on ? offBtn : onBtn).classList.remove("checked");
  WS.soundOn.write(on);
}

const setStyle = (id: string, attr: string, value: string) => {
  const o = document.getElementById(id)!;
  o.style.setProperty(attr, value)
}

const dayNum = (): number => {
  const t = new Date().getTime();
  const t0 = new Date('2024-07-28T00:00:00+09:00').getTime();
  // const t0 = new Date('2024-06-01T20:48:00+09:00').getTime();
  return Math.floor((t - t0) / (24 * 60 * 60 * 1000));
}

const seedNum = (): number => (dayNum() * 1367) ^ 2731

window.onload = () => {
  onReize()
  setSound(WS.soundOn.value);

  const setEvent = (id: string, proc: () => void) => {
    const o = document.getElementById(id)
    if (o != null) {
      o.onclick = proc
      let started = false
      let moved = false
      o.ontouchstart = () => (started = true)
      o.ontouchmove = () => (moved = started)
      o.ontouchcancel = () => (moved = started = false)
      o.ontouchend = (ev) => {
        if (started && !moved) { proc(); }
        moved = started = false;
        ev.preventDefault();
      }
    }
  };
  {
    const main = new Main();
    main.animate();
    const startGame = (src: W.WSrc) => {
      setStyle("title", "display", "none");
      setStyle("msg", "opacity", "0");
      setStyle("msg", "display", "block");
      setStyle("game", "display", "block");
      setStyle("domMsg", "display", "none");
      main.initWorld(src);
    }
    setEvent("startGame", () => {
      startGame({ seed: seedNum(), day: dayNum(), t: "REAL" });
    })
    setEvent("soundOffBtn", () => {
      setSound(false);
    })
    setEvent("soundOnBtn", () => {
      setSound(true);
    })
    const startTutorial = (t: "T1" | "T2") => {
      const tseed = Math.floor(Math.random() * 2 ** 30)
      const tday = -Math.floor(Math.random() * 2 ** 30)
      startGame({ seed: tseed, day: tday, t: t });
    }
    setEvent("tutorial1", () => startTutorial("T1"))
    setEvent("tutorial2", () => startTutorial("T2"))
  }
  setEvent("closeItemList", () => {
    setStyle("menu", "display", "block");
    setStyle("itemList", "display", "none");
  })
  setEvent("howTo", () => {
    setStyle("menu", "display", "block");
    setStyle("howTo", "display", "none");
  })
  setEvent("howToBtn", () => {
    setStyle("menu", "display", "none");
    setStyle("howTo", "display", "block");
  })
  setEvent("story", () => {
    setStyle("menu", "display", "block");
    setStyle("story", "display", "none");
  })
  setEvent("storyBtn", () => {
    setStyle("menu", "display", "none");
    setStyle("story", "display", "block");
  })
  const getItemCounts = (): WS.ItemCountsType => {
    const e = (document.getElementById("radioToday") as HTMLInputElement)!;
    if (e.checked) {
      const i = WS.currentStocks.value;
      if (dayNum() != i.day) {
        return []
      }
      const r: WS.ItemCountsType = [];
      for (const id of i.stocks) {
        r[id] = (r[id] || 0) + 1;
      }
      return r;
    } else {
      return WS.itemCounts.value;
    }
  };
  const updateItemListTable = () => {
    const ft = document.getElementById("firstTR")!
    for (; ;) {
      const nes = ft.nextElementSibling
      if (nes == null) {
        break;
      }
      nes.remove();
    }
    const counts = getItemCounts();
    counts.forEach((count, id) => {
      if (count != null && 0 < count) {
        const ii = itemInfo(id)
        const tr = domItem("tr")
        tr.appendChild(domItem("td", `${ii.name}`))
        tr.appendChild(domItem("td", `${"⭐".repeat(ii.rarity)}`))
        tr.appendChild(domItem("td", `${count}`))
        ft.parentElement!.appendChild(tr)
      }
    })
  };
  for (const id of ["radioToday", "radioTotal"]) {
    const he = document.getElementById(id);
    const ie = (he as HTMLInputElement)!;
    ie.onchange = () => updateItemListTable();
  }
  setEvent("itemListBtn", () => {
    setStyle("menu", "display", "none");
    setStyle("itemList", "display", "block");
    updateItemListTable();
  });
}
