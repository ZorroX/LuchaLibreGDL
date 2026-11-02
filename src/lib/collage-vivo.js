// Collage generativo: compone una escena al azar, la rasga en papel y la mezcla con la siguiente.
const TEAL = '#0f97a3';
const PAPEL = '#f6f2e8';
const COLORES = ['#e0291e', '#fbc913', '#0f97a3', '#a63c7e', '#7c9bd8', '#f3701c'];
const TINTES = ['#fbc913', '#f3701c', '#0f97a3', '#a63c7e', '#7c9bd8'];

const azar = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const uno = (lista) => lista[Math.floor(Math.random() * lista.length)];
const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lienzo = (w, h) => Object.assign(document.createElement('canvas'), { width: Math.ceil(w), height: Math.ceil(h) });
const respiro = () => new Promise((r) => setTimeout(r, 0));

function cargar(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

// Baraja: repite elementos solo cuando ya salieron todos.
function baraja(lista) {
  let mazo = [];
  return () => {
    if (!mazo.length) mazo = [...lista].sort(() => Math.random() - 0.5);
    return mazo.pop();
  };
}

/* Bordes rasgados */
function quebrar(a, b, amplitud, profundidad = 5) {
  if (profundidad === 0) return [a];
  const m = [(a[0] + b[0]) / 2 + azar(-amplitud, amplitud), (a[1] + b[1]) / 2 + azar(-amplitud, amplitud)];
  return [...quebrar(a, m, amplitud * 0.56, profundidad - 1), ...quebrar(m, b, amplitud * 0.56, profundidad - 1)];
}

function rasgarContorno(puntos, amplitud) {
  return puntos.flatMap((p, i) => quebrar(p, puntos[(i + 1) % puntos.length], amplitud));
}

function trazar(ctx, puntos) {
  ctx.beginPath();
  puntos.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
}

function haciaAdentro(puntos, cuanto) {
  const cx = puntos.reduce((s, p) => s + p[0], 0) / puntos.length;
  const cy = puntos.reduce((s, p) => s + p[1], 0) / puntos.length;
  let fase = azar(6);
  return puntos.map((p) => {
    fase += azar(0.1, 0.5);
    const d = Math.hypot(cx - p[0], cy - p[1]) || 1;
    const k = cuanto * (0.45 + 0.55 * Math.abs(Math.sin(fase)));
    return [p[0] + ((cx - p[0]) / d) * k, p[1] + ((cy - p[1]) / d) * k];
  });
}

/* Voronoi estirado: las celdas comparten sus vértices, por eso los trozos embonan */
function recortarSemiplano(poli, px, py, nx, ny) {
  const fuera = [];
  poli.forEach((a, i) => {
    const b = poli[(i + 1) % poli.length];
    const da = (a[0] - px) * nx + (a[1] - py) * ny;
    const db = (b[0] - px) * nx + (b[1] - py) * ny;
    if (da <= 0) fuera.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      fuera.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return fuera;
}

function celdas(W, H, n, angulo, estirar) {
  const c = Math.cos(angulo);
  const s = Math.sin(angulo);
  const ida = ([x, y]) => [(x * c + y * s) / estirar, -x * s + y * c];
  const vuelta = ([u, v]) => [u * estirar * c - v * s, u * estirar * s + v * c];
  const marco = [[0, 0], [W, 0], [W, H], [0, H]].map(ida);
  const semillas = Array.from({ length: n }, () => ida([azar(W), azar(H)]));
  return semillas.map((a, i) => {
    let poli = marco;
    semillas.forEach((b, j) => {
      if (i !== j) poli = recortarSemiplano(poli, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, b[0] - a[0], b[1] - a[1]);
    });
    return poli.map(vuelta);
  }).filter((p) => p.length > 2);
}

function contornosCompartidos(polis, W, H, amplitud) {
  const memoria = new Map();
  const llave = (p) => `${Math.round(p[0])},${Math.round(p[1])}`;
  const enBorde = (a, b) => (Math.abs(a[0] - b[0]) < 1 && (a[0] < 1 || a[0] > W - 1)) || (Math.abs(a[1] - b[1]) < 1 && (a[1] < 1 || a[1] > H - 1));
  return polis.map((poli) => poli.flatMap((a, i) => {
    const b = poli[(i + 1) % poli.length];
    if (enBorde(a, b)) return [a];
    const ka = llave(a);
    const kb = llave(b);
    const directo = ka < kb;
    const k = directo ? `${ka}|${kb}` : `${kb}|${ka}`;
    if (!memoria.has(k)) {
      const [p, q] = directo ? [a, b] : [b, a];
      memoria.set(k, quebrar(p, q, Math.min(amplitud, Math.hypot(p[0] - q[0], p[1] - q[1]) * 0.09)));
    }
    const camino = memoria.get(k);
    return directo ? camino : [a, ...camino.slice(1).reverse()];
  }));
}

async function trocear(escena, W, H, u, cuantos, opciones) {
  const polis = contornosCompartidos(celdas(W, H, cuantos, opciones.angulo, opciones.estirar), W, H, 26 * u);
  const trozos = [];
  const pad = Math.ceil(22 * u);
  for (const [i, poli] of polis.entries()) {
    const xs = poli.map((p) => p[0]);
    const ys = poli.map((p) => p[1]);
    const x0 = Math.floor(Math.min(...xs)) - pad;
    const y0 = Math.floor(Math.min(...ys)) - pad;
    const w = Math.ceil(Math.max(...xs)) + pad - x0;
    const h = Math.ceil(Math.max(...ys)) + pad - y0;
    const hoja = lienzo(w, h);
    const c = hoja.getContext('2d');
    const local = poli.map((p) => [p[0] - x0, p[1] - y0]);
    c.save();
    c.shadowColor = 'rgba(0,0,0,.55)';
    c.shadowBlur = 14 * u;
    c.shadowOffsetY = 5 * u;
    c.fillStyle = PAPEL;
    trazar(c, local);
    c.fill();
    c.restore();
    c.save();
    trazar(c, haciaAdentro(local, 10 * u));
    c.clip();
    c.drawImage(escena, -x0, -y0);
    c.restore();
    trozos.push({ hoja, x0, y0, w, h, cx: x0 + w / 2, cy: y0 + h / 2, contorno: poli });
    if (i % 5 === 4) await respiro();
  }
  return trozos;
}

/* Piezas del collage */
function cubrir(ctx, im, x, y, w, h, foco = 0.5) {
  const e = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const iw = im.naturalWidth * e;
  const ih = im.naturalHeight * e;
  ctx.drawImage(im, x + (w - iw) * foco, y + (h - ih) * 0.5, iw, ih);
}

function tratar(ctx, x, y, w, h, modo) {
  if (modo === 'natural') return;
  ctx.save();
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, w, h);
  if (modo !== 'bn') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = modo;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function papelRasgado(ctx, poli, u, relleno) {
  const borde = rasgarContorno(poli, 15 * u);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.42)';
  ctx.shadowBlur = 16 * u;
  ctx.shadowOffsetX = 5 * u;
  ctx.shadowOffsetY = 7 * u;
  ctx.fillStyle = PAPEL;
  trazar(ctx, borde);
  ctx.fill();
  ctx.restore();
  ctx.save();
  trazar(ctx, haciaAdentro(borde, 9 * u));
  ctx.clip();
  relleno(ctx);
  ctx.restore();
}

const rectangulo = (x, y, w, h, giro = 0) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const c = Math.cos(giro);
  const s = Math.sin(giro);
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => [cx + (a - cx) * c - (b - cy) * s, cy + (a - cx) * s + (b - cy) * c]);
};

