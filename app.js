// DiceTech · lanzador de dados 3D de PenTech
import * as THREE from './lib/three.min.js';
import { Mesa, PASO } from './fisica.js';
import { crear, sub, dot, cross, uni } from './dados.js';

const VERSION = 'v1.0';
const MAX_DADOS = 12;
const $ = s => document.querySelector(s);
const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const lee = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };

/* ───────────── Textos ───────────── */
const T = {
  es: { cth: 'Cthulhu', libre: 'Libre', tirarD100: 'Tirar d100', tirar: 'Tirar', vaciar: 'Vaciar', mod: 'Modificador',
    pistaCth: 'Pon la habilidad y tira', pistaLibre: 'Elige los dados y tira', rodando: 'Rodando…',
    critico: '¡Crítico!', especial: 'Éxito especial', exito: 'Éxito', fallo: 'Fallo', pifia: '¡Pifia!',
    umbral: 'Habilidad {h} % · especial hasta {e}', historial: 'Historial', sinTiradas: 'Todavía no hay tiradas.',
    borrar: 'Borrar historial', cerrar: 'Cerrar', legal: 'Aviso legal', eligeDados: 'Añade algún dado',
    maxDados: 'Máximo {n} dados', gira: 'Gira el móvil', auto: 'Automático', dia: 'Modo día', noche: 'Modo noche',
    textoLegal: ['Lanzador de dados no oficial, creado de forma independiente por PenTech. No está afiliado, patrocinado ni aprobado por Chaosium Inc. ni por ninguna editorial.',
      'La Llamada de Cthulhu (Call of Cthulhu) es una marca registrada de Chaosium Inc. Para jugar necesitas el manual del juego.',
      'Usa las librerías three.js y cannon-es (licencia MIT) y las tipografías Cinzel e IM Fell English SC (licencia OFL).'] },
  ca: { cth: 'Cthulhu', libre: 'Lliure', tirarD100: 'Tirar d100', tirar: 'Tirar', vaciar: 'Buidar', mod: 'Modificador',
    pistaCth: 'Posa l’habilitat i tira', pistaLibre: 'Tria els daus i tira', rodando: 'Rodant…',
    critico: 'Crític!', especial: 'Èxit especial', exito: 'Èxit', fallo: 'Fallada', pifia: 'Pífia!',
    umbral: 'Habilitat {h} % · especial fins a {e}', historial: 'Historial', sinTiradas: 'Encara no hi ha tirades.',
    borrar: 'Esborrar historial', cerrar: 'Tancar', legal: 'Avís legal', eligeDados: 'Afegeix algun dau',
    maxDados: 'Màxim {n} daus', gira: 'Gira el mòbil', auto: 'Automàtic', dia: 'Mode dia', noche: 'Mode nit',
    textoLegal: ['Llançador de daus no oficial, creat de manera independent per PenTech. No està afiliat, patrocinat ni aprovat per Chaosium Inc. ni per cap editorial.',
      'La Crida de Cthulhu (Call of Cthulhu) és una marca registrada de Chaosium Inc. Per jugar necessites el manual del joc.',
      'Fa servir les llibreries three.js i cannon-es (llicència MIT) i les tipografies Cinzel i IM Fell English SC (llicència OFL).'] },
  en: { cth: 'Cthulhu', libre: 'Free', tirarD100: 'Roll d100', tirar: 'Roll', vaciar: 'Clear', mod: 'Modifier',
    pistaCth: 'Set the skill and roll', pistaLibre: 'Pick your dice and roll', rodando: 'Rolling…',
    critico: 'Critical!', especial: 'Special success', exito: 'Success', fallo: 'Failure', pifia: 'Fumble!',
    umbral: 'Skill {h}% · special up to {e}', historial: 'History', sinTiradas: 'No rolls yet.',
    borrar: 'Clear history', cerrar: 'Close', legal: 'Legal notice', eligeDados: 'Add some dice',
    maxDados: '{n} dice at most', gira: 'Rotate your phone', auto: 'Automatic', dia: 'Day mode', noche: 'Night mode',
    textoLegal: ['Unofficial dice roller, independently created by PenTech. Not affiliated with, sponsored or endorsed by Chaosium Inc. or any publisher.',
      'Call of Cthulhu is a registered trademark of Chaosium Inc. You need the game rulebook to play.',
      'Uses the three.js and cannon-es libraries (MIT licence) and the Cinzel and IM Fell English SC typefaces (OFL licence).'] },
  fr: { cth: 'Cthulhu', libre: 'Libre', tirarD100: 'Lancer le d100', tirar: 'Lancer', vaciar: 'Vider', mod: 'Modificateur',
    pistaCth: 'Réglez la compétence et lancez', pistaLibre: 'Choisissez les dés et lancez', rodando: 'Ça roule…',
    critico: 'Critique !', especial: 'Réussite spéciale', exito: 'Réussite', fallo: 'Échec', pifia: 'Maladresse !',
    umbral: 'Compétence {h} % · spéciale jusqu’à {e}', historial: 'Historique', sinTiradas: 'Aucun lancer pour l’instant.',
    borrar: 'Effacer l’historique', cerrar: 'Fermer', legal: 'Mentions légales', eligeDados: 'Ajoutez un dé',
    maxDados: '{n} dés au maximum', gira: 'Tournez le téléphone', auto: 'Automatique', dia: 'Mode jour', noche: 'Mode nuit',
    textoLegal: ['Lanceur de dés non officiel, créé de manière indépendante par PenTech. Il n’est ni affilié, ni sponsorisé, ni approuvé par Chaosium Inc. ou par un éditeur.',
      'L’Appel de Cthulhu (Call of Cthulhu) est une marque déposée de Chaosium Inc. Pour jouer, il vous faut le livre de règles.',
      'Utilise les bibliothèques three.js et cannon-es (licence MIT) et les polices Cinzel et IM Fell English SC (licence OFL).'] },
  de: { cth: 'Cthulhu', libre: 'Frei', tirarD100: 'W100 würfeln', tirar: 'Würfeln', vaciar: 'Leeren', mod: 'Modifikator',
    pistaCth: 'Fertigkeit einstellen und würfeln', pistaLibre: 'Würfel wählen und werfen', rodando: 'Rollt…',
    critico: 'Kritisch!', especial: 'Besonderer Erfolg', exito: 'Erfolg', fallo: 'Misserfolg', pifia: 'Patzer!',
    umbral: 'Fertigkeit {h} % · besonders bis {e}', historial: 'Verlauf', sinTiradas: 'Noch keine Würfe.',
    borrar: 'Verlauf löschen', cerrar: 'Schließen', legal: 'Rechtliches', eligeDados: 'Füge einen Würfel hinzu',
    maxDados: 'Höchstens {n} Würfel', gira: 'Handy drehen', auto: 'Automatisch', dia: 'Tagmodus', noche: 'Nachtmodus',
    textoLegal: ['Inoffizieller Würfelwerfer, unabhängig von PenTech erstellt. Nicht mit Chaosium Inc. oder einem Verlag verbunden, von ihnen gesponsert oder genehmigt.',
      'Call of Cthulhu ist eine eingetragene Marke von Chaosium Inc. Zum Spielen brauchst du das Regelwerk.',
      'Verwendet die Bibliotheken three.js und cannon-es (MIT-Lizenz) sowie die Schriften Cinzel und IM Fell English SC (OFL-Lizenz).'] },
  it: { cth: 'Cthulhu', libre: 'Libero', tirarD100: 'Tira il d100', tirar: 'Tira', vaciar: 'Svuota', mod: 'Modificatore',
    pistaCth: 'Imposta l’abilità e tira', pistaLibre: 'Scegli i dadi e tira', rodando: 'Rotola…',
    critico: 'Critico!', especial: 'Successo speciale', exito: 'Successo', fallo: 'Fallimento', pifia: 'Disastro!',
    umbral: 'Abilità {h} % · speciale fino a {e}', historial: 'Cronologia', sinTiradas: 'Ancora nessun tiro.',
    borrar: 'Cancella cronologia', cerrar: 'Chiudi', legal: 'Note legali', eligeDados: 'Aggiungi un dado',
    maxDados: 'Massimo {n} dadi', gira: 'Ruota il telefono', auto: 'Automatico', dia: 'Modalità giorno', noche: 'Modalità notte',
    textoLegal: ['Lanciatore di dadi non ufficiale, creato in modo indipendente da PenTech. Non è affiliato, sponsorizzato né approvato da Chaosium Inc. o da alcun editore.',
      'Il Richiamo di Cthulhu (Call of Cthulhu) è un marchio registrato di Chaosium Inc. Per giocare serve il manuale del gioco.',
      'Usa le librerie three.js e cannon-es (licenza MIT) e i caratteri Cinzel e IM Fell English SC (licenza OFL).'] }
};
const IDIOMAS = { es: 'Español', ca: 'Català', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano' };

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

let idioma = idiomaInicial();
let t = T[idioma];
let tema = lee('dicetech-tema', 'auto');
let modo = lee('dicetech-modo', 'cth');
let hab = Math.max(1, Math.min(99, +lee('dicetech-habilidad', 50) || 50));
let libre = Object.assign({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 }, lee('dicetech-libre', { d20: 1 }));
let mod = +lee('dicetech-mod', 0) || 0;
let sonido = lee('dicetech-sonido', true);
let historial = lee('dicetech-historial-v1', []);
let ultima = null;          // última tirada mostrada
let rodando = false;

/* ───────────── Sonido (sintetizado, sin archivos) ───────────── */
let ac = null, ruido = null, ultimoClac = 0;
function despiertaAudio() {
  if (!ac) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    ac = new A();
    ruido = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.12), ac.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
}
function clac(v, entreDados) {
  if (!ac || !sonido || ac.state !== 'running') return;
  const ahora = ac.currentTime;
  if (ahora - ultimoClac < 0.028) return;
  ultimoClac = ahora;
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = ruido;
  f.type = 'bandpass';
  f.frequency.value = entreDados ? 3000 + Math.random() * 1800 : 1100 + Math.random() * 700;
  f.Q.value = entreDados ? 2.2 : 1.1;
  const vol = Math.pow(Math.min(1, v / 24), 1.25) * (entreDados ? 0.55 : 0.5);
  const dur = entreDados ? 0.045 : 0.07;
  g.gain.setValueAtTime(Math.max(0.0002, vol), ahora);
  g.gain.exponentialRampToValueAtTime(0.0002, ahora + dur);
  src.connect(f); f.connect(g); g.connect(ac.destination);
  src.start(ahora, Math.random() * 0.04); src.stop(ahora + dur + 0.02);
}

