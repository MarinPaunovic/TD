import { useEffect, useRef, useState, useCallback } from "react";
import gruntImg from "@/assets/enemy-grunt.png";
import runnerImg from "@/assets/enemy-runner.png";
import tankImg from "@/assets/enemy-tank.png";
import flyerImg from "@/assets/enemy-flyer.png";
import titanImg from "@/assets/enemy-titan.png";
import artBasic from "@/assets/tower-basic.png";
import artSniper from "@/assets/tower-sniper.png";
import artSplash from "@/assets/tower-splash.png";
import artSlow from "@/assets/tower-slow.png";
import artRailgun from "@/assets/tower-railgun.png";
import artFlak from "@/assets/tower-flak.png";
import artCryoshot from "@/assets/tower-cryoshot.png";
import artArtillery from "@/assets/tower-artillery.png";
import artGlacier from "@/assets/tower-glacier.png";
import artBlizzard from "@/assets/tower-blizzard.png";

const COLS = 12;
const ROWS = 18;
const CELL = 32;
const SCALE = 2;
const MAX_LEVEL = 10;

const PATH: { x: number; y: number }[] = [
  { x: 0, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 4 }, { x: 1, y: 4 },
  { x: 1, y: 8 }, { x: 5, y: 8 }, { x: 5, y: 5 }, { x: 8, y: 5 },
  { x: 8, y: 10 }, { x: 3, y: 10 }, { x: 3, y: 13 }, { x: 10, y: 13 },
  { x: 10, y: 16 }, { x: 11, y: 16 },
];

type TowerType =
  | "basic" | "sniper" | "splash" | "slow"
  | "railgun" | "flak" | "cryoshot" | "artillery" | "glacier" | "blizzard";

interface TowerSpec {
  name: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number;
  color: string;
  desc: string;
  buildable: boolean;
  splash: number;
  slow: number;
  slowDur: number;
}

const spec = (s: Partial<TowerSpec> & { name: string; cost: number; range: number; damage: number; fireRate: number; color: string; desc: string }): TowerSpec => ({
  buildable: false, splash: 0, slow: 1, slowDur: 0, ...s,
});

const TOWER_TYPES: Record<TowerType, TowerSpec> = {
  basic: spec({ name: "Turret", cost: 50, range: 2.8, damage: 18, fireRate: 550, color: "#4f8cff", desc: "Fast, cheap", buildable: true }),
  sniper: spec({ name: "Sniper", cost: 120, range: 5.5, damage: 80, fireRate: 1600, color: "#ff7a45", desc: "Long range", buildable: true }),
  splash: spec({ name: "Mortar", cost: 175, range: 3.5, damage: 35, fireRate: 1300, color: "#3ddc84", desc: "Area damage", buildable: true, splash: 1.6 }),
  slow: spec({ name: "Frost", cost: 100, range: 3.2, damage: 6, fireRate: 800, color: "#49d6e8", desc: "Slows enemies", buildable: true, slow: 0.5, slowDur: 1500 }),

  railgun: spec({ name: "Railgun", cost: 0, range: 6.2, damage: 130, fireRate: 900, color: "#c86bff", desc: "Turret + Sniper" }),
  flak: spec({ name: "Flak", cost: 0, range: 3.8, damage: 46, fireRate: 620, color: "#7dffb0", desc: "Turret + Mortar", splash: 1.5 }),
  cryoshot: spec({ name: "Cryoshot", cost: 0, range: 3.6, damage: 30, fireRate: 480, color: "#8fd8ff", desc: "Turret + Frost", slow: 0.55, slowDur: 1200 }),
  artillery: spec({ name: "Artillery", cost: 0, range: 6.0, damage: 110, fireRate: 1500, color: "#ffb03a", desc: "Sniper + Mortar", splash: 2.2 }),
  glacier: spec({ name: "Glacier", cost: 0, range: 6.0, damage: 70, fireRate: 1400, color: "#6ea8ff", desc: "Sniper + Frost", slow: 0.35, slowDur: 2000 }),
  blizzard: spec({ name: "Blizzard", cost: 0, range: 4.0, damage: 45, fireRate: 1100, color: "#b9f2ff", desc: "Mortar + Frost", splash: 2.0, slow: 0.4, slowDur: 1800 }),
};

const TOWER_ART: Record<TowerType, string> = {
  basic: artBasic, sniper: artSniper, splash: artSplash, slow: artSlow,
  railgun: artRailgun, flak: artFlak, cryoshot: artCryoshot,
  artillery: artArtillery, glacier: artGlacier, blizzard: artBlizzard,
};

