// DiceTech · geometría de los dados (sin dependencias)
// Cada dado: vértices, caras (polígonos ordenados vistos desde fuera), normales y valores.

const PHI = (1 + Math.sqrt(5)) / 2;
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const esc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const uni = a => esc(a, 1 / len(a));

function signos(lista) {            // todas las combinaciones de signo de las coordenadas no nulas
  const out = [];
  for (const v of lista) {
    const idx = [0, 1, 2].filter(i => v[i] !== 0);
    for (let m = 0; m < (1 << idx.length); m++) {
      const w = v.slice();
      idx.forEach((i, k) => { if (m & (1 << k)) w[i] = -w[i]; });
      out.push(w);
    }
  }
  return out;
}

function d10verts() {
  const c = Math.cos(Math.PI / 5), h = (1 - c) / (1 + c);   // altura del cinturón para que las cometas sean planas
  const v = [[0, 1, 0], [0, -1, 0]];
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    v.push([Math.cos(a), i % 2 ? -h : h, Math.sin(a)]);
  }
  return v;
}

const FORMAS = {
  d4:  { verts: [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]], radio: 1.25 },
  d6:  { verts: signos([[1, 1, 1]]), radio: 1.12 },
  d8:  { verts: signos([[1, 0, 0], [0, 1, 0], [0, 0, 1]]), radio: 1.1 },
  d10: { verts: d10verts(), radio: 1.08 },
  d12: { verts: signos([[1, 1, 1], [0, 1 / PHI, PHI], [1 / PHI, PHI, 0], [PHI, 0, 1 / PHI]]), radio: 1.08 },
  d20: { verts: signos([[0, 1, PHI], [1, PHI, 0], [PHI, 0, 1]]), radio: 1.15 }
};

function hallaCaras(verts) {
  const eps = 1e-6, vistas = new Set(), out = [], n = verts.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    let nn = cross(sub(verts[j], verts[i]), sub(verts[k], verts[i]));
    if (len(nn) < eps) continue;
    nn = uni(nn);
    const d = dot(nn, verts[i]);
    let pos = 0, neg = 0;
    const en = [];
    for (let m = 0; m < n; m++) {
      const s = dot(nn, verts[m]) - d;
      if (s > eps) pos++; else if (s < -eps) neg++; else en.push(m);
    }
    if (pos && neg) continue;
    if (pos) nn = esc(nn, -1);
    const clave = en.join(',');
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    const c = esc(en.reduce((s, m) => [s[0] + verts[m][0], s[1] + verts[m][1], s[2] + verts[m][2]], [0, 0, 0]), 1 / en.length);
    const u = uni(sub(verts[en[0]], c)), w = cross(nn, u);
    const ang = m => { const r = sub(verts[m], c); return Math.atan2(dot(r, w), dot(r, u)); };
    const idx = en.slice().sort((a, b) => ang(a) - ang(b));
    out.push({ idx, normal: nn, centro: c });
  }
  return out;
}

function reparte(caras, lista) {    // caras opuestas suman lo mismo, como en los dados de verdad
  const val = new Array(caras.length).fill(null);
  let p = 0;
  for (let a = 0; a < caras.length; a++) {
    if (val[a] !== null) continue;
    const b = caras.findIndex((c, i) => val[i] === null && i !== a && dot(c.normal, caras[a].normal) < -0.999);
    val[a] = lista[p];
    if (b >= 0) val[b] = lista[lista.length - 1 - p];
    p++;
  }
  return val;
}

const cache = {};
// tipos: d4 d6 d8 d10 d12 d20 y d00 (el d10 de las decenas)
export function crear(tipo) {
  if (cache[tipo]) return cache[tipo];
  const forma = FORMAS[tipo === 'd00' ? 'd10' : tipo];
  const r0 = Math.max(...forma.verts.map(len));
  const verts = forma.verts.map(v => esc(v, forma.radio / r0));
  const caras = hallaCaras(verts);
  const lados = tipo === 'd00' ? 10 : +tipo.slice(1);
  let valores;
  if (tipo === 'd4') valores = [1, 2, 3, 4];                       // en el d4 el valor va en los vértices
  else if (lados === 10) valores = reparte(caras, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  else valores = reparte(caras, Array.from({ length: lados }, (_, i) => i + 1));
  return (cache[tipo] = { tipo, lados, verts, caras, valores, radio: forma.radio });
}