/* ───────────── Escena 3D ───────────── */
const lienzo = $('#lienzo'), bandeja = $('#bandeja');
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const escena = new THREE.Scene();
const FOV = 30;
const camara = new THREE.PerspectiveCamera(FOV, 1, 1, 100);
camara.up.set(0, 0, -1);
escena.add(new THREE.HemisphereLight(0xfff6e6, 0x2a3a34, 1.25));
const sol = new THREE.DirectionalLight(0xffffff, 2.3);
sol.position.set(-5, 17, 7);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
sol.shadow.bias = -0.0006;
sol.shadow.normalBias = 0.02;
escena.add(sol);
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.42 }));
suelo.rotation.x = -Math.PI / 2;
suelo.receiveShadow = true;
escena.add(suelo);

const mesa = new Mesa();
mesa.alChocar = clac;
let mallas = [];          // [{dado, malla}]
const piezas = {};        // caché de geometría y material por tipo

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
      const tam = inr * (txt.length > 1 ? (def.lados === 10 ? 0.92 : 1.02) : 1.3);
      g.font = fuente(tam);
      const baja = def.lados === 10 ? inr * 0.12 : (c.idx.length === 3 ? inr * 0.06 : 0);   // en cometas y triángulos, un poco hacia la parte ancha
      g.fillText(txt, cx, cy + baja + tam * 0.04);
      if (def.lados >= 10 && tipo !== 'd00' && (v === 6 || v === 9)) {
        const w = g.measureText(txt).width;
        g.fillRect(cx - w * 0.4, cy + baja + tam * 0.48, w * 0.8, Math.max(3, tam * 0.07));
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
  const w = bandeja.clientWidth, h = bandeja.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  const asp = w / h, corto = 5;
  const hw = asp >= 1 ? corto * asp : corto, hd = asp >= 1 ? corto : corto / asp;
  camara.aspect = asp;
  camara.position.set(0, hd / Math.tan(FOV * Math.PI / 360), 0);
  camara.lookAt(0, 0, 0);
  camara.updateProjectionMatrix();
  const s = sol.shadow.camera;
  s.left = -hw - 3; s.right = hw + 3; s.top = hd + 3; s.bottom = -hd - 3; s.near = 1; s.far = 50;
  s.updateProjectionMatrix();
  mesa.limites(hw * 0.9, hd * 0.9);
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
  while (resto >= PASO && rodando) {
    resto -= PASO;
    if (mesa.paso()) { rodando = false; }
  }
  pinta();
  if (rodando) requestAnimationFrame(cuadro); else fin();
}