function figura(ctx, rec, cx, base, alto, u, { volteo = false, giro = 0, anclaAbajo = true } = {}) {
  const e = alto / rec.im.naturalHeight;
  const w = rec.im.naturalWidth * e;
  ctx.save();
  ctx.translate(cx, base);
  ctx.rotate(giro);
  if (volteo) ctx.scale(-1, 1);
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = 20 * u;
  ctx.shadowOffsetY = 10 * u;
  ctx.drawImage(rec.im, -w / 2, anclaAbajo ? -alto : -alto / 2, w, alto);
  ctx.restore();
}

async function rayos(ctx, cx, cy, r0, r1, u, im, n = 11, desde = -Math.PI, hasta = Math.PI) {
  for (let i = 0; i < n; i++) {
    if (i % 3 === 2) await respiro();
    const a = desde + ((hasta - desde) * (i + 0.5)) / n + azar(-0.05, 0.05);
    const ancho = (((hasta - desde) / n) * 0.3) + azar(0.02);
    const r = r1 * azar(0.8, 1.05);
    const p = (ang, rad) => [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
    const color = uno(['#e0291e', '#f3701c', '#fbc913']);
    papelRasgado(ctx, [p(a - ancho * 0.5, r0), p(a - ancho, r), p(a + ancho, r), p(a + ancho * 0.5, r0)], u * 0.55, (c) => {
      c.fillStyle = color;
      c.fillRect(0, 0, c.canvas.width, c.canvas.height);
      if (im) {
        c.globalCompositeOperation = 'hard-light';
        c.globalAlpha = 0.85;
        const s = r1 * 1.1;
        c.drawImage(im, cx - s, cy - s, s * 2, s * 2);
      }
    });
  }
}

function disco(ctx, cx, cy, r, u, im) {
  const puntos = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  papelRasgado(ctx, puntos, u * 0.6, (c) => cubrir(c, im, cx - r, cy - r, r * 2, r * 2));
}

function oro(ctx, textura, x, y, w, h) {
  ctx.drawImage(textura, x, y, w, h);
}

function rotulo(ctx, lineas, x, y, ancho, { giro = 0, centrar = false } = {}) {
  ctx.save();
  ctx.font = '100px Rye';
  const masAncha = Math.max(...lineas.map((l) => ctx.measureText(l).width));
  const fs = Math.min(100 * (ancho / masAncha), (ctx.canvas.height * 0.34) / (lineas.length * 1.08));
  const paso = fs * 1.08;
  ctx.translate(x, (centrar ? y - (paso * lineas.length) / 2 : y) + fs * 0.82);
  ctx.rotate(giro);
  ctx.font = `${fs}px Rye`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  lineas.forEach((linea, i) => {
    const by = i * paso;
    for (let k = 8; k >= 1; k--) {
      const d = k * fs * 0.012;
      ctx.lineWidth = fs * 0.05;
      ctx.strokeStyle = TEAL;
      ctx.fillStyle = TEAL;
      ctx.strokeText(linea, d, by + d);
      ctx.fillText(linea, d, by + d);
    }
    ctx.lineWidth = fs * 0.075;
    ctx.strokeStyle = '#08080a';
    ctx.strokeText(linea, 0, by);
    const g = ctx.createLinearGradient(0, by - fs * 0.72, 0, by + fs * 0.03);
    [['#fff', 0], ['#fff', 0.44], ['#fbc913', 0.44], ['#fbc913', 0.6], ['#f3701c', 0.6], ['#f3701c', 0.74], ['#e0291e', 0.74], ['#e0291e', 1]]
      .forEach(([c, s]) => g.addColorStop(s, c));
    ctx.fillStyle = g;
    ctx.fillText(linea, 0, by);
  });
  ctx.restore();
}

function nota(ctx, texto, x, y, u) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(azar(-0.05, 0.05));
  const fs = 25 * u;
  ctx.font = `500 ${fs}px Archivo, Arial, sans-serif`;
  const w = ctx.measureText(texto).width + 36 * u;
  const h = fs * 2;
  papelRasgado(ctx, rectangulo(-w / 2, -h / 2, w, h), u * 0.3, (c) => {
    c.fillStyle = '#ece5cf';
    c.fillRect(-w, -h, w * 2, h * 2);
  });
  ctx.fillStyle = '#2f7f3a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 0, 0);
  ctx.restore();
}