const towerSpriteCache: Partial<Record<TowerType, HTMLImageElement>> = {};
const getTowerSprite = (t: TowerType): HTMLImageElement | null => {
  if (typeof window === "undefined") return null;
  let img = towerSpriteCache[t];
  if (!img) {
    img = new Image();
    img.src = TOWER_ART[t];
    towerSpriteCache[t] = img;
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
};

const FUSIONS: Record<string, TowerType> = {
  "basic+sniper": "railgun",
  "basic+splash": "flak",
  "basic+slow": "cryoshot",
  "sniper+splash": "artillery",
  "sniper+slow": "glacier",
  "splash+slow": "blizzard",
};

const fusionFor = (a: TowerType, b: TowerType): TowerType | null => {
  const key = [a, b].sort().join("+");
  return FUSIONS[key] ?? null;
};

type EnemyClass = "light" | "normal" | "heavy" | "flying" | "boss";
type EnemyType = "runner" | "grunt" | "tank" | "flyer" | "titan";

interface EnemySpec {
  name: string; cls: EnemyClass; hp: number; speed: number;
  reward: number; size: number; sprite: string; tint: string; note: string;
}

const ENEMY_TYPES: Record<EnemyType, EnemySpec> = {
  runner: { name: "Runner", cls: "light", hp: 20, speed: 1.7, reward: 9, size: 0.52, sprite: runnerImg, tint: "#9ae44b", note: "Light · fast" },
  grunt: { name: "Grunt", cls: "normal", hp: 48, speed: 1, reward: 11, size: 0.6, sprite: gruntImg, tint: "#ff6b6b", note: "Normal" },
  tank: { name: "Tank", cls: "heavy", hp: 165, speed: 0.55, reward: 24, size: 0.8, sprite: tankImg, tint: "#ffa03a", note: "Heavy armor" },
  flyer: { name: "Drone", cls: "flying", hp: 40, speed: 1.35, reward: 15, size: 0.62, sprite: flyerImg, tint: "#b36bff", note: "Flying" },
  titan: { name: "Titan", cls: "boss", hp: 1100, speed: 0.45, reward: 180, size: 1.05, sprite: titanImg, tint: "#ff3b7b", note: "Boss" },
};

// Counter system: how much damage each tower deals to each enemy class
const DAMAGE_TABLE: Record<TowerType, Record<EnemyClass, number>> = {
  basic:     { light: 1.4, normal: 1.1, heavy: 0.5, flying: 0.9, boss: 0.7 },
  sniper:    { light: 0.7, normal: 1.0, heavy: 1.8, flying: 0.8, boss: 1.6 },
  splash:    { light: 1.6, normal: 1.3, heavy: 0.8, flying: 0.4, boss: 0.9 },
  slow:      { light: 1.0, normal: 1.0, heavy: 0.7, flying: 1.8, boss: 1.0 },
  railgun:   { light: 0.9, normal: 1.1, heavy: 1.9, flying: 1.0, boss: 1.7 },
  flak:      { light: 1.5, normal: 1.2, heavy: 0.7, flying: 2.0, boss: 0.9 },
  cryoshot:  { light: 1.5, normal: 1.1, heavy: 0.6, flying: 1.6, boss: 0.9 },
  artillery: { light: 1.2, normal: 1.3, heavy: 1.5, flying: 0.5, boss: 1.5 },
  glacier:   { light: 0.9, normal: 1.1, heavy: 1.4, flying: 1.6, boss: 1.4 },
  blizzard:  { light: 1.4, normal: 1.2, heavy: 1.0, flying: 1.5, boss: 1.1 },
};

const bestVs = (t: TowerType) => {
  const row = DAMAGE_TABLE[t];
  return (Object.keys(row) as EnemyClass[]).sort((a, b) => row[b] - row[a])[0]!;
};

// Endless waves: count grows then plateaus, difficulty keeps rising through HP scaling
const waveComposition = (wave: number): EnemyType[] => {
  const list: EnemyType[] = [];
  const n = Math.min(46, 8 + wave * 3);
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    if (wave >= 4 && r < 0.22) list.push("tank");
    else if (wave >= 3 && r < 0.46) list.push("flyer");
    else if (wave >= 2 && r < 0.72) list.push("runner");
    else list.push("grunt");
  }
  if (wave % 5 === 0) {
    const bosses = 1 + Math.floor(wave / 15);
    for (let i = 0; i < bosses; i++) list.push("titan");
  }
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
};

const waveHpMultFor = (wave: number) => 3 * (1 + wave * 0.36 + Math.pow(Math.max(0, wave - 10), 1.75) * 0.08);