/* ───────────── Tiradas ───────────── */
const sinMov = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function tirar() {
  if (rodando) return;
  despiertaAudio();
  cierraMenus();
  let tipos;
  if (modo === 'cth') tipos = ['d00', 'd10'];
  else {
    tipos = [];
    for (const k of ORDEN) for (let i = 0; i < libre[k]; i++) k === 'd100' ? tipos.push('d00', 'd10') : tipos.push(k);
    if (!tipos.length) return aviso(t.eligeDados);
  }
  for (const m of mallas) escena.remove(m.malla);
  mallas = mesa.lanzar(tipos).map(dado => {
    const p = pieza(dado.tipo), malla = new THREE.Mesh(p.geo, p.mat);
    malla.castShadow = true;
    escena.add(malla);
    return { dado, malla };
  });
  ultima = { modo, hab, mod, pendiente: true };
  rodando = true;
  $('#btnTirar').disabled = true;
  pintaResultado();
  if (sinMov()) {                       // sin animación: se calcula de golpe
    let s = 0;
    while (!mesa.paso() && s++ < 2000) {}
    rodando = false; pinta(); fin();
  } else { previo = performance.now(); resto = 0; requestAnimationFrame(cuadro); }
}

function nivelCth(r, h) {               // ediciones anteriores a la 7.ª
  if (r === 1) return 'critico';        // 01 siempre acierta
  if (r === 100) return 'pifia';        // 00 siempre falla
  if (r <= Math.floor(h / 5)) return 'especial';
  return r <= h ? 'exito' : 'fallo';
}