/* Motor */
export function iniciarCollage(canvas, material, { alCambiar } = {}) {
  const ctx = canvas.getContext('2d');
  const reposo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pool = { ciudad: [], tequila: [], naturaleza: [], espacio: [], galaxia: [], astro: [], cuerpo: [], cabeza: [] };
  let W, H, u, vertical, dpr;
  let oroTextura, grano;
  let actual, trozos, siguiente;
  let vivo = true;
  let pausado = reposo;
  let raf = 0;
  let generacion = 0;
  let transicion = null;
  let inicioEscena = 0;
  let duracionEscena = 0;
  let forzar = null;
  let sacudida = 0;
  let papelitos = [];
  let cuantas = 0;
  const siguienteFrase = baraja(material.frases);
  const siguienteNota = baraja(material.notas);
  const siguientePlantilla = baraja(['retablo', 'duelo', 'cosmos', 'muro', 'cartel']);

  const recientes = [];
  const fresco = (lista) => {
    const libres = lista.filter((m) => !recientes.includes(m));
    const elegido = uno(libres.length ? libres : lista);
    recientes.push(elegido);
    if (recientes.length > 26) recientes.shift();
    return elegido;
  };
  const f = (tipo) => fresco(pool[tipo].length ? pool[tipo] : pool.ciudad.length ? pool.ciudad : pool.espacio);
  const fig = (tipo) => fresco(pool[tipo].length ? pool[tipo] : pool.cuerpo.length ? pool.cuerpo : pool.cabeza);
  const lugar = () => f(uno(['ciudad', 'ciudad', 'ciudad', 'tequila', 'tequila']));
  const cualquiera = () => f(uno(['ciudad', 'tequila', 'naturaleza', 'espacio', 'espacio']));

  function medir() {
    const caja = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.min(Math.round(caja.width * dpr), 2000);
    H = Math.round((W * caja.height) / caja.width);
    canvas.width = W;
    canvas.height = H;
    u = Math.min(W, H) / 900;
    vertical = H > W;
  }

  function cielo(c, modo) {
    cubrir(c, lugar().im, 0, 0, W, H, azar(0.2, 0.8));
    tratar(c, 0, 0, W, H, modo ?? uno(['natural', 'natural', 'bn', ...TINTES]));
  }

  const panel = (c, x, y, w, h, relleno, giro = azar(-0.04, 0.04)) => papelRasgado(c, rectangulo(x, y, w, h, giro), u, relleno);
  const imagenEn = (x, y, w, h, im, modo = 'natural') => (c) => {
    cubrir(c, im, x - 20, y - 20, w + 40, h + 40, azar(0.3, 0.7));
    tratar(c, x - 20, y - 20, w + 40, h + 40, modo);
  };
  const conFigura = (x, y, w, h, color, rec) => (c) => {
    c.fillStyle = color;
    c.fillRect(x - 30, y - 30, w + 60, h + 60);
    const e = Math.max((h * 0.95) / rec.im.naturalHeight, (w * 0.8) / rec.im.naturalWidth);
    c.drawImage(rec.im, x + (w - rec.im.naturalWidth * e) / 2, y + h - rec.im.naturalHeight * e + 8, rec.im.naturalWidth * e, rec.im.naturalHeight * e);
  };

  const plantillas = {
    async retablo(c, lineas, primera) {
      cubrir(c, (primera ? f('ciudad') : lugar()).im, 0, 0, W, H, azar(0.2, 0.8));
      tratar(c, 0, 0, W, H, uno(['natural', 'bn', ...TINTES]));
      const px = vertical ? W * 0.07 : W * 0.46;
      const pw = vertical ? W * 0.86 : W * 0.46;
      const py = vertical ? H * 0.26 : H * 0.1;
      const ph = vertical ? H * 0.7 : H * 0.84;
      panel(c, px, py, pw, ph, (k) => oro(k, oroTextura, px - 30, py - 30, pw + 60, ph + 60));
      await respiro();
      const cx = px + pw / 2;
      await rayos(c, cx, py + ph * 0.42, 120 * u, Math.min(pw, ph) * 0.74, u, f(uno(['naturaleza', 'espacio'])).im);
      figura(c, fig('cuerpo'), cx, H * 1.02, H * (vertical ? 0.62 : 0.88), u, { volteo: azar() > 0.5 });
      figura(c, fig('cabeza'), W * (vertical ? 0.76 : 0.3), H * (vertical ? 0.4 : 0.6), H * (vertical ? 0.24 : 0.3), u, { anclaAbajo: false, giro: azar(-0.18, 0.18) });
      await respiro();
      rotulo(c, lineas, vertical ? W / 2 : W * 0.25, H * (vertical ? 0.06 : 0.13), W * (vertical ? 0.9 : 0.42), { giro: azar(-0.03, 0.02) });
      nota(c, siguienteNota(), W * (vertical ? 0.28 : 0.24), H * (vertical ? 0.5 : 0.78), u);
    },
    async duelo(c, lineas) {
      cielo(c, uno(['bn', ...TINTES]));
      const ax = W * (vertical ? 0.1 : 0.34);
      const aw = W * (vertical ? 0.8 : 0.32);
      panel(c, ax, -40, aw, H + 80, imagenEn(ax, -40, aw, H + 80, f('espacio').im), azar(-0.07, 0.07));
      await respiro();
      figura(c, fig('cuerpo'), W * (vertical ? 0.28 : 0.2), H * 1.02, H * (vertical ? 0.54 : 0.74), u);
      figura(c, fig('cuerpo'), W * (vertical ? 0.74 : 0.8), H * 1.02, H * (vertical ? 0.54 : 0.74), u, { volteo: true });
      await respiro();
      rotulo(c, lineas, W / 2, H * 0.05, W * (vertical ? 0.9 : 0.6));
      nota(c, siguienteNota(), W * 0.5, H * (vertical ? 0.4 : 0.48), u);
    },
    async cosmos(c, lineas) {
      cubrir(c, f('galaxia').im, 0, 0, W, H);
      const r = Math.min(W, H) * (vertical ? 0.34 : 0.33);
      disco(c, W * (vertical ? 0.56 : 0.7), H * (vertical ? 0.46 : 0.5), r, u, f('astro').im);
      await respiro();
      const sy = H * (vertical ? 0.68 : 0.66);
      panel(c, -60, sy, W + 120, H * 0.5, imagenEn(0, sy, W, H * 0.5, lugar().im), azar(-0.03, 0.03));
      figura(c, fig('cuerpo'), W * (vertical ? 0.36 : 0.26), H * 1.02, H * (vertical ? 0.52 : 0.72), u);
      if (!vertical) figura(c, fig('cabeza'), W * 0.9, H * 0.76, H * 0.28, u, { anclaAbajo: false, giro: azar(-0.2, 0.2) });
      await respiro();
      rotulo(c, lineas, W / 2, H * 0.05, W * (vertical ? 0.92 : 0.6));
    },
    async muro(c, lineas) {
      c.fillStyle = PAPEL;
      c.fillRect(0, 0, W, H);
      oro(c, oroTextura, W * 0.05, H * 0.08, W * 0.9, H * 0.84);
      const cols = vertical ? 2 : 4;
      const filas = vertical ? 3 : 2;
      const cw = W / cols;
      const ch = (H * 0.92) / filas;
      for (let fila = 0; fila < filas; fila++) {
        for (let col = 0; col < cols; col++) {
          const x = col * cw + cw * azar(0.02, 0.08);
          const y = H * 0.04 + fila * ch + ch * azar(0.02, 0.08);
          const w = cw * azar(0.84, 0.98);
          const h = ch * azar(0.84, 0.98);
          const lleno = azar() > 0.55 ? imagenEn(x, y, w, h, (azar() > 0.5 ? lugar() : cualquiera()).im, uno(['natural', 'bn'])) : conFigura(x, y, w, h, uno(COLORES), fig(azar() > 0.45 ? 'cabeza' : 'cuerpo'));
          panel(c, x, y, w, h, lleno, azar(-0.05, 0.05));
        }
        await respiro();
      }
      rotulo(c, lineas, W / 2, H * 0.5, W * (vertical ? 0.9 : 0.66), { giro: azar(-0.04, 0.04), centrar: true });
    },
    async cartel(c, lineas) {
      cielo(c, 'bn');
      const n = vertical ? 3 : 5;
      for (let i = 1; i < n; i += 2) {
        const w = W / n;
        panel(c, i * w, -40, w * 1.05, H + 80, imagenEn(i * w, -40, w, H + 80, cualquiera().im), azar(-0.05, 0.05));
      }
      await respiro();
      const cy = H * (vertical ? 0.58 : 0.64);
      await rayos(c, W / 2, cy, 140 * u, Math.max(W, H) * 0.44, u, f('naturaleza').im, 14);
      figura(c, fig('cabeza'), W / 2, cy, H * (vertical ? 0.44 : 0.6), u, { anclaAbajo: false, giro: azar(-0.05, 0.05) });
      await respiro();
      rotulo(c, lineas, W / 2, H * 0.05, W * (vertical ? 0.9 : 0.6));
      nota(c, siguienteNota(), W * 0.82, H * 0.74, u);
    },
  };

  async function componer(primera) {
    const hoja = lienzo(W, H);
    const c = hoja.getContext('2d');
    const nombre = primera ? 'retablo' : siguientePlantilla();
    await plantillas[nombre](c, primera ? material.frases[0] : siguienteFrase(), primera);
    c.save();
    c.globalCompositeOperation = 'overlay';
    c.globalAlpha = 0.16;
    c.fillStyle = c.createPattern(grano, 'repeat');
    c.fillRect(0, 0, W, H);
    c.restore();
    return hoja;
  }

  async function preparar() {
    const turno = ++generacion;
    await respiro();
    const modo = azar() > 0.68 ? { angulo: azar(Math.PI), estirar: azar(2.6, 3.8) } : { angulo: azar(Math.PI), estirar: azar(1, 1.6) };
    const nuevos = await trocear(actual, W, H, u, vertical ? 18 : 30, modo);
    await respiro();
    const proxima = await componer(false);
    if (turno !== generacion) return;
    trozos = nuevos;
    siguiente = proxima;
  }

  function planear(origen) {
    const tipo = origen ? 'estallar' : uno(['estallar', 'mezcla', 'mezcla', 'barrer', 'pegar']);
    const o = origen ?? [azar(W), azar(H)];
    const diag = Math.hypot(W, H);
    const fin = { estallar: 0, mezcla: 0, barrer: 0, pegar: 0 };
    const anguloBarrido = azar(Math.PI * 2);
    trozos.forEach((t) => {
      const dx = t.cx - o[0];
      const dy = t.cy - o[1];
      const d = Math.hypot(dx, dy) || 1;
      t.dir = tipo === 'barrer' ? [Math.cos(anguloBarrido), Math.sin(anguloBarrido)] : [dx / d, dy / d];
      t.giro = azar(-1.6, 1.6);
      t.volteos = azar(0.5, 2);
      t.lejos = diag * azar(0.9, 1.5);
      t.dura = azar(900, 1500);
      if (tipo === 'mezcla') t.espera = azar() > 0.45 ? (d / diag) * 1000 : 2500 + azar(1000);
      else if (tipo === 'barrer') t.espera = ((t.cx * Math.cos(anguloBarrido) + t.cy * Math.sin(anguloBarrido)) / diag + 1) * 900 - 450 + azar(160);
      else if (tipo === 'pegar') t.espera = azar(1500);
      else t.espera = (d / diag) * 1300 + azar(200);
      fin[tipo] = Math.max(fin[tipo], t.espera + t.dura);
    });
    const orden = [...trozos].sort((a, b) => a.espera - b.espera);
    const ahora = performance.now();
    return { tipo, origen: o, inicio: ahora, fin: fin[tipo] + 240, orden, grietas: 240, pegados: new Set(), zoom: zoomDe(ahora - inicioEscena) };
  }

  function soltarPapelitos(t, cuantos) {
    for (let i = 0; i < cuantos && papelitos.length < 90; i++) {
      papelitos.push({
        x: t.cx + azar(-t.w / 3, t.w / 3), y: t.cy + azar(-t.h / 3, t.h / 3),
        vx: azar(-0.5, 0.5) * u + t.dir[0] * u * 0.6, vy: azar(-0.7, 0.2) * u + t.dir[1] * u * 0.4,
        r: azar(3, 14) * u, g: azar(6), vg: azar(-0.01, 0.01), color: uno([PAPEL, PAPEL, ...COLORES]), vida: 1,
      });
    }
  }

  function pintarPapelitos(dt) {
    papelitos = papelitos.filter((p) => p.vida > 0);
    papelitos.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.0009 * u * dt;
      p.g += p.vg * dt;
      p.vida -= dt / 1500;
      ctx.save();
      ctx.globalAlpha = limitar(p.vida * 3);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.g);
      ctx.scale(1, Math.cos(p.g * 2));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      ctx.restore();
    });
  }

  function pintarEscena(hoja, zoom) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(hoja, 0, 0);
    ctx.restore();
  }

  const zoomDe = (t) => 1 + 0.03 * limitar(t / 9000);

  function pintarGrietas(plan, avance) {
    ctx.save();
    ctx.strokeStyle = PAPEL;
    ctx.lineWidth = 3.5 * u;
    ctx.lineJoin = 'round';
    plan.orden.forEach((t) => {
      if (t.grieta > avance) return;
      trazar(ctx, t.contorno);
      ctx.stroke();
    });
    ctx.restore();
  }

  function pintarTransicion(plan, ahora, dt) {
    const t = ahora - plan.inicio;
    const trasGrietas = t - plan.grietas;
    pintarEscena(siguiente, 1);
    if (t < plan.grietas) {
      pintarEscena(actual, plan.zoom);
      const diag = Math.hypot(W, H);
      plan.orden.forEach((p) => { p.grieta = Math.hypot(p.cx - plan.origen[0], p.cy - plan.origen[1]) / diag; });
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(plan.zoom, plan.zoom);
      ctx.translate(-W / 2, -H / 2);
      pintarGrietas(plan, t / plan.grietas);
      ctx.restore();
      return;
    }
    if (!plan.golpe) {
      plan.golpe = true;
      sacudida = 13 * u;
    }
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(plan.zoom, plan.zoom);
    ctx.translate(-W / 2, -H / 2);
    plan.orden.forEach((p) => {
      const q = limitar((trasGrietas - p.espera) / p.dura);
      if (q >= 1) return;
      if (q > 0 && !plan.pegados.has(p)) {
        plan.pegados.add(p);
        soltarPapelitos(p, 3);
      }
      const e = q * q * (2.6 - 1.6 * q);
      const lift = q > 0 ? Math.min(1, q * 8) : 0;
      ctx.save();
      ctx.translate(p.cx + p.dir[0] * p.lejos * e, p.cy + p.dir[1] * p.lejos * e + 240 * u * e * e);
      ctx.rotate(p.giro * e);
      const esc = 1 + lift * 0.035 + e * 0.55;
      ctx.scale(esc, esc * Math.abs(Math.cos(e * p.volteos * Math.PI)) + 0.0001);
      ctx.drawImage(p.hoja, -p.w / 2, -p.h / 2);
      ctx.restore();
    });
    ctx.restore();
    pintarPapelitos(dt);
    if (trasGrietas >= plan.fin) {
      actual = siguiente;
      siguiente = null;
      trozos = null;
      transicion = null;
      nuevaEspera(ahora);
      preparar();
      cuantas += 1;
      alCambiar?.(cuantas);
    }
  }

  function nuevaEspera(ahora) {
    inicioEscena = ahora;
    duracionEscena = azar(3400, 5000);
  }

  let previo = 0;
  function cuadro(ahora) {
    if (!vivo) return;
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min(ahora - previo, 50);
    previo = ahora;
    ctx.save();
    if (sacudida > 0.2) {
      ctx.translate(azar(-sacudida, sacudida), azar(-sacudida, sacudida));
      sacudida *= 0.86;
    }
    if (transicion) {
      pintarTransicion(transicion, ahora, dt);
    } else {
      pintarEscena(actual, zoomDe(ahora - inicioEscena));
      pintarPapelitos(dt);
      const listo = trozos && siguiente;
      if (listo && (forzar || (!pausado && ahora - inicioEscena > duracionEscena))) {
        transicion = planear(forzar);
        forzar = null;
      }
    }
    ctx.restore();
  }

  async function arrancar() {
    medir();
    const base = await Promise.all([cargar(material.oro), cargar(material.grano)]);
    [oroTextura, grano] = base;
    await document.fonts.load('100px Rye', 'LA TAPATÍA');
    await document.fonts.load('500 25px Archivo', 'Guadalajara');
    const entra = (lista) => Promise.all(lista.map(async (m) => {
      const im = await cargar(m.src);
      if (!im) return;
      pool[m.tipo].push({ ...m, im });
      if (m.tipo === 'galaxia') pool.espacio.push({ ...m, im });
    }));
    const porTipo = (t) => material.imagenes.filter((m) => m.tipo === t);
    const mezcla = (l) => [...l].sort(() => Math.random() - 0.5);
    const primeras = ['ciudad', 'tequila', 'naturaleza', 'galaxia', 'astro'].flatMap((t) => mezcla(porTipo(t)).slice(0, 2));
    const figuras = [...mezcla(porTipo('cuerpo')).slice(0, 4), ...mezcla(porTipo('cabeza')).slice(0, 4)];
    const iniciales = new Set([...primeras, ...figuras]);
    await entra([...iniciales]);
    if (!vivo) return;
    actual = await componer(true);
    canvas.dataset.listo = 'true';
    const ahora = performance.now();
    previo = ahora;
    nuevaEspera(ahora);
    if (reposo) {
      pintarEscena(actual, 1);
      return;
    }
    raf = requestAnimationFrame(cuadro);
    preparar();
    entra(material.imagenes.filter((m) => !iniciales.has(m)));
  }

  let esperaTam = 0;
  const alCambiarTam = () => {
    clearTimeout(esperaTam);
    esperaTam = setTimeout(() => {
      if (!actual) return;
      transicion = null;
      trozos = null;
      siguiente = null;
      papelitos = [];
      generacion += 1;
      medir();
      componer(false).then((hoja) => {
        actual = hoja;
        nuevaEspera(performance.now());
        if (reposo) pintarEscena(actual, 1);
        else preparar();
      });
    }, 250);
  };
  window.addEventListener('resize', alCambiarTam);

  arrancar();

  return {
    rasgar(xCss, yCss) {
      if (reposo || !actual || transicion) return;
      const caja = canvas.getBoundingClientRect();
      forzar = [((xCss - caja.left) / caja.width) * W, ((yCss - caja.top) / caja.height) * H];
    },
    pausar(valor) {
      if (reposo) return true;
      pausado = valor ?? !pausado;
      return pausado;
    },
    destruir() {
      vivo = false;
      cancelAnimationFrame(raf);
      clearTimeout(esperaTam);
      window.removeEventListener('resize', alCambiarTam);
    },
  };
}
