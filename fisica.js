// DiceTech · física de la bandeja (cannon-es). No toca la pantalla.
import * as C from './lib/cannon-es.min.js';
import { crear } from './dados.js';

export const PASO = 1 / 120;
const rnd = (a, b) => a + Math.random() * (b - a);

export class Mesa {
  constructor() {
    const w = this.mundo = new C.World({ gravity: new C.Vec3(0, -85, 0) });
    w.allowSleep = false;
    w.solver.iterations = 16;
    this.mDado = new C.Material('dado');
    this.mSuelo = new C.Material('suelo');
    this.mPared = new C.Material('pared');
    w.addContactMaterial(new C.ContactMaterial(this.mDado, this.mSuelo, { friction: 0.48, restitution: 0.24 }));
    w.addContactMaterial(new C.ContactMaterial(this.mDado, this.mPared, { friction: 0.04, restitution: 0.55 }));
    w.addContactMaterial(new C.ContactMaterial(this.mDado, this.mDado, { friction: 0.18, restitution: 0.38 }));
    const plano = (mat, ex, ey) => {
      const b = new C.Body({ mass: 0, shape: new C.Plane(), material: mat });
      b.quaternion.setFromEuler(ex, ey, 0);
      w.addBody(b);
      return b;
    };
    this.suelo = plano(this.mSuelo, -Math.PI / 2, 0);
    this.techo = plano(this.mPared, Math.PI / 2, 0);
    this.techo.position.set(0, 14, 0);
    this.pIzq = plano(this.mPared, 0, Math.PI / 2);
    this.pDer = plano(this.mPared, 0, -Math.PI / 2);
    this.pFondo = plano(this.mPared, 0, 0);
    this.pFrente = plano(this.mPared, 0, Math.PI);
    this.dados = [];
    this.alChocar = null;
    this.limites(5, 5);
  }

  limites(hw, hd) {
    this.hw = hw; this.hd = hd;
    this.pIzq.position.set(-hw, 0, 0);
    this.pDer.position.set(hw, 0, 0);
    this.pFondo.position.set(0, 0, -hd);
    this.pFrente.position.set(0, 0, hd);
    for (const d of this.dados) {            // si la bandeja encoge, que ningún dado quede fuera
      const p = d.cuerpo.position, m = d.def.radio;
      p.x = Math.max(-hw + m, Math.min(hw - m, p.x));
      p.z = Math.max(-hd + m, Math.min(hd - m, p.z));
    }
  }

  vacia() {
    for (const d of this.dados) this.mundo.removeBody(d.cuerpo);
    this.dados = [];
  }