function fin() {
  const ds = mesa.dados, grupos = [];
  for (let i = 0; i < ds.length; i++) {
    if (ds[i].tipo === 'd00') { const r = ds[i].valor * 10 + ds[i + 1].valor; grupos.push(['d100', r === 0 ? 100 : r]); i++; }
    else grupos.push([ds[i].tipo, ds[i].tipo === 'd10' && ds[i].valor === 0 ? 10 : ds[i].valor]);
  }
  const reg = { f: Date.now(), m: ultima.modo };
  if (ultima.modo === 'cth') { reg.r = grupos[0][1]; reg.h = ultima.hab; reg.n = nivelCth(reg.r, reg.h); }
  else { reg.g = grupos; reg.mod = ultima.mod; reg.r = grupos.reduce((s, x) => s + x[1], 0) + ultima.mod; }
  ultima = reg;
  historial.unshift(reg);
  historial = historial.slice(0, 100);
  guarda('dicetech-historial-v1', historial);
  $('#btnTirar').disabled = false;
  pintaResultado(true);
  if (navigator.vibrate) { try { navigator.vibrate(reg.n === 'pifia' || reg.n === 'critico' ? [40, 60, 40] : 25); } catch (e) {} }
}

function desglose(reg) {
  const por = {};
  for (const [k, v] of reg.g) (por[k] = por[k] || []).push(v);
  let s = ORDEN.filter(k => por[k]).map(k => `${por[k].length > 1 ? por[k].length : ''}${k} (${por[k].join(', ')})`).join(' + ');
  if (reg.mod) s += (reg.mod > 0 ? ' + ' : ' − ') + Math.abs(reg.mod);
  return s;
}

/* ───────────── Interfaz ───────────── */
const ICONO = {
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.500a8.500 8.500 0 0 1 0 17z" fill="currentColor"/></svg>',
  dia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.200"/><path d="M12 2.500v2.300M12 19.200v2.300M2.500 12h2.300M19.200 12h2.300M5.300 5.300l1.600 1.600M17.100 17.100l1.600 1.600M5.300 18.700l1.600-1.600M17.100 6.900l1.600-1.600"/></svg>',
  noche: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M20 14.500A8.500 8.500 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500z"/></svg>',
  son: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z"/><path d="M15.500 9a4.500 4.500 0 0 1 0 6M18 6.500a8 8 0 0 1 0 11"/></svg>',
  mudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z"/><path d="M16 9.500l5 5M21 9.500l-5 5"/></svg>'
};

