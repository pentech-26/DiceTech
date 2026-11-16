// DiceTech · lanzador de dados 3D de PenTech
import * as THREE from './lib/three.min.js';
import { Mesa, PASO } from './fisica.js';
import { crear, sub, dot, cross, uni } from './dados.js';
import { T, IDIOMAS } from './textos.js';

const VERSION = 'v1.0';
const MAX_DADOS = 12;
const CORTO = 4;          // media anchura de la mesa en unidades: más bajo = dados más grandes
const BORDE = 7;          // px del marco de madera alrededor del fieltro
const $ = s => document.querySelector(s);
const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const lee = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const dpr = Math.min(window.devicePixelRatio || 1, 2);

function idiomaInicial() {
  const propio = lee('dicetech-idioma', null);
  if (propio && T[propio]) return propio;
  for (const k of ['ludoteca-idioma', 'catan-idioma', 'rw_idioma', 'agricola-idioma', 'wingspan-idioma']) {
    let v = null;
    try { v = localStorage.getItem(k); } catch (e) {}
    if (v) { v = v.replace(/"/g, ''); if (T[v]) return v; }
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return T[nav] ? nav : 'en';
}

/* ───────────── Estado ───────────── */
const ORDEN = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
const COLOR = {
  d4:  { base: '#a63d32', canto: '#cf6253', tinta: '#fff3df' },
  d6:  { base: '#ece3cc', canto: '#fffaf0', tinta: '#27221b' },
  d8:  { base: '#2f5f96', canto: '#5488c4', tinta: '#f3f7ff' },
  d10: { base: '#ece3cc', canto: '#fffaf0', tinta: '#27221b' },
  d00: { base: '#17362e', canto: '#2f6353', tinta: '#e6c67c' },
  d12: { base: '#6a4592', canto: '#9069bb', tinta: '#f6efff' },
  d20: { base: '#c08a2b', canto: '#e6b65c', tinta: '#241a08' }
};
COLOR.d100 = COLOR.d00;

let idioma = idiomaInicial(), t = T[idioma];
let tema = lee('dicetech-tema', 'auto');
let modo = lee('dicetech-modo', 'cth');
let hab = Math.max(1, Math.min(99, +lee('dicetech-habilidad', 50) || 50));
let libre = Object.assign({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 }, lee('dicetech-libre', {}));
let mod = +lee('dicetech-mod', 0) || 0;
let sonido = lee('dicetech-sonido', true);
let historial = lee('dicetech-historial-v1', []);
let enTapete = false, rodando = false, ultima = null;
let fase = 'vacio';        // vacio · agitando (cubilete) · rodando · quieto

/* ───────────── Sonido (sintetizado, sin archivos) ───────────── */
let ac = null, ruido = null, salida = null, rumorG = null;
const ultimoGolpe = { suelo: 0, pared: 0, dado: 0 };
const TONO = { d4: 1.3, d6: 1.12, d8: 1.15, d10: 1.02, d00: 1, d12: 0.93, d20: 0.88 };   // los grandes, más graves

function despiertaAudio() {
  if (!ac) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    ac = new A();
    ruido = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    salida = ac.createDynamicsCompressor();            // que muchos golpes a la vez no saturen
    salida.threshold.value = -16; salida.ratio.value = 5;
    salida.connect(ac.destination);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter();   // rumor de dados rodando sobre el fieltro
    src.buffer = ruido; src.loop = true;
    f.type = 'lowpass'; f.frequency.value = 340; f.Q.value = 0.6;
    rumorG = ac.createGain(); rumorG.gain.value = 0;
    src.connect(f); f.connect(rumorG); rumorG.connect(salida);
    src.start();
  }
  if (ac.state === 'suspended') ac.resume();
}
function rafaga(t0, tipo, freq, q, vol, dur) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = ruido; f.type = tipo; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(Math.max(0.0002, vol), t0);
  g.gain.exponentialRampToValueAtTime(0.0002, t0 + dur);
  s.connect(f); f.connect(g); g.connect(salida);
  s.start(t0, Math.random() * 0.8); s.stop(t0 + dur + 0.02);
}
function tono(t0, freq, vol, dur, forma = 'sine') {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = forma; o.frequency.setValueAtTime(freq, t0); o.frequency.exponentialRampToValueAtTime(freq * 0.82, t0 + dur);
  g.gain.setValueAtTime(Math.max(0.0002, vol), t0);
  g.gain.exponentialRampToValueAtTime(0.0002, t0 + dur);
  o.connect(g); g.connect(salida);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function golpe(v, contra, tipoDado) {
  if (!ac || !sonido || ac.state !== 'running') return;
  const t0 = ac.currentTime;
  if (t0 - ultimoGolpe[contra] < 0.016) return;
  ultimoGolpe[contra] = t0;
  const k = TONO[tipoDado] || 1, f = Math.pow(Math.min(1, v / 26), 1.15), r = () => 0.9 + Math.random() * 0.2;
  if (contra === 'suelo') {           // fieltro: golpe sordo y apagado
    rafaga(t0, 'lowpass', 700 * k * r(), 0.8, 0.6 * f, 0.07);
    tono(t0, 155 * k * r(), 0.3 * f, 0.06);
  } else if (contra === 'pared') {    // madera del borde: seco, con algo de cuerpo
    rafaga(t0, 'bandpass', 1500 * k * r(), 1.6, 0.55 * f, 0.045);
    tono(t0, 430 * k * r(), 0.3 * f, 0.09, 'triangle');
    tono(t0, 990 * k * r(), 0.12 * f, 0.05);
  } else {                            // dado contra dado: clic agudo de resina
    rafaga(t0, 'highpass', 2600, 0.7, 0.32 * f, 0.025);
    tono(t0, 3000 * k * r(), 0.17 * f, 0.04);
    tono(t0, 4700 * k * r(), 0.08 * f, 0.025);
  }
}
function rumor(n) { if (rumorG) rumorG.gain.setTargetAtTime(sonido ? n : 0, ac.currentTime, 0.06); }

/* ───────────── Escena 3D del tapete ───────────── */
const lienzo = $('#lienzo');
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const escena = new THREE.Scene();
const FOV = 30;
const camara = new THREE.PerspectiveCamera(FOV, 1, 1, 120);
camara.up.set(0, 0, -1);
escena.add(new THREE.HemisphereLight(0xfff6e6, 0x2a3a34, 1.25));
const sol = new THREE.DirectionalLight(0xffffff, 2.3);
sol.position.set(-5, 17, 7);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 2048);
sol.shadow.bias = -0.0006;
sol.shadow.normalBias = 0.02;
escena.add(sol);
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.45 }));
suelo.rotation.x = -Math.PI / 2;
suelo.receiveShadow = true;
escena.add(suelo);