const spriteCache: Partial<Record<EnemyType, HTMLImageElement>> = {};
const getSprite = (t: EnemyType): HTMLImageElement | null => {
  if (typeof window === "undefined") return null;
  let img = spriteCache[t];
  if (!img) {
    img = new Image();
    img.src = ENEMY_TYPES[t].sprite;
    spriteCache[t] = img;
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
};

interface Enemy {
  id: number;
  type: EnemyType;
  cls: EnemyClass;
  size: number;
  pathIndex: number;
  progress: number;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  frozen: number;
  slowFactor: number;
  hurt: number;
}

interface Tower {
  id: number;
  x: number;
  y: number;
  type: TowerType;
  level: number;
  range: number;
  damage: number;
  fireRate: number;
  cooldown: number;
  color: string;
  invested: number;
  angle: number;
  flash: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  target: Enemy;
  damage: number;
  speed: number;
  type: TowerType;
  splashRadius: number;
  slow: number;
  slowDur: number;
  hit: boolean;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  drag?: number;
}

interface FloatingText {
  x: number; y: number; text: string; color: string;
  life: number; maxLife: number; vy: number; scale: number;
}

interface Shockwave {
  x: number; y: number; radius: number; maxRadius: number;
  life: number; maxLife: number; color: string;
}

const statsFor = (type: TowerType, level: number) => {
  const s = TOWER_TYPES[type];
  const m = level - 1;
  return {
    damage: Math.round(s.damage * Math.pow(1.45, m)),
    range: +(s.range * Math.pow(1.07, m)).toFixed(2),
    fireRate: Math.round(s.fireRate * Math.pow(0.9, m)),
  };
};

const upgradeCost = (tower: { type: TowerType; level: number }) => {
  const base = TOWER_TYPES[tower.type].cost || 200;
  return Math.round(base * 0.4 * Math.pow(1.3, tower.level - 1));
};

let nextId = 1;

interface Inspected {
  id: number; type: TowerType; level: number; damage: number; range: number; fireRate: number; invested: number;
}

type ControlTab = "build" | "selected" | "guide";

export function TowerDefenseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [money, setMoney] = useState(120);
  const [lives, setLives] = useState(20);
  const [wave, setWave] = useState(0);
  const [selectedTower, setSelectedTower] = useState<TowerType>("basic");
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [enemiesRemaining, setEnemiesRemaining] = useState(0);
  const [inspected, setInspected] = useState<Inspected | null>(null);
  const [speed, setSpeed] = useState(1);
  const [controlTab, setControlTab] = useState<ControlTab>("build");
  const [best, setBest] = useState(0);
  const [autoStart, setAutoStart] = useState(false);
  const [paused, setPaused] = useState(false);

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const autoStartRef = useRef(autoStart);
  autoStartRef.current = autoStart;

  useEffect(() => {
    const saved = Number(localStorage.getItem("td-best-wave") || 0);
    if (saved > 0) setBest(saved);
  }, []);

  useEffect(() => {
    if (best > 0) localStorage.setItem("td-best-wave", String(best));
  }, [best]);

  const selectedRef = useRef(selectedTower);
  selectedRef.current = selectedTower;

  const state = useRef({
    enemies: [] as Enemy[],
    towers: [] as Tower[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    shockwaves: [] as Shockwave[],
    lastTime: 0,
    waveSpawnTimer: 0,
    toSpawn: 0,
    spawnQueue: [] as EnemyType[],
    spawnInterval: 0,
    waveHpMult: 1,
    isPlaying: false,
    lives: 20,
    money: 120,
    wave: 0,
    hover: null as { x: number; y: number } | null,
    inspectId: 0,
    dragSourceId: 0,
    dragTarget: null as { x: number; y: number } | null,
    dragActive: false,
    time: 0,
    shake: 0,
    banner: 0,
    bannerText: "",
    bannerColor: "#ffffff",
    paused: false,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    dangerFlash: 0,
  });

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2000);
  }, []);

  const syncInspect = useCallback(() => {
    const t = state.current.towers.find((tw) => tw.id === state.current.inspectId);
    setInspected(t ? { id: t.id, type: t.type, level: t.level, damage: t.damage, range: t.range, fireRate: t.fireRate, invested: t.invested } : null);
  }, []);

  const startWave = useCallback(() => {
    if (state.current.isPlaying || state.current.paused) return;
    state.current.isPlaying = true;
    state.current.wave += 1;
    const queue = waveComposition(state.current.wave);
    state.current.spawnQueue = queue;
    state.current.toSpawn = queue.length;
    state.current.spawnInterval = Math.max(700, 1500 - state.current.wave * 60);
    state.current.waveSpawnTimer = 0;
    state.current.waveHpMult = waveHpMultFor(state.current.wave);
    setWave(state.current.wave);
    setIsPlaying(true);
    setEnemiesRemaining(queue.length);
    state.current.banner = 1200;
    state.current.bannerText = `WAVE ${state.current.wave}`;
    state.current.bannerColor = state.current.wave % 5 === 0 ? "#ff3b7b" : "#6ea8ff";
  }, []);

  const togglePause = useCallback(() => {
    state.current.paused = !state.current.paused;
    setPaused(state.current.paused);
  }, []);

  const applyStats = (t: Tower) => {
    const s = statsFor(t.type, t.level);
    t.damage = s.damage;
    t.range = s.range;
    t.fireRate = s.fireRate;
    t.color = TOWER_TYPES[t.type].color;
  };

  const upgrade = useCallback(() => {
    const st = state.current;
    const t = st.towers.find((tw) => tw.id === st.inspectId);
    if (!t) return;
    if (t.level >= MAX_LEVEL) { showMessage("Max level!"); return; }
    const cost = upgradeCost(t);
    if (st.money < cost) { showMessage("Not enough gold!"); return; }
    st.money -= cost;
    t.level += 1;
    t.invested += cost;
    applyStats(t);
    setMoney(st.money);
    syncInspect();
  }, [showMessage, syncInspect]);

  const sell = useCallback(() => {
    const st = state.current;
    const t = st.towers.find((tw) => tw.id === st.inspectId);
    if (!t) return;
    const refund = Math.round(t.invested * 0.6);
    st.money += refund;
    st.towers = st.towers.filter((tw) => tw.id !== t.id);
    st.inspectId = 0;
    setMoney(st.money);
    setInspected(null);
    setControlTab("build");
    showMessage(`Sold for ${refund}g`);
  }, [showMessage]);

  const fuseTowers = useCallback((sourceId: number, targetId: number) => {
    const st = state.current;
    const source = st.towers.find((t) => t.id === sourceId);
    const target = st.towers.find((t) => t.id === targetId);
    if (!source || !target || source.id === target.id) return;
    const result = fusionFor(source.type, target.type);
    if (!result) { showMessage("Those towers cannot fuse"); return; }
    const cost = 75;
    if (st.money < cost) { showMessage(`Fusion costs ${cost}g`); return; }
    st.money -= cost;
    const level = Math.max(1, Math.min(MAX_LEVEL, Math.max(source.level, target.level)));
    const fused: Tower = {
      id: nextId++, x: target.x, y: target.y, type: result, level,
      range: 0, damage: 0, fireRate: 0, cooldown: 0, color: "#fff",
      invested: source.invested + target.invested + cost, angle: -Math.PI / 2, flash: 200,
    };
    applyStats(fused);
    st.towers = st.towers.filter((t) => t.id !== source.id && t.id !== target.id);
    st.towers.push(fused);
    const fx = fused.x * CELL + CELL / 2;
    const fy = fused.y * CELL + CELL / 2;
    st.shockwaves.push({ x: fx, y: fy, radius: 4, maxRadius: 44, life: 520, maxLife: 520, color: TOWER_TYPES[result].color });
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * 0.22;
      st.particles.push({ x: fx, y: fy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 520, maxLife: 520, color: TOWER_TYPES[result].color, size: 1.5 + Math.random() * 3 });
    }
    st.floatingTexts.push({ x: fx, y: fy - 20, text: TOWER_TYPES[result].name.toUpperCase(), color: TOWER_TYPES[result].color, life: 900, maxLife: 900, vy: -0.025, scale: 1.25 });
    st.shake = Math.max(st.shake, 8);
    st.inspectId = fused.id;
    setMoney(st.money);
    syncInspect();
    setControlTab("selected");
    showMessage(`Fused into ${TOWER_TYPES[result].name}!`);
  }, [showMessage, syncInspect]);

  const placeTower = useCallback((gridX: number, gridY: number) => {
    const st = state.current;
    const existing = st.towers.find((t) => t.x === gridX && t.y === gridY);

    if (existing) {
      st.inspectId = st.inspectId === existing.id ? 0 : existing.id;
      syncInspect();
      setControlTab(st.inspectId ? "selected" : "build");
      return;
    }
    if (PATH.some((p, i) => {
      const n = PATH[i + 1];
      if (!n) return p.x === gridX && p.y === gridY;
      if (p.x === n.x && p.x === gridX) return gridY >= Math.min(p.y, n.y) && gridY <= Math.max(p.y, n.y);
      if (p.y === n.y && p.y === gridY) return gridX >= Math.min(p.x, n.x) && gridX <= Math.max(p.x, n.x);
      return false;
    })) return;
    const s = TOWER_TYPES[selectedRef.current];
    if (st.money < s.cost) {
      showMessage("Not enough gold!");
      return;
    }
    const tower: Tower = {
      id: nextId++, x: gridX, y: gridY, type: selectedRef.current, level: 1,
      range: s.range, damage: s.damage, fireRate: s.fireRate, cooldown: 0,
      color: s.color, invested: s.cost, angle: -Math.PI / 2, flash: 0,
    };
    st.towers.push(tower);
    st.inspectId = tower.id;
    st.money -= s.cost;
    setMoney(st.money);
    syncInspect();
    setControlTab("selected");
  }, [showMessage, syncInspect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const toGrid = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((clientX - rect.left) / rect.width) * COLS);
      const y = Math.floor(((clientY - rect.top) / rect.height) * ROWS);
      return { x, y };
    };

    let pointerStart: { x: number; y: number; gridX: number; gridY: number; sourceId: number } | null = null;
    const handlePointerDown = (e: PointerEvent) => {
      const { x, y } = toGrid(e.clientX, e.clientY);
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
      const tower = state.current.towers.find((t) => t.x === x && t.y === y);
      pointerStart = { x: e.clientX, y: e.clientY, gridX: x, gridY: y, sourceId: tower?.id ?? 0 };
      canvas.setPointerCapture(e.pointerId);
    };
    const handlePointerMove = (e: PointerEvent) => {
      const { x, y } = toGrid(e.clientX, e.clientY);
      state.current.hover = x >= 0 && x < COLS && y >= 0 && y < ROWS ? { x, y } : null;
      if (pointerStart?.sourceId && Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 8) {
        state.current.dragSourceId = pointerStart.sourceId;
        state.current.dragActive = true;
        state.current.dragTarget = state.current.hover;
      }
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerStart) return;
      const { x, y } = toGrid(e.clientX, e.clientY);
      if (state.current.dragActive) {
        const target = state.current.towers.find((t) => t.x === x && t.y === y);
        if (target && target.id !== pointerStart.sourceId) fuseTowers(pointerStart.sourceId, target.id);
        else showMessage("Drop onto another tower to fuse");
      } else if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
        placeTower(x, y);
      }
      state.current.dragSourceId = 0;
      state.current.dragTarget = null;
      state.current.dragActive = false;
      pointerStart = null;
    };
    const handleLeave = () => { if (!pointerStart) state.current.hover = null; };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointerleave", handleLeave);

    const burst = (x: number, y: number, color: string, count: number, power: number) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * power;
        state.current.particles.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 400, maxLife: 400, color, size: 1.5 + Math.random() * 2,
        });
      }
    };

    const burstRing = (x: number, y: number, color: string, radius = 22, life = 260) => {
      state.current.shockwaves.push({ x, y, radius: 4, maxRadius: radius, life, maxLife: life, color });
    };

    const floatText = (x: number, y: number, text: string, color: string, scale = 1) => {
      state.current.floatingTexts.push({ x, y, text, color, life: 650, maxLife: 650, vy: -0.035, scale });
    };

    const spawnEnemy = () => {
      const start = PATH[0];
      if (!start) return;
      const type = state.current.spawnQueue.shift() ?? "grunt";
      const es = ENEMY_TYPES[type];
      const hp = Math.floor(es.hp * state.current.waveHpMult);
      const speed = (0.0015 + state.current.wave * 0.00005) * es.speed;
      const enemyId = nextId++;
      state.current.enemies.push({
        id: enemyId, type, cls: es.cls, size: es.size, pathIndex: 0, progress: 0,
        x: start.x * CELL + CELL / 2, y: start.y * CELL + CELL / 2, angle: 0,
        hp, maxHp: hp, speed, reward: es.reward + state.current.wave,
        frozen: 0, slowFactor: 1, hurt: 0,
      });
      state.current.shockwaves.push({ x: start.x * CELL + CELL / 2, y: start.y * CELL + CELL / 2, radius: 3, maxRadius: type === "titan" ? 24 : 13, life: 260, maxLife: 260, color: es.tint });
    };

    const update = (dt: number) => {
      const st = state.current;
      st.time += dt;
      if (st.paused) return;

      if (st.comboTimer > 0) {
        st.comboTimer -= dt;
        if (st.comboTimer <= 0) st.combo = 0;
      }

      if (st.isPlaying && st.toSpawn > 0) {
        st.waveSpawnTimer += dt;
        if (st.waveSpawnTimer >= st.spawnInterval) {
          spawnEnemy();
          st.toSpawn -= 1;
          st.waveSpawnTimer = 0;
          setEnemiesRemaining(st.toSpawn);
        }
      }
      if (st.isPlaying && st.toSpawn === 0 && st.enemies.length === 0) {
        st.isPlaying = false;
        setIsPlaying(false);
        st.money += 25 + st.wave * 5;
        setMoney(st.money);
        showMessage(`Wave ${st.wave} cleared! +${25 + st.wave * 5}g`);
        st.banner = 1050;
        st.bannerText = `WAVE ${st.wave} CLEAR`;
        st.bannerColor = "#3ddc84";
        if (autoStartRef.current) {
          // small delay so the reward message is visible before the next wave begins
          setTimeout(() => startWave(), 900);
        }
      }

      st.enemies.forEach((enemy) => {
        const factor = enemy.frozen > 0 ? enemy.slowFactor : 1;
        if (enemy.frozen > 0) {
          enemy.frozen -= dt;
          if (enemy.frozen <= 0) enemy.slowFactor = 1;
        }
        const current = PATH[enemy.pathIndex];
        const next = PATH[enemy.pathIndex + 1];
        if (!current || !next) {
          st.lives -= 1;
          setLives(st.lives);
          st.dangerFlash = 280;
          st.shake = Math.max(st.shake, 5);
          burst(enemy.x, enemy.y, "#ff5d5d", 12, 0.12);
          burstRing(enemy.x, enemy.y, "#ff5d5d", 22, 260);
          floatText(enemy.x, enemy.y - 16, "-1 LIFE", "#ff5d5d", 1.0);
          enemy.hp = 0;
          return;
        }
        const dx = next.x - current.x;
        const dy = next.y - current.y;
        const segLen = Math.hypot(dx, dy);
        enemy.progress += (enemy.speed * dt * factor) / segLen;
        if (enemy.progress >= 1) {
          enemy.pathIndex += 1;
          enemy.progress = 0;
        }
        enemy.x = (current.x + dx * enemy.progress) * CELL + CELL / 2;
        enemy.y = (current.y + dy * enemy.progress) * CELL + CELL / 2;
        enemy.angle = Math.atan2(dy, dx) + Math.PI / 2;
        enemy.hurt = Math.max(0, enemy.hurt - dt);
      });
      st.enemies = st.enemies.filter((e) => e.hp > 0);

      st.towers.forEach((tower) => {
        tower.cooldown = Math.max(0, tower.cooldown - dt);
        tower.flash = Math.max(0, tower.flash - dt);
        const cx = tower.x * CELL + CELL / 2;
        const cy = tower.y * CELL + CELL / 2;
        const s = TOWER_TYPES[tower.type];
        const target = st.enemies
          .map((e) => ({ e, dist: Math.hypot(e.x - cx, e.y - cy) }))
          .filter((t) => t.dist <= tower.range * CELL)
          .sort((a, b) => b.e.pathIndex - a.e.pathIndex || b.e.progress - a.e.progress)[0];
        if (target) {
          tower.angle = Math.atan2(target.e.y - cy, target.e.x - cx);
          if (tower.cooldown <= 0) {
            st.projectiles.push({
              id: nextId++, x: cx, y: cy, target: target.e,
              damage: tower.damage, speed: 0.9, type: tower.type,
              splashRadius: s.splash * CELL, slow: s.slow, slowDur: s.slowDur, hit: false,
            });
            tower.cooldown = tower.fireRate;
            tower.flash = 120;
            const muzzleX = cx + Math.cos(tower.angle) * CELL * 0.38;
            const muzzleY = cy + Math.sin(tower.angle) * CELL * 0.38;
            burst(muzzleX, muzzleY, tower.color, 4, 0.10);
          }
        }
      });

      st.projectiles.forEach((p) => {
        if (!st.enemies.includes(p.target)) {
          p.hit = true;
          return;
        }
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.min(dist, p.speed * dt);
        if (dist > 0) {
          p.x += (dx / dist) * step;
          p.y += (dy / dist) * step;
        }
        if (dist <= p.speed * dt) {
          const color = TOWER_TYPES[p.type].color;
          const applyHit = (e: Enemy) => {
            const mult = DAMAGE_TABLE[p.type][e.cls];
            const dealt = p.damage * mult;
            e.hp -= dealt;
            e.hurt = 160;
            floatText(e.x, e.y - 10, `-${Math.round(dealt)}`, mult >= 1.4 ? "#ffe066" : "#ffffff", mult >= 1.4 ? 1.05 : 0.9);
            if (p.slowDur > 0) { e.frozen = p.slowDur; e.slowFactor = p.slow; }
            if (mult >= 1.4) burst(e.x, e.y, "#ffe066", 6, 0.09);
            else if (mult <= 0.7) burst(e.x, e.y, "#8a97b0", 3, 0.04);
          };
          if (p.splashRadius > 0) {
            st.enemies.forEach((e) => {
              if (Math.hypot(e.x - p.x, e.y - p.y) <= p.splashRadius) applyHit(e);
            });
            burst(p.x, p.y, color, 16, 0.15);
            burstRing(p.x, p.y, color, p.splashRadius * 0.75, 300);
            st.shake = Math.max(st.shake, p.splashRadius > CELL * 1.8 ? 3 : 1.5);
          } else {
            applyHit(p.target);
            burst(p.x, p.y, color, 7, 0.09);
            burstRing(p.x, p.y, color, 12, 180);
          }
          p.hit = true;
        }
      });

      const killed = st.enemies.filter((e) => e.hp <= 0);
      killed.forEach((e) => {
        st.money += e.reward;
        st.kills += 1;
        st.combo += 1;
        st.comboTimer = 1800;
        burst(e.x, e.y, "#ffd166", e.type === "titan" ? 24 : 10, e.type === "titan" ? 0.18 : 0.1);
        burstRing(e.x, e.y, e.type === "titan" ? "#ff3b7b" : "#ffd166", e.type === "titan" ? 34 : 16, e.type === "titan" ? 420 : 220);
        floatText(e.x, e.y - 16, `+${e.reward}g`, "#ffd166", e.type === "titan" ? 1.2 : 0.85);
        if (st.combo >= 3 && e.type !== "titan") floatText(e.x, e.y - 29, `${st.combo}x COMBO`, "#ffffff", 0.72);
        if (e.type === "titan") st.shake = Math.max(st.shake, 10);
      });
      if (killed.length) setMoney(st.money);
      st.enemies = st.enemies.filter((e) => e.hp > 0);
      st.projectiles = st.projectiles.filter((p) => !p.hit);

      st.particles.forEach((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= Math.pow(pt.drag ?? 0.985, dt / 16.67);
        pt.vy *= Math.pow(pt.drag ?? 0.985, dt / 16.67);
        pt.life -= dt;
      });
      st.particles = st.particles.filter((pt) => pt.life > 0);
      st.floatingTexts.forEach((ft) => { ft.y += ft.vy * dt; ft.life -= dt; });
      st.floatingTexts = st.floatingTexts.filter((ft) => ft.life > 0);
      st.shockwaves.forEach((sw) => {
        sw.life -= dt;
        const p = 1 - Math.max(0, sw.life / sw.maxLife);
        sw.radius = 4 + (sw.maxRadius - 4) * p;
      });
      st.shockwaves = st.shockwaves.filter((sw) => sw.life > 0);
      st.banner = Math.max(0, st.banner - dt);
      st.dangerFlash = Math.max(0, st.dangerFlash - dt);
      st.shake *= Math.pow(0.88, dt / 16.67);

      if (st.lives <= 0) {
        const reached = st.wave;
        st.isPlaying = false;
        st.paused = false;
        setPaused(false);
        st.enemies = [];
        st.towers = [];
        st.projectiles = [];
        st.lives = 20;
        st.money = 120;
        st.wave = 0;
        st.toSpawn = 0;
        st.inspectId = 0;
        setBest((b) => Math.max(b, reached));
        setLives(20);
        setMoney(120);
        setWave(0);
        setIsPlaying(false);
        setEnemiesRemaining(0);
        setInspected(null);
        setControlTab("build");
        showMessage(`Game Over at wave ${reached}! Restarting...`);
      }
    };

    const isPathCell = (gx: number, gy: number) =>
      PATH.some((p, i) => {
        const n = PATH[i + 1];
        if (!n) return p.x === gx && p.y === gy;
        if (p.x === n.x && p.x === gx) return gy >= Math.min(p.y, n.y) && gy <= Math.max(p.y, n.y);
        if (p.y === n.y && p.y === gy) return gx >= Math.min(p.x, n.x) && gx <= Math.max(p.x, n.x);
        return false;
      });

    const drawRange = (cx: number, cy: number, range: number, color: string, strong: boolean) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, range * CELL, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = strong ? 0.12 : 0.07;
      ctx.fill();
      ctx.globalAlpha = strong ? 0.8 : 0.4;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    };

    const draw = () => {
      const st = state.current;
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      if (st.shake > 0.2) {
        ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
      }
      const W = COLS * CELL;
      const H = ROWS * CELL;

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#111a2b");
      bg.addColorStop(1, "#0b1220");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if ((x + y) % 2 === 0) {
            ctx.fillStyle = "rgba(255,255,255,0.025)";
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          }
        }
      }
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 1; x < COLS; x++) {
        ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
      }
      for (let y = 1; y < ROWS; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
      }
      ctx.save();
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < 26; i++) {
        const px = ((i * 83 + st.time * (0.004 + (i % 3) * 0.001)) % W);
        const py = (i * 47) % H;
        ctx.fillStyle = i % 4 === 0 ? "#6ea8ff" : "#ffffff";
        ctx.fillRect(px, py, 1, 1);
      }
      ctx.restore();

      const tracePath = () => {
        ctx.beginPath();
        PATH.forEach((p, i) => {
          const px = p.x * CELL + CELL / 2;
          const py = p.y * CELL + CELL / 2;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
      };
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = CELL * 0.72;
      ctx.strokeStyle = "rgba(90,130,200,0.18)";
      tracePath(); ctx.stroke();
      ctx.lineWidth = CELL * 0.56;
      ctx.strokeStyle = "#1d2b45";
      tracePath(); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -(st.time * 0.02) % 14;
      ctx.strokeStyle = "rgba(140,180,255,0.35)";
      tracePath(); ctx.stroke();
      ctx.setLineDash([]);

      const start = PATH[0];
      const end = PATH[PATH.length - 1];
      if (start) {
        ctx.fillStyle = "#3ddc84";
        ctx.beginPath();
        ctx.roundRect(start.x * CELL + 6, start.y * CELL + 6, CELL - 12, CELL - 12, 5);
        ctx.fill();
      }
      if (end) {
        ctx.fillStyle = "#ff5d5d";
        ctx.beginPath();
        ctx.roundRect(end.x * CELL + 6, end.y * CELL + 6, CELL - 12, CELL - 12, 5);
        ctx.fill();
      }

      st.towers.forEach((t) => {
        const cx = t.x * CELL + CELL / 2;
        const cy = t.y * CELL + CELL / 2;
        drawRange(cx, cy, t.range, t.color, st.inspectId === t.id);
      });

      if (st.hover && !st.dragActive) {
        const { x, y } = st.hover;
        const occupied = st.towers.some((t) => t.x === x && t.y === y);
        if (!occupied) {
          const s = TOWER_TYPES[selectedRef.current];
          const blocked = isPathCell(x, y) || st.money < s.cost;
          const color = blocked ? "#ff5d5d" : s.color;
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = color;
          ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
          ctx.restore();
          if (!blocked) drawRange(x * CELL + CELL / 2, y * CELL + CELL / 2, s.range, s.color, true);
        }
      }

      const source = st.towers.find((t) => t.id === st.dragSourceId);
      st.towers.forEach((tower) => {
        const cx = tower.x * CELL + CELL / 2;
        const cy = tower.y * CELL + CELL / 2;

        if (st.dragActive && source && tower.id !== source.id && fusionFor(source.type, tower.type)) {
          ctx.save();
          ctx.globalAlpha = 0.5 + 0.3 * Math.sin(st.time * 0.008);
          const isTarget = st.dragTarget?.x === tower.x && st.dragTarget?.y === tower.y;
          ctx.strokeStyle = isTarget ? "#3ddc84" : "#ffd166";
          ctx.lineWidth = isTarget ? 4 : 2;
          ctx.beginPath();
          ctx.arc(cx, cy, CELL * 0.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // base pad
        ctx.save();
        ctx.shadowColor = tower.color;
        ctx.shadowBlur = tower.flash > 0 ? 16 : 6;
        ctx.fillStyle = "#151c2e";
        ctx.beginPath();
        ctx.arc(cx, cy, CELL * 0.44, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (st.inspectId === tower.id) {
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.15 * Math.sin(st.time * 0.006);
          ctx.strokeStyle = tower.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, CELL * (0.48 + 0.04 * Math.sin(st.time * 0.006)), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.strokeStyle = tower.color;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(cx, cy, CELL * 0.44, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        const tSprite = getTowerSprite(tower.type);
        ctx.save();
        ctx.translate(cx, cy);
        const recoil = tower.flash > 0 ? (tower.flash / 120) * 2.5 : 0;
        ctx.rotate(tower.angle + Math.PI / 2);
        ctx.translate(0, recoil);
        if (tSprite) {
          const size = CELL * 0.92;
          ctx.shadowColor = tower.color;
          ctx.shadowBlur = tower.flash > 0 ? 14 : 4;
          ctx.drawImage(tSprite, -size / 2, -size / 2, size, size);
          if (tower.flash > 0) {
            // muzzle flash at barrel tip
            ctx.globalAlpha = tower.flash / 120;
            const g = ctx.createRadialGradient(0, -size * 0.45, 0, 0, -size * 0.45, 7);
            g.addColorStop(0, "#ffffff");
            g.addColorStop(0.5, tower.color);
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -size * 0.45, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = tower.color;
          ctx.beginPath();
          ctx.roundRect(-2.5, -CELL * 0.46, 5, CELL * 0.46, 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, 0, CELL * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // level pips
        for (let i = 0; i < tower.level; i++) {
          ctx.fillStyle = "#ffd166";
          ctx.beginPath();
          ctx.arc(cx - CELL * 0.26 + i * 4.2, cy + CELL * 0.36, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      st.enemies.forEach((enemy) => {
        const es = ENEMY_TYPES[enemy.type];
        const frozen = enemy.frozen > 0;
        const r = CELL * enemy.size * 0.62;
        const sprite = getSprite(enemy.type);

        // ground shadow
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y + r * 0.55, r * 0.7, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // class aura
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = frozen ? "#49d6e8" : es.tint;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, r * 0.95, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        if (enemy.type === "flyer") ctx.rotate(enemy.angle);
        const bob = enemy.type === "flyer" ? Math.sin(st.time * 0.006 + enemy.id) * 1.5 : 0;
        ctx.shadowColor = frozen ? "#49d6e8" : es.tint;
        ctx.shadowBlur = frozen ? 14 : 8;
        if (sprite) {
          ctx.drawImage(sprite, -r, -r + bob, r * 2, r * 2);
        } else {
          ctx.fillStyle = es.tint;
          ctx.beginPath();
          ctx.arc(0, bob, r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        if (enemy.hurt > 0) {
          ctx.save();
          ctx.globalAlpha = (enemy.hurt / 160) * 0.5;
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, r * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (frozen) {
          ctx.save();
          ctx.strokeStyle = "#9bf0ff";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, r * 0.95, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        const bw = Math.max(CELL * 0.5, r * 1.6);
        const barY = enemy.y - r - (enemy.type === "titan" ? 11 : 7);
        const barH = enemy.type === "titan" ? 6 : 4;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(enemy.x - bw / 2, barY, bw, barH);
        ctx.fillStyle = hpPct > 0.5 ? "#3ddc84" : hpPct > 0.25 ? "#ffd166" : "#ff5d5d";
        ctx.fillRect(enemy.x - bw / 2, barY, bw * hpPct, barH);
        if (enemy.type === "titan") {
          ctx.fillStyle = "#ff3b7b";
          ctx.font = "800 7px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("TITAN", enemy.x, barY - 3);
        }
      });

      st.projectiles.forEach((p) => {
        const color = TOWER_TYPES[p.type].color;
        const ang = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        const beam = p.type === "sniper" || p.type === "railgun" || p.type === "glacier";
        const icy = p.type === "slow" || p.type === "cryoshot" || p.type === "blizzard";
        ctx.save();
        const trailLen = beam ? 26 : p.splashRadius > 0 ? 18 : 12;
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = color;
        ctx.lineWidth = beam ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(ang) * trailLen, p.y - Math.sin(ang) * trailLen);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        if (beam) {
          // energy lance with a bright core
          const len = 18;
          const g = ctx.createLinearGradient(-len, 0, 4, 0);
          g.addColorStop(0, "rgba(0,0,0,0)");
          g.addColorStop(1, color);
          ctx.strokeStyle = g;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-len, 0);
          ctx.lineTo(4, 0);
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(2, 0, 3.4, 1.4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.splashRadius > 0) {
          // mortar shell with smoke trail
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(-7, 0, 5, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#26304a";
          ctx.beginPath();
          ctx.ellipse(0, 0, 5, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(2.2, 0, 2.4, 2.4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (icy) {
          // ice shard
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(5, 0);
          ctx.lineTo(-3, 3);
          ctx.lineTo(-1.5, 0);
          ctx.lineTo(-3, -3);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.beginPath();
          ctx.arc(2, 0, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // tracer round
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-9, 0);
          ctx.lineTo(0, 0);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#fff8d6";
          ctx.beginPath();
          ctx.ellipse(1, 0, 3, 1.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      st.shockwaves.forEach((sw) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sw.life / sw.maxLife) * 0.8;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      st.particles.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      st.floatingTexts.forEach((ft) => {
        ctx.save();
        const alpha = Math.min(1, ft.life / 180, (ft.maxLife - ft.life) / 120);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = ft.color;
        ctx.font = `800 ${11 * ft.scale}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      if (st.dangerFlash > 0) {
        ctx.save();
        ctx.globalAlpha = (st.dangerFlash / 280) * 0.16;
        ctx.fillStyle = "#ff334f";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      if (st.paused) {
        ctx.save();
        ctx.fillStyle = "rgba(5,8,18,0.58)";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, W - 20, H - 20);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 24px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PAUSED", W / 2, H / 2 - 8);
        ctx.font = "600 10px system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fillText("Tap RESUME to continue", W / 2, H / 2 + 16);
        ctx.restore();
      }

      if (st.banner > 0) {
        const progress = 1 - st.banner / 1200;
        const alpha = Math.min(1, progress * 5, (st.banner / 1200) * 5);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = "rgba(8,12,24,0.78)";
        ctx.fillRect(W * 0.16, H * 0.43, W * 0.68, 54);
        ctx.strokeStyle = st.bannerColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(W * 0.16, H * 0.43, W * 0.68, 54);
        ctx.fillStyle = st.bannerColor;
        ctx.font = "900 25px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(st.bannerText, W / 2, H * 0.43 + 27);
        ctx.restore();
      }
    };

    let raf = 0;
    const loop = (time: number) => {
      if (!state.current.lastTime) state.current.lastTime = time;
      const dt = Math.min(time - state.current.lastTime, 50);
      state.current.lastTime = time;
      update(dt * speedRef.current);
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("pointerleave", handleLeave);
    };
  }, [fuseTowers, placeTower, showMessage]);

  const buildable = (Object.keys(TOWER_TYPES) as TowerType[]).filter((t) => TOWER_TYPES[t].buildable);
  const insSpec = inspected ? TOWER_TYPES[inspected.type] : null;
  const insUpCost = inspected ? upgradeCost(inspected) : 0;

  return (
    <div className="grid h-[100dvh] w-full grid-rows-[42px_minmax(0,1fr)_166px_42px] gap-1.5 overflow-hidden bg-background p-2 text-foreground">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="grid min-w-0 grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-gold/20 bg-muted px-2 py-1 shadow-sm">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Gold</div>
            <div className="text-sm font-bold text-gold">{money}</div>
          </div>
          <div className="rounded-lg border border-lives/20 bg-muted px-2 py-1 shadow-sm">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Lives</div>
            <div className="text-sm font-bold text-lives">{lives}</div>
          </div>
          <div className="rounded-lg border border-wave/20 bg-muted px-2 py-1 shadow-sm">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Wave</div>
            <div className="text-sm font-bold text-wave">{wave}{best > 0 ? ` · ${best}` : ""}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {[1, 2, 3, 5].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-md px-1.5 py-1.5 text-[11px] font-bold transition-all ${
                speed === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s}x
            </button>
          ))}
          <button
            onClick={togglePause}
            className={`rounded-md px-2 py-1.5 text-[10px] font-bold transition-all ${paused ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => setAutoStart((a) => !a)}
            aria-pressed={autoStart}
            className={`rounded-md px-2 py-1.5 text-[10px] font-bold transition-all ${
              autoStart
                ? "bg-gold text-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={COLS * CELL * SCALE}
          height={ROWS * CELL * SCALE}
          style={{ aspectRatio: `${COLS} / ${ROWS}` }}
          aria-label="Tower defense battlefield"
          className="h-full w-auto max-w-full touch-none rounded-lg border border-border bg-black/20 shadow-[0_0_40px_rgba(80,140,255,0.08)]"
        />
        {message && (
          <div className="pointer-events-none absolute inset-x-4 top-3 rounded-lg bg-accent/95 px-3 py-2 text-center text-xs font-semibold text-accent-foreground shadow">
            {message}
          </div>
        )}
      </div>

      <div className="grid min-h-0 grid-rows-[30px_minmax(0,1fr)] overflow-hidden rounded-lg border border-border bg-card p-1.5">
        <div className="grid grid-cols-3 gap-1" role="tablist" aria-label="Game controls">
          {(["build", "selected", "guide"] as ControlTab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={controlTab === tab}
              disabled={tab === "selected" && !inspected}
              onClick={() => setControlTab(tab)}
              className={`rounded-md text-[11px] font-bold capitalize ${controlTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} disabled:opacity-40`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="min-h-0 overflow-y-auto pt-1.5">
        {controlTab === "selected" && inspected && insSpec ? (
          <div className="px-0.5">
            <div className="flex items-center gap-2">
              <img src={TOWER_ART[inspected.type]} alt={insSpec.name} loading="lazy" width={48} height={48} className="h-7 w-7 shrink-0 object-contain" />
              <span className="truncate text-sm font-bold">{insSpec.name}</span>
              <span className="shrink-0 rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">Lv {inspected.level}</span>
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                dmg {inspected.damage} · rng {inspected.range.toFixed(1)} · {(1000 / inspected.fireRate).toFixed(2)}/s
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
              <span>Sell value {Math.round(inspected.invested * 0.6)}g</span>
              <span>•</span>
              <span>{insSpec.desc}</span>
              {inspected.level < MAX_LEVEL && <span className="ml-auto text-gold">Next: +{Math.max(1, Math.round(inspected.damage * 0.45))} dmg</span>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              <button
                onClick={upgrade}
                disabled={inspected.level >= MAX_LEVEL}
                className="rounded-md bg-primary px-2 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {inspected.level >= MAX_LEVEL ? "Max level" : `Upgrade ${insUpCost}g`}
              </button>
              <button
                onClick={sell}
                className="rounded-md border border-border bg-muted px-1 py-2 text-[11px] font-bold text-foreground"
              >
                Sell {Math.round(inspected.invested * 0.6)}g
              </button>
              <div className="grid place-items-center rounded-md bg-muted px-1 text-center text-[9px] leading-tight text-muted-foreground">Drag onto a compatible tower · 75g</div>
            </div>
          </div>
        ) : controlTab === "guide" ? (
          <div className="grid grid-cols-2 gap-1 px-0.5 text-[9px] text-muted-foreground sm:grid-cols-3">
            {Object.entries(FUSIONS).map(([combo, result]) => (
              <div key={combo} className="grid grid-cols-[24px_minmax(0,1fr)] items-center gap-1 rounded-md bg-muted/60 p-1">
                <img src={TOWER_ART[result]} alt={TOWER_TYPES[result].name} loading="lazy" width={32} height={32} className="h-6 w-6 object-contain" />
                <span className="min-w-0"><b className="block truncate text-foreground">{TOWER_TYPES[result].name}</b>{combo.replace("+", " + ")}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {buildable.map((type) => {
              const s = TOWER_TYPES[type];
              const disabled = money < s.cost;
              return (
                <button
                  key={type}
                  onClick={() => { setSelectedTower(type); setControlTab("build"); }}
                  className={`flex flex-col items-center rounded-md border p-1 transition-all ${
                    selectedTower === type ? "border-primary bg-primary/10 ring-2 ring-primary/40" : "border-border bg-muted"
                  } ${disabled ? "opacity-50" : ""}`}
                >
                  <img src={TOWER_ART[type]} alt={s.name} loading="lazy" width={64} height={64} className="h-8 w-8 object-contain" />
                  <span className="text-[11px] font-semibold leading-tight">{s.name}</span>
                  <span className="text-[9px] text-muted-foreground">{s.cost}g · rng {s.range.toFixed(1)}</span>
                  <span className="text-[9px] font-semibold text-gold">vs {bestVs(type)}</span>
                </button>
              );
            })}
          </div>
        )}
        </div>
      </div>

      <button
        onClick={startWave}
        disabled={isPlaying}
        className="w-full rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors disabled:opacity-50"
      >
        {wave === 0 ? "Start Game" : isPlaying ? `Wave ${wave} — ${enemiesRemaining} left` : `Start Wave ${wave + 1}`}
      </button>
    </div>
  );
}