function pintaResultado(nuevo) {
  const res = $('#res'), num = $('#resNum'), niv = $('#resNivel'), det = $('#resDet');
  res.classList.remove('entra');
  res.removeAttribute('data-n');
  const u = ultima && ultima.m === modo ? ultima : null;
  if (ultima && ultima.pendiente) {
    res.classList.add('pista'); niv.textContent = t.rodando; det.textContent = '';
  } else if (!u) {
    res.classList.add('pista'); niv.textContent = modo === 'cth' ? t.pistaCth : t.pistaLibre; det.textContent = '';
  } else {
    res.classList.remove('pista');
    num.textContent = u.m === 'cth' ? String(u.r === 100 ? '00' : u.r).padStart(2, '0') : u.r;
    num.classList.toggle('larga', String(num.textContent).length > 2);
    if (u.m === 'cth') {
      res.dataset.n = u.n;
      niv.textContent = t[u.n];
      det.textContent = t.umbral.replace('{h}', u.h).replace('{e}', String(Math.max(1, Math.floor(u.h / 5))).padStart(2, '0'));
    } else { niv.textContent = ''; det.textContent = desglose(u); niv.hidden = true; }
    if (nuevo) { void res.offsetWidth; res.classList.add('entra'); }
  }
  if (!u || u.m === 'cth' || (ultima && ultima.pendiente)) niv.hidden = false;
  if (u && u.m === 'libre' && !(ultima && ultima.pendiente)) det.style.fontSize = '16px'; else det.style.fontSize = '';
}

function pintaPanel() {
  $('#panelCth').hidden = modo !== 'cth';
  $('#panelLibre').hidden = modo !== 'libre';
  document.querySelectorAll('.modos button').forEach(b => b.classList.toggle('activo', b.dataset.modo === modo));
  $('#btnTirar').textContent = modo === 'cth' ? t.tirarD100 : t.tirar;
  $('#hab').value = hab;
  $('#modVal').textContent = (mod >= 0 ? '+' : '−') + Math.abs(mod);
  document.querySelectorAll('.dado').forEach(b => {
    const n = libre[b.dataset.d];
    b.classList.toggle('con', n > 0);
    b.querySelector('b').textContent = n;
  });
}

function totalDados() { return ORDEN.reduce((s, k) => s + libre[k] * (k === 'd100' ? 2 : 1), 0); }

function aplicaIdioma() {
  t = T[idioma];
  document.documentElement.lang = idioma;
  $('#tabCth').textContent = t.cth;
  $('#tabLibre').textContent = t.libre;
  $('#etqMod').textContent = t.mod;
  $('#btnVaciar').textContent = t.vaciar;
  $('#txtHist').textContent = t.historial;
  $('#btnLegal').textContent = `${t.legal} · ${VERSION}`;
  $('#gira').textContent = t.gira;
  $('#menuIdioma').innerHTML = Object.keys(IDIOMAS).map(k => `<button data-idioma="${k}" class="${k === idioma ? 'activo' : ''}">${IDIOMAS[k]}</button>`).join('');
  pintaTema(); pintaPanel(); pintaResultado();
}

const oscuro = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function pintaTema() {
  const real = tema === 'auto' ? (oscuro && !oscuro.matches ? 'dia' : 'noche') : tema;
  document.documentElement.dataset.tema = real;
  const fondo = real === 'dia' ? '#ece3cf' : '#0d1614';
  document.querySelector('meta[name="theme-color"]').content = fondo;
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
  clearTimeout(relojAviso); relojAviso = setTimeout(() => a.classList.remove('ver'), 1700);
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
    ? `<div class="tir" data-n="${r.n}"><div class="n">${String(r.r === 100 ? '00' : r.r).padStart(2, '0')}</div><div class="d">${t[r.n]}<small>${hora(r.f)} · Cthulhu · ${r.h} %</small></div></div>`
    : `<div class="tir"><div class="n">${r.r}</div><div class="d">${desglose(r)}<small>${hora(r.f)} · ${t.libre}</small></div></div>`).join('')
    : `<p style="text-align:center;color:var(--tenue);padding:18px 0">${t.sinTiradas}</p>`;
  abreHoja(t.historial, html, historial.length ? [['borrar', t.borrar], ['cerrar', t.cerrar, 1]] : [['cerrar', t.cerrar, 1]]);
}

