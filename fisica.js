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

  creaCuerpo(tipo) {
    const def = crear(tipo);
    const forma = new C.ConvexPolyhedron({
      vertices: def.verts.map(v => new C.Vec3(v[0], v[1], v[2])),
      faces: def.caras.map(c => c.idx.slice())
    });
    const cuerpo = new C.Body({ mass: 1, shape: forma, material: this.mDado, linearDamping: 0.08, angularDamping: 0.08 });
    const q = new C.Quaternion(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), rnd(-1, 1));
    q.normalize();
    cuerpo.quaternion.copy(q);
    cuerpo.addEventListener('collide', e => {
      if (!this.alChocar) return;
      const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (v < 1.2) return;
      const m = e.body.material;
      this.alChocar(v, m === this.mDado ? 'dado' : m === this.mPared ? 'pared' : 'suelo', tipo);
    });
    this.mundo.addBody(cuerpo);
    const d = { tipo, def, cuerpo, valor: null };
    this.dados.push(d);
    return d;
  }

  reinicia() { this.t = 0; this.calma = 0; this.intentos = 0; }

  // Tirada normal: los dados entran desde el borde de abajo hacia arriba
  lanzar(tipos, fuerza = 1) {
    this.vacia();
    this.agitando = false;
    const n = tipos.length, hw = this.hw, hd = this.hd;
    const porFila = Math.max(1, Math.min(4, Math.floor((2 * hw - 0.4) / 2.5)));
    const empuje = Math.min(1.3, Math.max(0.8, hd / 7.5));        // mesa más larga, tirada más fuerte
    tipos.forEach((tipo, i) => {
      const { cuerpo } = this.creaCuerpo(tipo);
      const col = i % porFila, fila = Math.floor(i / porFila), enFila = Math.min(porFila, n - fila * porFila);
      cuerpo.position.set(
        (col - (enFila - 1) / 2) * Math.min(2.5, (2 * hw - 2.6) / Math.max(1, enFila - 1)) + rnd(-0.15, 0.15),
        2.6 + rnd(0, 0.7) + (fila % 2) * 0.9,
        Math.max(-hd + 1.6, hd - 1.4 - fila * 2.5) + rnd(-0.2, 0.2)
      );
      cuerpo.velocity.set(rnd(-6, 6) * fuerza, rnd(-3, 1), -rnd(22, 31) * fuerza * empuje);
      cuerpo.angularVelocity.set(rnd(-28, 28) * fuerza, rnd(-28, 28) * fuerza, rnd(-28, 28) * fuerza);
    });
    this.reinicia();
    return this.dados;
  }

  // Efecto cubilete: los dados caen en el centro y se quedan "en la mano" mientras se agita
  prepara(tipos) {
    this.vacia();
    const n = tipos.length, porFila = Math.max(1, Math.min(3, Math.floor((2 * this.hw - 0.4) / 2.4)));
    const filas = Math.ceil(n / porFila);
    tipos.forEach((tipo, i) => {
      const { cuerpo } = this.creaCuerpo(tipo);
      const col = i % porFila, fila = Math.floor(i / porFila), enFila = Math.min(porFila, n - fila * porFila);
      cuerpo.position.set((col - (enFila - 1) / 2) * 2.4 + rnd(-0.2, 0.2), 2 + rnd(0, 1.2), (fila - (filas - 1) / 2) * 2.4 + rnd(-0.2, 0.2));
      cuerpo.velocity.set(rnd(-2, 2), -rnd(2, 5), rnd(-2, 2));
      cuerpo.angularVelocity.set(rnd(-12, 12), rnd(-12, 12), rnd(-12, 12));
    });
    this.agitando = true;
    this.reinicia();
    return this.dados;
  }

  agitaOtraVez() { this.agitando = true; this.reinicia(); }

  // Aceleración del móvil (m/s², ejes de la pantalla: x derecha, y arriba, z hacia la cara).
  // Los dados se quedan atrás por inercia: reciben la aceleración contraria, como dentro de un cubilete.
  zarandea(ax, ay, az, dt) {
    const K = 11, lim = 60;
    const m = Math.hypot(ax, ay, az), f = m > lim ? lim / m : 1;
    ax *= f; ay *= f; az *= f;
    for (const d of this.dados) {
      const v = d.cuerpo.velocity, w = d.cuerpo.angularVelocity, k = K * (d.k || (d.k = rnd(0.8, 1.2)));   // cada dado, algo distinto
      v.x += -ax * k * dt;
      v.z += ay * k * dt;                      // arriba de la pantalla = -z del mundo
      v.y += Math.max(0, -az) * k * 0.45 * dt; // al bajar el móvil, los dados saltan un poco
      const sacude = m * f * dt * 1.6;
      w.x += rnd(-1, 1) * sacude; w.y += rnd(-1, 1) * sacude; w.z += rnd(-1, 1) * sacude;
      const vel = v.length();
      if (vel > 42) v.scale(42 / vel, v);
    }
  }

  // Se deja de agitar: los dados salen rodando con lo que llevaban, más un empujón
  suelta() {
    this.agitando = false;
    for (const d of this.dados) {
      const v = d.cuerpo.velocity, h = Math.hypot(v.x, v.z);
      const ux = h > 2 ? v.x / h : rnd(-1, 1), uz = h > 2 ? v.z / h : -rnd(0.3, 1);
      const imp = rnd(9, 16);
      v.set(v.x * 0.6 + ux * imp + rnd(-2, 2), rnd(2, 5), v.z * 0.6 + uz * imp + rnd(-2, 2));
      d.cuerpo.angularVelocity.set(rnd(-24, 24), rnd(-24, 24), rnd(-24, 24));
    }
    this.reinicia();
  }

  // Un paso fijo. Devuelve true cuando todos los dados están quietos y bien asentados.
  paso() {
    this.mundo.step(PASO);
    if (this.agitando) return false;           // mientras se agita, no se cuenta nada
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