  // tipos: ['d00','d10'] ...   Devuelve la lista de dados creados
  lanzar(tipos, fuerza = 1) {
    this.vacia();
    const n = tipos.length, hw = this.hw, hd = this.hd;
    const porFila = Math.max(1, Math.min(4, Math.floor((2 * hw - 0.4) / 2.5)));
    const empuje = Math.min(1.3, Math.max(0.8, hd / 7.5));        // mesa más larga, tirada más fuerte
    tipos.forEach((tipo, i) => {
      const def = crear(tipo);
      const forma = new C.ConvexPolyhedron({
        vertices: def.verts.map(v => new C.Vec3(v[0], v[1], v[2])),
        faces: def.caras.map(c => c.idx.slice())
      });
      const cuerpo = new C.Body({ mass: 1, shape: forma, material: this.mDado, linearDamping: 0.08, angularDamping: 0.08 });
      const col = i % porFila, fila = Math.floor(i / porFila), enFila = Math.min(porFila, n - fila * porFila);
      // entran desde el borde de abajo, en filas hacia dentro de la mesa
      cuerpo.position.set(
        (col - (enFila - 1) / 2) * Math.min(2.5, (2 * hw - 2.6) / Math.max(1, enFila - 1)) + rnd(-0.15, 0.15),
        2.6 + rnd(0, 0.7) + (fila % 2) * 0.9,
        Math.max(-hd + 1.6, hd - 1.4 - fila * 2.5) + rnd(-0.2, 0.2)
      );
      const q = new C.Quaternion(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), rnd(-1, 1));
      q.normalize();
      cuerpo.quaternion.copy(q);
      cuerpo.velocity.set(rnd(-6, 6) * fuerza, rnd(-3, 1), -rnd(22, 31) * fuerza * empuje);
      cuerpo.angularVelocity.set(rnd(-28, 28) * fuerza, rnd(-28, 28) * fuerza, rnd(-28, 28) * fuerza);
      cuerpo.addEventListener('collide', e => {
        if (!this.alChocar) return;
        const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
        if (v < 1.2) return;
        const m = e.body.material;
        this.alChocar(v, m === this.mDado ? 'dado' : m === this.mPared ? 'pared' : 'suelo', tipo);
      });
      this.mundo.addBody(cuerpo);
      this.dados.push({ tipo, def, cuerpo, valor: null });
    });
    this.t = 0; this.calma = 0; this.intentos = 0;
    return this.dados;
  }

  // Un paso fijo. Devuelve true cuando todos los dados están quietos y bien asentados.
  paso() {
    this.mundo.step(PASO);
    this.t += PASO;
    if (this.t < 0.4) return false;
    for (const d of this.dados) {                  // freno: apaga el temblor de los dados ya tumbados sobre una cara
      const b = d.cuerpo;
      if (b.velocity.lengthSquared() < 1 && b.angularVelocity.lengthSquared() < 1.5 &&
          b.position.y < d.def.radio * 1.2 && this.firmeza(d) > 0.985) {
        b.velocity.scale(0.88, b.velocity);
        b.angularVelocity.scale(0.88, b.angularVelocity);
      }
    }
    const quieto = this.dados.every(d =>
      d.cuerpo.velocity.lengthSquared() < 0.05 && d.cuerpo.angularVelocity.lengthSquared() < 0.1);
    this.calma = quieto ? this.calma + 1 : 0;
    if (this.calma < 18 && this.t < 5.5) return false;
    if (this.intentos < 8) {
      let torcido = false;
      for (const d of this.dados) {
        if (this.firmeza(d) < 0.985 || d.cuerpo.position.y > d.def.radio * 1.2) {   // dado de canto o montado en otro: empujoncito
          const p = d.cuerpo.position;                // hacia el hueco libre: lejos de paredes y vecinos
          let ax = -p.x / this.hw * 1.5, az = -p.z / this.hd * 1.5;
          for (const o of this.dados) {
            if (o === d) continue;
            const dx = p.x - o.cuerpo.position.x, dz = p.z - o.cuerpo.position.z, r2 = dx * dx + dz * dz;
            if (r2 < 16) { ax += dx / (r2 + 0.3) * 3; az += dz / (r2 + 0.3) * 3; }
          }
          const m = Math.hypot(ax, az) || 1;
          d.cuerpo.velocity.set(ax / m * rnd(5, 9), rnd(13, 17), az / m * rnd(5, 9));
          d.cuerpo.angularVelocity.set(rnd(-14, 14), rnd(-14, 14), rnd(-14, 14));
          torcido = true;
        }
      }
      if (torcido) { this.intentos++; this.calma = 0; this.t = Math.min(this.t, 3.5); return false; }
    }
    for (const d of this.dados) d.valor = this.valor(d);
    return true;
  }

  alturas(d, lista) {
    const v = new C.Vec3(), o = new C.Vec3();
    return lista.map(p => { v.set(p[0], p[1], p[2]); d.cuerpo.quaternion.vmult(v, o); return o.y; });
  }

  firmeza(d) {
    const ys = this.alturas(d, d.def.caras.map(c => c.normal));
    return d.tipo === 'd4' ? Math.max(...ys.map(y => -y)) : Math.max(...ys);
  }

  valor(d) {
    const lista = d.tipo === 'd4' ? d.def.verts : d.def.caras.map(c => c.normal);
    const ys = this.alturas(d, lista);
    return d.def.valores[ys.indexOf(Math.max(...ys))];
  }
}