/* ───────────── Eventos ───────────── */
$('#dados').innerHTML = ORDEN.map(k => `<button class="dado" data-d="${k}" style="--c:${COLOR[k].base}"><span>${k}</span><i></i><b>0</b></button>`).join('');

document.addEventListener('click', e => {
  const el = e.target.closest('button, #bandeja, #velo');
  if (!el) return cierraMenus();
  if (el.id === 'btnIdioma') return alternaMenu('#menuIdioma');
  if (el.id === 'btnTema') return alternaMenu('#menuTema');
  if (el.dataset.idioma) { idioma = el.dataset.idioma; guarda('dicetech-idioma', idioma); cierraMenus(); return aplicaIdioma(); }
  if (el.dataset.tema) { tema = el.dataset.tema; guarda('dicetech-tema', tema); cierraMenus(); return pintaTema(); }
  cierraMenus();
  if (el.dataset.modo) { if (rodando) return; modo = el.dataset.modo; guarda('dicetech-modo', modo); pintaPanel(); return pintaResultado(); }
  if (el.dataset.hab) { hab = Math.max(1, Math.min(99, hab + +el.dataset.hab)); guarda('dicetech-habilidad', hab); return pintaPanel(); }
  if (el.dataset.mod) { mod = Math.max(-99, Math.min(99, mod + +el.dataset.mod)); guarda('dicetech-mod', mod); return pintaPanel(); }
  if (el.dataset.d) {
    const k = el.dataset.d;
    if (totalDados() + (k === 'd100' ? 2 : 1) > MAX_DADOS) return aviso(t.maxDados.replace('{n}', MAX_DADOS));
    libre[k]++; guarda('dicetech-libre', libre); return pintaPanel();
  }
  if (el.id === 'btnVaciar') { for (const k of ORDEN) libre[k] = 0; mod = 0; guarda('dicetech-libre', libre); guarda('dicetech-mod', 0); return pintaPanel(); }
  if (el.id === 'btnTirar' || el.id === 'bandeja') return tirar();
  if (el.id === 'btnHist') return abreHistorial();
  if (el.id === 'btnSonido') { sonido = !sonido; guarda('dicetech-sonido', sonido); if (sonido) despiertaAudio(); return pintaTema(); }
  if (el.id === 'btnLegal') return abreHoja(t.legal, t.textoLegal.map(p => `<p>${p}</p>`).join('') + '<p style="color:var(--tenue)">DiceTech · ' + VERSION + ' · by PenTech</p>', [['cerrar', t.cerrar, 1]]);
  if (el.dataset.acc === 'cerrar' || (el.id === 'velo' && e.target === el)) return cierraHoja();
  if (el.dataset.acc === 'borrar') { historial = []; guarda('dicetech-historial-v1', historial); return abreHistorial(); }
});
$('#hab').addEventListener('change', () => {
  hab = Math.max(1, Math.min(99, Math.round(+$('#hab').value) || 1));
  guarda('dicetech-habilidad', hab); pintaPanel();
});
$('#hab').addEventListener('focus', () => $('#hab').select());
document.addEventListener('keydown', e => { if (e.key === 'Escape') { cierraMenus(); cierraHoja(); } });
document.addEventListener('contextmenu', e => { if (!e.target.closest('#hojaC, input')) e.preventDefault(); });
document.addEventListener('gesturestart', e => e.preventDefault());

/* ───────────── Arranque ───────────── */
aplicaIdioma();
new ResizeObserver(ajusta).observe(bandeja);
ajusta();
(document.fonts && document.fonts.load ? Promise.race([document.fonts.load('700 40px Cinzel'), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve())
  .catch(() => {}).then(() => { ['d00', 'd10'].forEach(pieza); });
window.__dicetech = { mesa, tirar, estado: () => ({ rodando, ultima, n: mallas.length }) };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