const mesa = new Mesa();
mesa.alChocar = golpe;
let mallas = [];
const piezas = {};

function pieza(tipo) {
  if (piezas[tipo]) return piezas[tipo];
  const def = crear(tipo), col = COLOR[tipo];
  const n = def.caras.length, cols = Math.ceil(Math.sqrt(n)), filas = Math.ceil(n / cols), P = 200;
  const cv = document.createElement('canvas');
  cv.width = cols * P; cv.height = filas * P;
  const g = cv.getContext('2d');
  g.fillStyle = col.base; g.fillRect(0, 0, cv.width, cv.height);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const pos = [], nor = [], uv = [];
  const fuente = px => `700 ${Math.round(px)}px Cinzel, Georgia, serif`;
  const polo = def.lados === 10 ? Math.max(...def.verts.map(v => Math.abs(v[1]))) : 0;

  def.caras.forEach((c, i) => {
    const cx = (i % cols + 0.5) * P, cy = (Math.floor(i / cols) + 0.5) * P;
    const V = c.idx.map(k => def.verts[k]);
    // hacia dónde mira la parte de arriba del número
    let hacia = V[0];
    if (tipo === 'd6') hacia = [(V[0][0] + V[1][0]) / 2, (V[0][1] + V[1][1]) / 2, (V[0][2] + V[1][2]) / 2];
    if (def.lados === 10) hacia = V.find(v => Math.abs(Math.abs(v[1]) - polo) < 1e-6);
    let up = sub(hacia, c.centro);
    up = uni(sub(up, [c.normal[0] * dot(up, c.normal), c.normal[1] * dot(up, c.normal), c.normal[2] * dot(up, c.normal)]));
    const der = cross(up, c.normal);
    const p2 = V.map(v => { const r = sub(v, c.centro); return [dot(r, der), dot(r, up)]; });
    const R = Math.max(...p2.map(p => Math.hypot(p[0], p[1])));
    const k = (P * 0.5 * 0.92) / R;
    const px = p2.map(p => [cx + p[0] * k, cy - p[1] * k]);
    let inr = Infinity;                                   // radio inscrito, para el tamaño del número
    for (let j = 0; j < p2.length; j++) {
      const a = p2[j], b = p2[(j + 1) % p2.length], ex = b[0] - a[0], ey = b[1] - a[1];
      inr = Math.min(inr, Math.abs(a[0] * ey - a[1] * ex) / Math.hypot(ex, ey));
    }
    inr *= k;
    // cara con el canto algo más claro, para que se lean las aristas
    g.beginPath(); px.forEach((p, j) => j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    g.fillStyle = col.base; g.fill();
    g.lineJoin = 'round'; g.lineWidth = P * 0.045; g.strokeStyle = col.canto; g.stroke();
    g.fillStyle = col.tinta;
    if (tipo === 'd4') {
      g.font = fuente(inr * 0.82);
      c.idx.forEach((vi, j) => {                          // en el d4 manda el vértice de arriba
        const d = p2[j], m = Math.hypot(d[0], d[1]);
        g.save();
        g.translate(cx + d[0] * k * 0.5, cy - d[1] * k * 0.5);
        g.rotate(Math.atan2(d[0] / m, d[1] / m));
        g.fillText(String(def.valores[vi]), 0, 0);
        g.restore();
      });
    } else {
      const v = def.valores[i];
      const txt = tipo === 'd00' ? (v ? v + '0' : '00') : String(v);
      const tam = def.lados === 10 ? inr * (txt.length > 1 ? 1.12 : 1.62)       // la cometa del d10 es estrecha: números más grandes
        : inr * (txt.length > 1 ? 1.02 : 1.3);
      g.font = fuente(tam);
      const baja = def.lados === 10 ? inr * 0.2 : (c.idx.length === 3 ? inr * 0.06 : 0);   // en cometas y triángulos, un poco hacia la parte ancha
      g.fillText(txt, cx, cy + baja + tam * 0.04);
      if (def.lados >= 10 && tipo !== 'd00' && (v === 6 || v === 9)) {
        const w = g.measureText(txt).width;
        g.fillRect(cx - w * 0.42, cy + baja + tam * 0.47, w * 0.84, Math.max(4, tam * 0.1));   // raya del 6 y el 9
      }
    }
    for (let j = 1; j < V.length - 1; j++) {
      for (const q of [0, j, j + 1]) {
        pos.push(V[q][0], V[q][1], V[q][2]);
        nor.push(c.normal[0], c.normal[1], c.normal[2]);
        uv.push(px[q][0] / cv.width, 1 - px[q][1] / cv.height);
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.04 });
  return (piezas[tipo] = { geo, mat });
}


function ajusta() {
  const w = lienzo.clientWidth, h = lienzo.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  const asp = w / h;
  const hw = asp < 1 ? CORTO : CORTO * asp, hd = asp < 1 ? CORTO / asp : CORTO;
  camara.aspect = asp;
  camara.position.set(0, hd / Math.tan(FOV * Math.PI / 360), 0);
  camara.lookAt(0, 0, 0);
  camara.updateProjectionMatrix();
  const s = sol.shadow.camera;
  s.left = -hw - 3; s.right = hw + 3; s.top = hd + 3; s.bottom = -hd - 3; s.near = 1; s.far = 60;
  s.updateProjectionMatrix();
  const u = hw / (w / 2);                    // unidades por píxel
  // paredes en el borde del fieltro; un poco hacia dentro porque la perspectiva abre los dados hacia fuera
  mesa.limites((w / 2 - BORDE) * u * 0.93, (h / 2 - BORDE) * u * 0.955);
  pinta();
}

function pinta() {
  for (const m of mallas) {
    const b = m.dado.cuerpo;
    m.malla.position.set(b.position.x, b.position.y, b.position.z);
    m.malla.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
  }
  renderer.render(escena, camara);
}

let previo = 0, resto = 0;
function cuadro(ts) {
  if (!rodando) return;
  resto += Math.min(0.05, (ts - previo) / 1000 || 0);
  previo = ts;
  const ahora = performance.now();
  while (resto >= PASO && rodando) {
    resto -= PASO;
    if (fase === 'agitando') {
      if (ahora - acc.t < 90) mesa.zarandea(acc.x, acc.y, acc.z, PASO);   // solo con datos recientes del sensor
      mesa.paso();
    } else if (mesa.paso()) rodando = false;
  }
  if (fase === 'agitando' && ahora - fuerteUlt > 380 && ahora - inicioAgite > 300) {   // se ha dejado de agitar: ¡salen!
    mesa.suelta();
    fase = 'rodando';
  }
  let s = 0;                                // el rumor sube con lo que ruedan los dados apoyados
  for (const d of mesa.dados) {
    const b = d.cuerpo;
    if (b.position.y < d.def.radio * 1.3) s += Math.hypot(b.velocity.x, b.velocity.z) + b.angularVelocity.length() * 0.25;
  }
  rumor(Math.min(0.16, s / 230));
  pinta();
  if (rodando) requestAnimationFrame(cuadro); else fin();
}

/* ───────────── Tiradas ───────────── */
const sinMov = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const totalDados = () => ORDEN.reduce((s, k) => s + libre[k] * (k === 'd100' ? 2 : 1), 0);

function tiposTirada() {
  if (modo === 'cth') return ['d00', 'd10'];
  const tipos = [];
  for (const k of ORDEN) for (let i = 0; i < libre[k]; i++) k === 'd100' ? tipos.push('d00', 'd10') : tipos.push(k);
  return tipos;
}

function limpiaMesa() {
  for (const m of mallas) escena.remove(m.malla);
  mallas = [];
  mesa.vacia();
  pinta();
}

function tirar(fuerza) {
  if (rodando || !enTapete) return;
  despiertaAudio();
  const tipos = tiposTirada();
  if (!tipos.length) return;
  tiposMesa = tipos.join(',');
  for (const m of mallas) escena.remove(m.malla);
  mallas = mesa.lanzar(tipos, typeof fuerza === 'number' ? fuerza : 1).map(dado => {
    const p = pieza(dado.tipo), malla = new THREE.Mesh(p.geo, p.mat);
    malla.castShadow = true;
    escena.add(malla);
    return { dado, malla };
  });
  ultima = { pendiente: true, m: modo, h: hab, mod };
  rodando = true; fase = 'rodando';
  $('#pista').classList.add('fuera');
  $('#resT').classList.remove('ver');
  $('#btnRepetir').hidden = true;
  if (sinMov()) {
    let s = 0;
    while (!mesa.paso() && s++ < 2000) {}
    rodando = false; pinta(); fin();
  } else { previo = performance.now(); resto = 0; requestAnimationFrame(cuadro); }
}

let tiposMesa = '';
function empiezaCubilete() {
  despiertaAudio();
  const tipos = tiposTirada();
  if (!tipos.length) return;
  const clave = tipos.join(',');
  if (fase === 'quieto' && mesa.dados.length && clave === tiposMesa) mesa.agitaOtraVez();   // se recogen los mismos dados
  else {
    for (const m of mallas) escena.remove(m.malla);
    mallas = mesa.prepara(tipos).map(dado => {
      const p = pieza(dado.tipo), malla = new THREE.Mesh(p.geo, p.mat);
      malla.castShadow = true;
      escena.add(malla);
      return { dado, malla };
    });
  }
  tiposMesa = clave;
  ultima = { pendiente: true, m: modo, h: hab, mod };
  fase = 'agitando'; rodando = true;
  inicioAgite = performance.now();
  $('#pista').classList.add('fuera');
  $('#resT').classList.remove('ver');
  $('#btnRepetir').hidden = true;
  previo = performance.now(); resto = 0; requestAnimationFrame(cuadro);
}

function nivelCth(r, h) {               // ediciones anteriores a la 7.ª
  if (r === 1) return 'critico';        // 01 siempre acierta
  if (r === 100) return 'pifia';        // 00 siempre falla
  if (r <= Math.floor(h / 5)) return 'especial';
  return r <= h ? 'exito' : 'fallo';
}

function fin() {
  rumor(0);
  if (!enTapete) return;
  fase = 'quieto';
  const ds = mesa.dados, grupos = [];
  for (let i = 0; i < ds.length; i++) {
    if (ds[i].tipo === 'd00') { const r = ds[i].valor * 10 + ds[i + 1].valor; grupos.push(['d100', r === 0 ? 100 : r]); i++; }
    else grupos.push([ds[i].tipo, ds[i].tipo === 'd10' && ds[i].valor === 0 ? 10 : ds[i].valor]);
  }
  const reg = { f: Date.now(), m: ultima.m };
  if (reg.m === 'cth') { reg.r = grupos[0][1]; reg.h = ultima.h; reg.n = nivelCth(reg.r, reg.h); }
  else { reg.g = grupos; reg.mod = ultima.mod; reg.r = grupos.reduce((s, x) => s + x[1], 0) + ultima.mod; }
  ultima = reg;
  historial.unshift(reg);
  historial = historial.slice(0, 100);
  guarda('dicetech-historial-v1', historial);
  ultimoFin = performance.now();
  pintaResultado();
  $('#btnRepetir').hidden = false;
  if (navigator.vibrate) { try { navigator.vibrate(reg.n === 'pifia' || reg.n === 'critico' ? [40, 60, 40] : 25); } catch (e) {} }
}

const cifra = r => String(r === 100 ? '00' : r).padStart(2, '0');

function desglose(reg) {
  const por = {};
  for (const [k, v] of reg.g) (por[k] = por[k] || []).push(v);
  let s = ORDEN.filter(k => por[k]).map(k => `${por[k].length > 1 ? por[k].length : ''}${k} (${por[k].join(', ')})`).join(' + ');
  if (reg.mod) s += (reg.mod > 0 ? ' + ' : ' − ') + Math.abs(reg.mod);
  return s;
}

function pintaResultado() {
  const box = $('#resT');
  box.removeAttribute('data-n');
  if (!ultima || ultima.pendiente) { box.classList.remove('ver'); return; }
  $('#resN').textContent = ultima.m === 'cth' ? cifra(ultima.r) : ultima.r;
  if (ultima.m === 'cth') {
    box.dataset.n = ultima.n;
    $('#resNiv').textContent = t[ultima.n];
    $('#resNiv').hidden = false;
    $('#resDet').textContent = t.umbral.replace('{h}', ultima.h).replace('{e}', cifra(Math.max(1, Math.floor(ultima.h / 5))));
  } else {
    $('#resNiv').hidden = true;
    $('#resDet').textContent = desglose(ultima);
  }
  $('#resOtra').textContent = agitaActivo() ? t.otraAgita : t.otraToca;
  $('#pista').classList.add('fuera');
  // la tarjeta se pone donde no tape dados: abajo por defecto, arriba si abajo hay más
  const alto = lienzo.clientHeight, v = new THREE.Vector3();
  let abajo = 0, arriba = 0;
  for (const m of mallas) {
    v.copy(m.malla.position).project(camara);
    const y = (1 - v.y) / 2 * alto;
    if (y > alto - 300) abajo++;
    if (y < 230) arriba++;
  }
  box.classList.toggle('arriba', abajo > arriba);
  box.classList.remove('ver'); void box.offsetWidth; box.classList.add('ver');
}

/* ───────────── Pantallas ───────────── */
function abreTapete() {
  cierraMenus();
  if (modo === 'libre' && !totalDados()) return aviso(t.eligeDados);
  despiertaAudio();
  if (puedeAgitar && agitar !== false && !escucha && !denegado) activaAgitar(false);   // el permiso del iPhone sale de este toque
  enTapete = true;
  ultima = null; fase = 'vacio';
  $('#tapete').classList.add('abierto');
  document.body.classList.add('en-tapete');
  document.querySelector('meta[name="theme-color"]').content = '#2a1a0e';
  try { history.pushState({ tapete: 1 }, ''); } catch (e) {}
  aTapete = performance.now();
  $('#resT').classList.remove('ver');
  $('#btnRepetir').hidden = true;
  ajusta();
  limpiaMesa();
  pintaPista();
  paraMinis();
}

function cierraTapete() {
  if (!enTapete) return;
  enTapete = false; rodando = false; fase = 'vacio'; rumor(0);
  $('#tapete').classList.remove('abierto');
  document.body.classList.remove('en-tapete');
  limpiaMesa();
  pintaTema();
  arrancaMinis();
}

function pintaPista() {
  const p = $('#pista');
  p.textContent = agitaActivo() ? t.pistaAgita : t.pistaToca;
  p.classList.toggle('fuera', !enTapete || rodando || mallas.length > 0);
}

/* ───────────── Agitar el móvil ───────────── */
const puedeAgitar = 'DeviceMotionEvent' in window && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
const pidePermiso = puedeAgitar && typeof DeviceMotionEvent.requestPermission === 'function';   // iPhone
let agitar = lee('dicetech-agitar', null);      // true, false o null (sin decidir)
let escucha = false, denegado = false, ultimoFin = 0, aTapete = 0, golpes = [];
const agitaActivo = () => puedeAgitar && !denegado && agitar === true && escucha;

let acc = { x: 0, y: 0, z: 0, t: 0 }, fuerteUlt = 0, inicioAgite = 0, gBaja = null;
function alMover(e) {
  if (!agitar || !enTapete || document.hidden || $('#velo').classList.contains('abierto')) return;
  let x, y, z;
  const a = e.acceleration;
  if (a && a.x != null) { x = a.x; y = a.y; z = a.z; }
  else {                                                     // sin "acceleration": se quita la gravedad con un filtro
    const g = e.accelerationIncludingGravity;
    if (!g || g.x == null) return;
    if (!gBaja) gBaja = { x: g.x, y: g.y, z: g.z };
    gBaja.x += (g.x - gBaja.x) * 0.1; gBaja.y += (g.y - gBaja.y) * 0.1; gBaja.z += (g.z - gBaja.z) * 0.1;
    x = g.x - gBaja.x; y = g.y - gBaja.y; z = g.z - gBaja.z;
  }
  const m = Math.hypot(x, y, z), ahora = performance.now();
  if (fase === 'agitando') {                                 // los dados siguen al móvil
    acc = { x, y, z, t: ahora };
    if (m > 6) fuerteUlt = ahora;
    return;
  }
  if (fase === 'rodando' || ahora - ultimoFin < 600 || ahora - aTapete < 400) return;
  golpes = golpes.filter(g => ahora - g < 450);
  if (m < 12) return;
  if (!golpes.length || ahora - golpes[golpes.length - 1] > 60) golpes.push(ahora);
  if (golpes.length >= 2) {                                  // dos sacudidas seguidas: empieza el cubilete
    golpes = [];
    acc = { x, y, z, t: ahora }; fuerteUlt = ahora;
    empiezaCubilete();
  }
}

function activaAgitar(desdeBoton) {
  if (!puedeAgitar || denegado) return;
  const listo = () => {
    agitar = true; guarda('dicetech-agitar', true);
    if (!escucha) { window.addEventListener('devicemotion', alMover); escucha = true; }
    pintaAgitar(true); pintaPista();
  };
  if (!pidePermiso) return listo();
  let p;
  try { p = DeviceMotionEvent.requestPermission(); } catch (e) { return; }      // tiene que salir de un toque
  p.then(r => {
    if (r === 'granted') return listo();
    denegado = true; pintaAgitar(); pintaPista();
    if (desdeBoton) aviso(t.agitaDenegado);
  }).catch(() => {});
}

function pintaAgitar(saluda) {
  const activo = agitaActivo(), b = $('#btnAgitar');
  document.body.classList.toggle('agita', activo || (puedeAgitar && !denegado && agitar === null && pidePermiso));
  b.hidden = !puedeAgitar || denegado;
  b.classList.toggle('off', !activo);
  b.innerHTML = ICONO.movil;
  b.setAttribute('aria-label', activo ? t.agitarSi : t.agitarNo);
  if (activo && saluda) {
    const ico = $('#icoAgita');
    ico.classList.remove('menea'); void ico.getBoundingClientRect(); ico.classList.add('menea');
  }
}

/* ───────────── Dados en miniatura del selector ───────────── */
const miniR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
const MINI = 84;
miniR.setPixelRatio(dpr);
miniR.setSize(MINI, MINI, false);
const miniS = new THREE.Scene();
miniS.add(new THREE.HemisphereLight(0xfff6e6, 0x40504a, 1.35));
const miniL = new THREE.DirectionalLight(0xffffff, 2.2);
miniL.position.set(-2, 3, 5);
miniS.add(miniL);
const miniC = new THREE.PerspectiveCamera(30, 1, 1, 30);
miniC.position.set(0, 0, 5.4);
let minis = [], miniVivo = false, miniPrevio = 0;

function creaMinis() {
  document.querySelectorAll('canvas[data-mini]').forEach(cv => {
    const k = cv.dataset.mini, tipos = k === 'cth' || k === 'd100' ? ['d00', 'd10'] : [k];
    const g = new THREE.Group();
    tipos.forEach((tp, i) => {
      const p = pieza(tp), m = new THREE.Mesh(p.geo, p.mat);
      if (tipos.length > 1) { m.scale.setScalar(0.66); m.position.set(i ? 0.8 : -0.8, i ? -0.18 : 0.18, 0); m.rotation.set(i * 1.3, i * 0.7, 0); }
      g.add(m);
    });
    g.visible = false;
    miniS.add(g);
    cv.width = MINI * dpr; cv.height = MINI * dpr;
    minis.push({ cv, ctx: cv.getContext('2d'), g, k, ang: Math.random() * 6, empuje: 0 });
  });
  arrancaMinis();
}
function giraMini(k) { for (const m of minis) if (m.k === k) m.empuje = 11; }
function arrancaMinis() { if (!miniVivo && minis.length && !enTapete) { miniVivo = true; miniPrevio = performance.now(); requestAnimationFrame(cuadroMinis); } }
function paraMinis() { miniVivo = false; }
function cuadroMinis(ts) {
  if (!miniVivo) return;
  const dt = Math.min(0.1, (ts - miniPrevio) / 1000);
  if (dt >= 1 / 40 && !document.hidden) {          // a 30-40 fps basta
    miniPrevio = ts;
    for (const m of minis) {
      m.ang += dt * (0.55 + m.empuje);
      m.empuje *= Math.pow(0.04, dt);
      m.g.rotation.set(0.55 + Math.sin(m.ang * 0.5) * 0.25, m.ang, 0.15);
      for (const o of minis) o.g.visible = o === m;
      miniR.render(miniS, miniC);
      m.ctx.clearRect(0, 0, m.cv.width, m.cv.height);
      m.ctx.drawImage(miniR.domElement, 0, 0, m.cv.width, m.cv.height);
    }
  }
  requestAnimationFrame(cuadroMinis);
}

/* ───────────── Selector ───────────── */
const ICONO = {
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.500"/><path d="M12 3.500a8.500 8.500 0 0 1 0 17z" fill="currentColor"/></svg>',
  dia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.200"/><path d="M12 2.500v2.300M12 19.200v2.300M2.500 12h2.300M19.200 12h2.300M5.300 5.300l1.600 1.600M17.100 17.100l1.600 1.600M5.300 18.700l1.600-1.600M17.100 6.900l1.600-1.600"/></svg>',
  noche: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M20 14.500A8.500 8.500 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500z"/></svg>',
  son: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z"/><path d="M15.500 9a4.500 4.500 0 0 1 0 6M18 6.500a8 8 0 0 1 0 11"/></svg>',
  mudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z"/><path d="M16 9.500l5 5M21 9.500l-5 5"/></svg>',
  movil: '<svg viewBox="0 0 30 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="2.500" width="10" height="19" rx="2.400"/><path d="M13.500 18h3M5.500 8.500c-1.300 2.200-1.300 4.800 0 7M24.500 8.500c1.300 2.200 1.300 4.800 0 7"/></svg>'
};

function construyeRejilla() {
  $('#rejilla').innerHTML = ORDEN.map(k =>
    `<div class="celda dado" data-d="${k}" role="button"><button class="menos" data-menos="${k}" aria-label="−">−</button><canvas data-mini="${k}"></canvas><span class="nom">${k}</span><span class="cuenta"></span></div>`).join('') +
    `<div class="celda mod"><div class="modTxt" id="modTxt"></div><button class="paso mini" data-mod="-1" style="grid-row:2;grid-column:1">−</button><span id="modVal"></span><button class="paso mini" data-mod="1" style="grid-row:2;grid-column:3">+</button></div>`;
}

function pintaSelector() {
  $('#cth').classList.toggle('activa', modo === 'cth');
  $('#rejilla').classList.toggle('apagada', modo === 'cth');
  $('#hab').value = hab;
  $('#modVal').textContent = (mod >= 0 ? '+' : '−') + Math.abs(mod);
  document.querySelectorAll('.celda.dado').forEach(c => {
    const n = libre[c.dataset.d];
    c.classList.toggle('con', n > 0);
    c.querySelector('.cuenta').textContent = n;
  });
  let txt;
  if (modo === 'cth') txt = `${t.tuTirada}: <b>d100</b> · ${t.habilidad} <b>${hab} %</b>`;
  else if (!totalDados()) txt = `<span style="color:var(--tenue)">${t.sinDados}</span>`;
  else {
    txt = ORDEN.filter(k => libre[k]).map(k => `<b>${libre[k] > 1 ? libre[k] : ''}${k}</b>`).join(' + ');
    if (mod) txt += ` ${mod > 0 ? '+' : '−'} <b>${Math.abs(mod)}</b>`;
    txt = `${t.tuTirada}: ${txt}`;
  }
  $('#resumen').innerHTML = txt;
  $('#btnVaciar').hidden = modo === 'cth' || (!totalDados() && !mod);
}

function aplicaIdioma() {
  t = T[idioma];
  document.documentElement.lang = idioma;
  $('#cthT').textContent = 'Cthulhu';
  $('#cthS').textContent = `d100 · ${t.habilidad}`;
  $('#separa').textContent = t.elige;
  $('#modTxt').textContent = t.mod;
  $('#btnVaciar').textContent = t.vaciar;
  $('#txtLanzar').textContent = t.lanzar;
  $('#txtHist').textContent = t.historial;
  $('#txtVolver').textContent = t.volver;
  $('#txtRepetir').textContent = t.repetir;
  $('#btnLegal').textContent = `${t.legal} · ${VERSION}`;
  $('#gira').textContent = t.gira;
  $('#menuIdioma').innerHTML = Object.keys(IDIOMAS).map(k => `<button data-idioma="${k}" class="${k === idioma ? 'activo' : ''}">${IDIOMAS[k]}</button>`).join('');
  pintaTema(); pintaAgitar(); pintaSelector(); pintaPista();
  if (enTapete && ultima && !ultima.pendiente) pintaResultado();
}

const oscuro = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function pintaTema() {
  const real = tema === 'auto' ? (oscuro && !oscuro.matches ? 'dia' : 'noche') : tema;
  document.documentElement.dataset.tema = real;
  if (!enTapete) document.querySelector('meta[name="theme-color"]').content = real === 'dia' ? '#ece3cf' : '#0d1614';
  $('#btnTema').innerHTML = ICONO[tema];
  $('#menuTema').innerHTML = ['auto', 'dia', 'noche'].map(k => `<button data-tema="${k}" class="${k === tema ? 'activo' : ''}">${ICONO[k]}${t[k]}</button>`).join('');
  $('#btnSonido').innerHTML = sonido ? ICONO.son : ICONO.mudo;
}
if (oscuro && oscuro.addEventListener) oscuro.addEventListener('change', pintaTema);

function cierraMenus() { document.querySelectorAll('.menu').forEach(m => m.classList.remove('abierto')); }
function alternaMenu(id) { const m = $(id), ab = m.classList.contains('abierto'); cierraMenus(); if (!ab) m.classList.add('abierto'); }

let relojAviso = 0;
function aviso(txt) {
  const a = $('#aviso'); a.textContent = txt; a.classList.add('ver');
  clearTimeout(relojAviso); relojAviso = setTimeout(() => a.classList.remove('ver'), 1800);
}

function abreHoja(titulo, html, botones) {
  $('#hojaT').textContent = titulo; $('#hojaC').innerHTML = html;
  $('#hojaB').innerHTML = botones.map(b => `<button data-acc="${b[0]}" class="${b[2] ? 'pral' : ''}">${b[1]}</button>`).join('');
  $('#velo').classList.add('abierto');
}
function cierraHoja() { $('#velo').classList.remove('abierto'); }

function abreHistorial() {
  const hora = f => new Date(f).toLocaleTimeString(idioma, { hour: '2-digit', minute: '2-digit' });
  const html = historial.length ? historial.map(r => r.m === 'cth'
    ? `<div class="tir" data-n="${r.n}"><div class="n">${cifra(r.r)}</div><div class="d">${t[r.n]}<small>${hora(r.f)} · Cthulhu · ${r.h} %</small></div></div>`
    : `<div class="tir"><div class="n">${r.r}</div><div class="d">${desglose(r)}<small>${hora(r.f)}</small></div></div>`).join('')
    : `<p style="text-align:center;color:var(--tenue);padding:18px 0">${t.sinTiradas}</p>`;
  abreHoja(t.historial, html, historial.length ? [['borrar', t.borrar], ['cerrar', t.cerrar, 1]] : [['cerrar', t.cerrar, 1]]);
}

function cambiaHab(d) {
  hab = Math.max(1, Math.min(99, hab + d));
  guarda('dicetech-habilidad', hab);
  if (modo !== 'cth') { modo = 'cth'; guarda('dicetech-modo', modo); }
  pintaSelector();
}

/* ───────────── Eventos ───────────── */
construyeRejilla();

// botones de habilidad: un toque suma uno; si se mantiene, repite cada vez más rápido
let relojRep = 0;
function paraRep() { clearTimeout(relojRep); relojRep = 0; }
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-hab]');
  if (!b) return;
  e.preventDefault();
  const d = +b.dataset.hab;
  cambiaHab(d);
  let espera = 380;
  const sigue = () => { cambiaHab(d); espera = Math.max(45, espera * 0.8); relojRep = setTimeout(sigue, espera); };
  relojRep = setTimeout(sigue, espera);
});
['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach(ev => document.addEventListener(ev, paraRep, true));

document.addEventListener('click', e => {
  if (agitar === true && !escucha && !denegado) activaAgitar();      // en iPhone el permiso se renueva con el primer toque
  const el = e.target.closest('button, .celda.dado, #cth, #tapete, #velo');
  if (!el) return cierraMenus();
  if (el.id === 'btnIdioma') return alternaMenu('#menuIdioma');
  if (el.id === 'btnTema') return alternaMenu('#menuTema');
  if (el.dataset.idioma) { idioma = el.dataset.idioma; guarda('dicetech-idioma', idioma); cierraMenus(); return aplicaIdioma(); }
  if (el.dataset.tema) { tema = el.dataset.tema; guarda('dicetech-tema', tema); cierraMenus(); return pintaTema(); }
  cierraMenus();
  if (el.dataset.hab) return;                                         // ya lo lleva pointerdown
  if (el.id === 'btnVolver') { if (history.state && history.state.tapete) history.back(); else cierraTapete(); return; }
  if (el.id === 'btnRepetir') return tirar();
  if (el.id === 'tapete') return tirar();                             // tocar el tapete también lanza
  if (el.dataset.menos) {
    const k = el.dataset.menos;
    if (libre[k] > 0) libre[k]--;
    modo = 'libre'; guarda('dicetech-modo', modo); guarda('dicetech-libre', libre);
    return pintaSelector();
  }
  if (el.dataset.d) {
    const k = el.dataset.d;
    modo = 'libre'; guarda('dicetech-modo', modo);
    if (totalDados() + (k === 'd100' ? 2 : 1) > MAX_DADOS) { pintaSelector(); return aviso(t.maxDados.replace('{n}', MAX_DADOS)); }
    libre[k]++; guarda('dicetech-libre', libre); giraMini(k);
    return pintaSelector();
  }
  if (el.dataset.mod) {
    mod = Math.max(-99, Math.min(99, mod + +el.dataset.mod)); guarda('dicetech-mod', mod);
    modo = 'libre'; guarda('dicetech-modo', modo);
    return pintaSelector();
  }
  if (el.id === 'cth') { if (e.target.id !== 'hab') { modo = 'cth'; guarda('dicetech-modo', modo); giraMini('cth'); pintaSelector(); } return; }
  if (el.id === 'btnVaciar') { for (const k of ORDEN) libre[k] = 0; mod = 0; guarda('dicetech-libre', libre); guarda('dicetech-mod', 0); return pintaSelector(); }
  if (el.id === 'btnLanzar') return abreTapete();
  if (el.id === 'btnHist') return abreHistorial();
  if (el.id === 'btnSonido') { sonido = !sonido; guarda('dicetech-sonido', sonido); if (sonido) despiertaAudio(); return pintaTema(); }
  if (el.id === 'btnAgitar') {
    if (agitaActivo()) { agitar = false; guarda('dicetech-agitar', false); return pintaAgitar(); }
    return activaAgitar(true);
  }
  if (el.id === 'btnLegal') return abreHoja(t.legal, t.textoLegal.map(p => `<p>${p}</p>`).join('') + '<p style="color:var(--tenue)">DiceTech · ' + VERSION + ' · by PenTech</p>', [['cerrar', t.cerrar, 1]]);
  if (el.dataset.acc === 'cerrar' || (el.id === 'velo' && e.target === el)) return cierraHoja();
  if (el.dataset.acc === 'borrar') { historial = []; guarda('dicetech-historial-v1', historial); return abreHistorial(); }
});
$('#hab').addEventListener('change', () => {
  hab = Math.max(1, Math.min(99, Math.round(+$('#hab').value) || 1));
  guarda('dicetech-habilidad', hab);
  modo = 'cth'; guarda('dicetech-modo', modo);
  pintaSelector();
});
$('#hab').addEventListener('focus', () => { $('#hab').select(); modo = 'cth'; pintaSelector(); });
$('#hab').addEventListener('keydown', e => { if (e.key === 'Enter') $('#hab').blur(); });
window.addEventListener('popstate', () => { if (enTapete) cierraTapete(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  cierraMenus();
  if ($('#velo').classList.contains('abierto')) cierraHoja(); else if (enTapete) $('#btnVolver').click();
});
document.addEventListener('contextmenu', e => { if (!e.target.closest('#hojaC, input')) e.preventDefault(); });
document.addEventListener('gesturestart', e => e.preventDefault());

/* ───────────── Arranque ───────────── */
(function fieltro() {                       // textura de fieltro generada: grano y fibras
  const c = document.createElement('canvas'), S = 256;
  c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() < 0.5 ? 0 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.random() * 18;
  }
  g.putImageData(img, 0, 0);
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const x = Math.random() * S, y = Math.random() * S, a = Math.random() * Math.PI, l = 2 + Math.random() * 6;
    g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)';
    g.lineWidth = 0.6 + Math.random() * 0.7;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  $('#fieltro').style.setProperty('--ruido', `url(${c.toDataURL()})`);
})();

aplicaIdioma();
if (puedeAgitar && agitar !== false) activaAgitar();     // Android se activa solo; el iPhone espera a un toque
new ResizeObserver(() => { if (enTapete) ajusta(); }).observe(lienzo);
(document.fonts && document.fonts.load ? Promise.race([document.fonts.load('700 40px Cinzel'), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve())
  .catch(() => {}).then(creaMinis);
document.addEventListener('visibilitychange', () => { if (!document.hidden) arrancaMinis(); });
window.__dicetech = { mesa, tirar, abreTapete, estado: () => ({ enTapete, rodando, fase, ultima, n: mallas.length, agita: agitaActivo() }) };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
