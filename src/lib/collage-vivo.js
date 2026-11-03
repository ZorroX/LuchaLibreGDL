// Collage generativo: compone una escena al azar, la rasga en papel y la mezcla con la siguiente.
import { pintarRotulo, cargarFuentes } from './rotulo-pincel.js';

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

// El molde de cortes: se calcula una vez y puede servir para trocear dos escenas con las mismas formas.
const cortes = (W, H, u, cuantos, opciones) => contornosCompartidos(celdas(W, H, cuantos, opciones.angulo, opciones.estirar), W, H, 26 * u);

async function trocear(escena, polis, u) {
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
function cubrir(ctx, im, x, y, w, h, foco = 0.5, focoY = 0.5) {
  const e = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const iw = im.naturalWidth * e;
  const ih = im.naturalHeight * e;
  ctx.drawImage(im, x + (w - iw) * foco, y + (h - ih) * focoY, iw, ih);
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
  pintarRotulo(ctx, lineas, { x, y, ancho, alto: ctx.canvas.height * 0.36, giro, centrar });
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

/* Papel arrugado: una malla de triángulos que se dobla hacia una bola */
function malla(W, H, centro, radio, vertical) {
  const cols = vertical ? 8 : 12;
  const filas = vertical ? 12 : 8;
  const m = 0.04;
  const cw = (W * (1 + 2 * m)) / cols;
  const ch = (H * (1 + 2 * m)) / filas;
  const pts = [];
  for (let j = 0; j <= filas; j++) {
    for (let i = 0; i <= cols; i++) {
      // Los vértices interiores se mueven un poco para que los pliegues no formen cuadrícula.
      const interior = i > 0 && j > 0 && i < cols && j < filas;
      const x = -W * m + i * cw + (interior ? azar(-0.35, 0.35) * cw : 0);
      const y = -H * m + j * ch + (interior ? azar(-0.35, 0.35) * ch : 0);
      const ang = Math.atan2(y - centro[1], x - centro[0]) + azar(-0.9, 0.9);
      const r = radio * azar(0.2, 1);
      pts.push({ x, y, z: azar(-1, 1), bx: centro[0] + Math.cos(ang) * r, by: centro[1] + Math.sin(ang) * r, nx: azar(-1, 1), ny: azar(-1, 1) });
    }
  }
  // Cada cara recibe luz según su inclinación, como papel arrugado alumbrado desde arriba a la izquierda.
  const alto = Math.min(cw, ch) * 0.45;
  const L = [-0.45, -0.6, 0.66];
  const luzDe = ([a, b, c]) => {
    const e1 = [b.x - a.x, b.y - a.y, (b.z - a.z) * alto];
    const e2 = [c.x - a.x, c.y - a.y, (c.z - a.z) * alto];
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const l = Math.hypot(...n) || 1;
    n = n.map((v) => (v / l) * Math.sign(n[2] || 1));
    return limitar((n[0] * L[0] + n[1] * L[1] + n[2] * L[2] - L[2]) * 3, -1, 1);
  };
  const tris = [];
  for (let j = 0; j < filas; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const c = a + cols + 1;
      const pares = (i + j) % 2 ? [[a, a + 1, c + 1], [a, c + 1, c]] : [[a, a + 1, c], [a + 1, c + 1, c]];
      pares.forEach((v) => tris.push({ v, luz: luzDe(v.map((k) => pts[k])) }));
    }
  }
  return { pts, tris };
}

// Pinta un triángulo de la imagen deformado a su nueva posición. Si quedó volteado se ve el revés del papel.
function triangulo(ctx, img, [a, b, c], d, luz) {
  const [[u0, v0], [u1, v1], [u2, v2]] = d;
  const den = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
  const area = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
  if (!den || Math.abs(area) < 0.5) return;
  const cx = (u0 + u1 + u2) / 3;
  const cy = (v0 + v1 + v2) / 3;
  ctx.save();
  ctx.beginPath();
  d.forEach(([x, y], i) => {
    const l = Math.hypot(x - cx, y - cy) || 1;
    const px = x + ((x - cx) / l) * 0.9;
    const py = y + ((y - cy) / l) * 0.9;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  });
  ctx.closePath();
  ctx.clip();
  if (Math.sign(den) !== Math.sign(area)) {
    ctx.fillStyle = PAPEL;
    ctx.fill();
    luz = -0.12 - Math.abs(luz) * 0.5;
  } else {
    const ma = ((u1 - u0) * (c.y - a.y) - (u2 - u0) * (b.y - a.y)) / den;
    const mb = ((v1 - v0) * (c.y - a.y) - (v2 - v0) * (b.y - a.y)) / den;
    const mc = ((u2 - u0) * (b.x - a.x) - (u1 - u0) * (c.x - a.x)) / den;
    const md = ((v2 - v0) * (b.x - a.x) - (v1 - v0) * (c.x - a.x)) / den;
    ctx.save();
    ctx.transform(ma, mb, mc, md, u0 - ma * a.x - mc * a.y, v0 - mb * a.x - md * a.y);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
  if (luz) {
    ctx.fillStyle = luz > 0 ? `rgba(255,250,235,${luz * 0.6})` : `rgba(0,0,0,${-luz})`;
    ctx.fill();
  }
  ctx.restore();
}

// k: cuánto se ha hecho bola (0 plano, 1 bola). ruido: arrugas en píxeles. luz: fuerza de los pliegues.
function pintarMalla(ctx, img, { pts, tris }, k, ruido, luz) {
  const e = k * k * (3 - 2 * k);
  const pos = pts.map((p) => [p.x + (p.bx - p.x) * e + p.nx * ruido, p.y + (p.by - p.y) * e + p.ny * ruido]);
  for (const t of tris) triangulo(ctx, img, t.v.map((i) => pts[i]), t.v.map((i) => pos[i]), t.luz * luz);
}

/* Motor */
// plantillas: cuáles se usan (la primera abre); espera: cuánto dura cada escena quieta, en ms.
// Las imágenes de tipo foto son las de la página: se pegan completas, sin recortar la figura.
export function iniciarCollage(canvas, material, { alCambiar, plantillas: elegidas, espera = [3400, 5000] } = {}) {
  const ctx = canvas.getContext('2d');
  const reposo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pool = { ciudad: [], tequila: [], naturaleza: [], espacio: [], galaxia: [], astro: [], cuerpo: [], cabeza: [], foto: [] };
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
  let proximoTipo = null;
  const siguienteTipo = baraja(['rasgar', 'rasgar', 'arrugar', 'extender', 'pegar', 'pegar', 'estallar', 'mezcla', 'barrer', 'deshojar']);
  const siguienteFrase = baraja(material.frases);
  const siguienteNota = baraja(material.notas);
  const siguientePlantilla = baraja(elegidas ?? ['retablo', 'duelo', 'cosmos', 'muro', 'cartel']);
  let visible = true;
  const vigia = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  vigia.observe(canvas);

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
  const imagenEn = (x, y, w, h, im, modo = 'natural', focoY = 0.5) => (c) => {
    cubrir(c, im, x - 20, y - 20, w + 40, h + 40, azar(0.3, 0.7), focoY);
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
          const lleno = pool.foto.length && azar() < 0.55
            ? imagenEn(x, y, w, h, f('foto').im, uno(['natural', 'natural', 'bn']), 0.3)
            : azar() > 0.55 ? imagenEn(x, y, w, h, (azar() > 0.5 ? lugar() : cualquiera()).im, uno(['natural', 'bn'])) : conFigura(x, y, w, h, uno(COLORES), fig(azar() > 0.45 ? 'cabeza' : 'cuerpo'));
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
    // La foto de la página al frente, enmarcada en oro y rayos; el rótulo a un lado.
    async portada(c, lineas) {
      cielo(c, uno(['bn', 'bn', ...TINTES]));
      const px = vertical ? W * 0.12 : W * 0.53;
      const pw = vertical ? W * 0.76 : W * 0.38;
      const py = vertical ? H * 0.3 : H * 0.08;
      const ph = vertical ? H * 0.52 : H * 0.84;
      await rayos(c, px + pw / 2, py + ph * 0.42, 90 * u, Math.max(pw, ph) * 0.78, u, f(uno(['naturaleza', 'espacio'])).im, 12);
      panel(c, px - pw * 0.07, py - ph * 0.05, pw * 1.14, ph * 1.1, (k) => oro(k, oroTextura, px - pw * 0.12, py - ph * 0.1, pw * 1.24, ph * 1.2), azar(-0.06, 0.06));
      await respiro();
      panel(c, px, py, pw, ph, imagenEn(px, py, pw, ph, f('foto').im, 'natural', 0.25), azar(-0.03, 0.03));
      if (pool.foto.length > 1) {
        const sx = vertical ? W * 0.04 : W * 0.38;
        const sy = vertical ? H * 0.6 : H * 0.48;
        const sw = vertical ? W * 0.4 : W * 0.19;
        const sh = vertical ? H * 0.26 : H * 0.44;
        panel(c, sx, sy, sw, sh, imagenEn(sx, sy, sw, sh, f('foto').im, 'bn', 0.25), azar(-0.09, 0.09));
      }
      await respiro();
      rotulo(c, lineas, vertical ? W / 2 : W * 0.27, H * (vertical ? 0.09 : 0.12), W * (vertical ? 0.9 : 0.46), { giro: azar(-0.04, 0.02) });
      if (!vertical) nota(c, siguienteNota(), W * 0.84, H * 0.74, u);
    },
    // Tiras verticales: fotos de la página alternadas con oro y ciudad entintada.
    async tira(c, lineas) {
      cielo(c, 'bn');
      const n = vertical ? 3 : 5;
      const w = W / n;
      for (let i = 0; i < n; i++) {
        const x = i * w - w * 0.03;
        const foto = i % 2 || !pool.foto.length ? null : f('foto');
        const lleno = foto
          ? imagenEn(x, -40, w * 1.06, H + 80, foto.im, uno(['natural', 'natural', 'bn']), 0.3)
          : azar() < 0.5 ? (k) => oro(k, oroTextura, x - 30, -60, w + 60, H + 120) : imagenEn(x, -40, w * 1.06, H + 80, lugar().im, uno(TINTES));
        panel(c, x, -40, w * 1.06, H + 80, lleno, azar(-0.035, 0.035));
        if (i % 2) await respiro();
      }
      rotulo(c, lineas, W / 2, H * (vertical ? 0.09 : 0.08), W * (vertical ? 0.9 : 0.62), { giro: azar(-0.03, 0.03) });
    },
  };

  async function componer(primera) {
    const hoja = lienzo(W, H);
    const c = hoja.getContext('2d');
    const nombre = primera ? elegidas?.[0] ?? 'retablo' : siguientePlantilla();
    await plantillas[nombre](c, primera ? material.frases[0] : siguienteFrase(), primera);
    c.save();
    c.globalCompositeOperation = 'overlay';
    c.globalAlpha = 0.16;
    c.fillStyle = c.createPattern(grano, 'repeat');
    c.fillRect(0, 0, W, H);
    c.restore();
    return hoja;
  }

  // Los trozos de la escena actual vuelan. En pegar, ambas escenas se cortan con el mismo molde:
  // cada trozo viejo se arranca y en su hueco cae el trozo nuevo de la misma forma.
  const RELEVO = 260;
  const VUELAN = new Set(['estallar', 'mezcla', 'barrer', 'deshojar']);
  const conTrozos = (tipo) => VUELAN.has(tipo) || tipo === 'pegar';

  async function preparar() {
    const turno = ++generacion;
    await respiro();
    const tipo = siguienteTipo();
    const proxima = await componer(false);
    await respiro();
    let nuevos = null;
    if (conTrozos(tipo)) {
      const largos = azar() > 0.68;
      const modo = { angulo: azar(Math.PI), estirar: largos ? azar(2.6, 3.8) : azar(1, 1.6) };
      const cuantos = tipo === 'pegar' ? (vertical ? 12 : 20) : (vertical ? 18 : 30);
      const molde = cortes(W, H, u, cuantos, modo);
      nuevos = await trocear(tipo === 'pegar' ? proxima : actual, molde, u);
      if (tipo === 'pegar') {
        const viejos = await trocear(actual, molde, u);
        nuevos.forEach((t, i) => (t.viejo = viejos[i]));
      }
    }
    if (turno !== generacion) return;
    trozos = nuevos;
    siguiente = proxima;
    proximoTipo = tipo;
  }

  const listo = () => siguiente && (trozos || !conTrozos(proximoTipo));

  function planRasgado(o) {
    const diag = Math.hypot(W, H);
    const ang = azar() < 0.7 ? Math.PI / 2 + azar(-0.45, 0.45) : azar(-0.35, 0.35);
    const d = [Math.cos(ang), Math.sin(ang)];
    const n = [-d[1], d[0]];
    const a = [o[0] - d[0] * diag, o[1] - d[1] * diag];
    const b = [o[0] + d[0] * diag, o[1] + d[1] * diag];
    const camino = quebrar(a, b, 60 * u, 9);
    camino.push(b);
    const dentro = camino.map((p, i) => (p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H ? i : -1)).filter((i) => i >= 0);
    const lejos = (s) => [[b[0] + n[0] * diag * 2 * s, b[1] + n[1] * diag * 2 * s], [a[0] + n[0] * diag * 2 * s, a[1] + n[1] * diag * 2 * s]];
    const mitad = (s, fibra) => {
      const hoja = lienzo(W, H);
      const c = hoja.getContext('2d');
      trazar(c, [...camino, ...lejos(s)]);
      c.clip();
      c.drawImage(actual, 0, 0);
      // El alma blanca del papel asoma por el borde roto.
      c.strokeStyle = PAPEL;
      c.lineJoin = 'round';
      c.lineWidth = fibra * u;
      c.beginPath();
      camino.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.stroke();
      c.lineWidth = 1.2 * u;
      for (let i = 0; i < camino.length - 1; i += 2) {
        const [x, y] = camino[i];
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + n[0] * s * azar(2, 8) * u + azar(-3, 3) * u, y + n[1] * s * azar(2, 8) * u + azar(-3, 3) * u);
        c.stroke();
      }
      return hoja;
    };
    return {
      camino, n, desde: dentro[0] ?? 0, hasta: dentro[dentro.length - 1] ?? camino.length - 1,
      mitades: [mitad(1, 11), mitad(-1, 5)], fin: 1650, giro: azar(0.25, 0.6) * (azar() < 0.5 ? -1 : 1),
    };
  }

  function planear(origen) {
    const ahora = performance.now();
    const zoom = zoomDe(ahora - inicioEscena);
    let tipo = proximoTipo;
    if (origen && (tipo === 'mezcla' || tipo === 'barrer' || tipo === 'deshojar')) tipo = 'estallar';
    const centro = [azar(W * 0.25, W * 0.75), azar(H * 0.25, H * 0.75)];
    const radio = Math.min(W, H) * azar(0.12, 0.17);
    const fuera = () => {
      const a = azar(Math.PI * 2);
      return [Math.cos(a), Math.sin(a) - 0.3];
    };
    if (tipo === 'rasgar') return { tipo, inicio: ahora, zoom, ...planRasgado(origen ?? centro) };
    if (tipo === 'arrugar') {
      const o = origen ?? centro;
      return { tipo, inicio: ahora, zoom, o, fin: 1900, vieja: malla(W, H, o, radio, vertical), nueva: malla(W, H, o, 0, vertical), lanza: fuera(), giro: azar(-5, 5) };
    }
    if (tipo === 'extender') {
      const o = origen ?? [W / 2 + azar(-0.15, 0.15) * W, H / 2 + azar(-0.15, 0.15) * H];
      return { tipo, inicio: ahora, zoom, o, radio, fin: 2100, malla: malla(W, H, o, radio, vertical), desde: fuera(), giro: azar(-4, 4) };
    }

    const o = origen ?? [azar(W), azar(H)];
    const diag = Math.hypot(W, H);
    let fin = 0;
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
      if (tipo === 'pegar') {
        t.giro = azar(-0.45, 0.45);
        t.lejos = azar(60, 170) * u;
        t.dura = azar(420, 640);
        t.espera = (d / diag) * 1400 + azar(260);
      } else if (tipo === 'mezcla') t.espera = azar() > 0.45 ? (d / diag) * 1000 : 2500 + azar(1000);
      else if (tipo === 'barrer') t.espera = ((t.cx * Math.cos(anguloBarrido) + t.cy * Math.sin(anguloBarrido)) / diag + 1) * 900 - 450 + azar(160);
      else if (tipo === 'deshojar') t.espera = azar(1500);
      else t.espera = (d / diag) * 1300 + azar(200);
      fin = Math.max(fin, t.espera + t.dura);
    });
    const orden = [...trozos].sort((a, b) => a.espera - b.espera);
    return { tipo, origen: o, inicio: ahora, fin: fin + (tipo === 'pegar' ? 450 + RELEVO + 240 : 240), orden, grietas: 240, pegados: new Set(), zoom };
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

  function conZoom(zoom, pintar) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    pintar();
    ctx.restore();
  }

  const pintarEscena = (hoja, zoom) => conZoom(zoom, () => ctx.drawImage(hoja, 0, 0));

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

  // Cada pintor dibuja su cuadro y devuelve true cuando la escena nueva ya quedó completa.
  function pintarVuelo(plan, t) {
    const trasGrietas = t - plan.grietas;
    pintarEscena(siguiente, 1);
    if (t < plan.grietas) {
      pintarEscena(actual, plan.zoom);
      const diag = Math.hypot(W, H);
      plan.orden.forEach((p) => { p.grieta = Math.hypot(p.cx - plan.origen[0], p.cy - plan.origen[1]) / diag; });
      conZoom(plan.zoom, () => pintarGrietas(plan, t / plan.grietas));
      return false;
    }
    if (!plan.golpe) {
      plan.golpe = true;
      sacudida = 13 * u;
    }
    conZoom(plan.zoom, () => plan.orden.forEach((p) => {
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
    }));
    return trasGrietas >= plan.fin;
  }

  // Primero se marcan los cortes. Luego cada trozo viejo se despega y sale volando, y RELEVO ms después
  // baja el trozo nuevo con la misma forma y se asienta en el hueco con un golpe.
  function pintarPegado(plan, t) {
    const tt = t - plan.grietas;
    if (tt < 0) {
      pintarEscena(actual, plan.zoom);
      const diag = Math.hypot(W, H);
      plan.orden.forEach((p) => { p.grieta = Math.hypot(p.cx - plan.origen[0], p.cy - plan.origen[1]) / diag; });
      conZoom(plan.zoom, () => pintarGrietas(plan, t / plan.grietas));
      return false;
    }
    // El zoom de la escena vieja regresa a 1 durante la transición, para que los moldes embonen con la nueva.
    const zoom = 1 + (plan.zoom - 1) * (1 - limitar(tt / (plan.fin - plan.grietas)));
    conZoom(zoom, () => {
      ctx.fillStyle = '#0d0c10';
      ctx.fillRect(0, 0, W, H);
      const quietos = [];
      const arrancados = [];
      const pegados = [];
      const bajando = [];
      for (const p of plan.orden) {
        const qv = (tt - p.espera) / 650;
        const qn = limitar((tt - p.espera - RELEVO) / p.dura);
        if (qv <= 0) quietos.push(p.viejo);
        else if (qv < 1) arrancados.push([p.viejo, qv, p]);
        if (qn >= 1) pegados.push(p);
        else if (qn > 0) bajando.push([p, qn]);
      }
      quietos.forEach((v) => ctx.drawImage(v.hoja, v.x0, v.y0));
      pegados.forEach((p) => {
        if (!plan.pegados.has(p)) {
          plan.pegados.add(p);
          sacudida = Math.max(sacudida, 4 * u);
          soltarPapelitos(p, 2);
        }
        ctx.drawImage(p.hoja, p.x0, p.y0);
      });
      arrancados.forEach(([v, q, p]) => {
        const e = q * q;
        ctx.save();
        ctx.globalAlpha = limitar((1 - q) * 5);
        ctx.translate(v.cx + p.dir[0] * p.lejos * 6 * e, v.cy + p.dir[1] * p.lejos * 6 * e + 260 * u * e - 30 * u * Math.sin(q * Math.PI));
        ctx.rotate(-p.giro * 2.5 * e);
        const esc = 1 + 0.25 * Math.sin(Math.min(q * 2, 1) * Math.PI * 0.5);
        ctx.scale(esc, esc * Math.abs(Math.cos(e * 1.4)) + 0.0001);
        ctx.shadowColor = 'rgba(0,0,0,.45)';
        ctx.shadowBlur = 30 * u * q;
        ctx.shadowOffsetY = 24 * u * q;
        ctx.drawImage(v.hoja, -v.w / 2, -v.h / 2);
        ctx.restore();
      });
      bajando.forEach(([p, q]) => {
        const alto = (1 - q) ** 2;
        ctx.save();
        ctx.globalAlpha = limitar(q * 12);
        ctx.translate(p.cx - p.dir[0] * p.lejos * alto, p.cy - p.dir[1] * p.lejos * alto - 40 * u * alto);
        ctx.rotate(p.giro * alto);
        const esc = 1 + 0.45 * alto;
        ctx.scale(esc, esc);
        ctx.shadowColor = 'rgba(0,0,0,.45)';
        ctx.shadowBlur = 40 * u * alto;
        ctx.shadowOffsetX = 26 * u * alto;
        ctx.shadowOffsetY = 34 * u * alto;
        ctx.drawImage(p.hoja, -p.w / 2, -p.h / 2);
        ctx.restore();
      });
    });
    const fundido = limitar((t - (plan.fin - 420)) / 420);
    if (fundido > 0) {
      ctx.save();
      ctx.globalAlpha = fundido;
      ctx.drawImage(siguiente, 0, 0);
      ctx.restore();
    }
    return t >= plan.fin;
  }

  // El papel se rompe a lo largo de una línea quebrada y las dos mitades se abren y caen.
  function pintarRasgado(plan, t) {
    pintarEscena(siguiente, 1);
    const T1 = 700;
    const avance = limitar(t / T1);
    const i = Math.round(plan.desde + (plan.hasta - plan.desde) * avance);
    const frente = plan.camino[Math.min(i, plan.camino.length - 1)];
    const abre = 0.05 * avance ** 1.6;
    const q = limitar((t - T1) / (plan.fin - T1));
    const e = q * q;
    if (q > 0 && !plan.golpe) {
      plan.golpe = true;
      sacudida = 9 * u;
      for (let k = plan.desde; k <= plan.hasta; k += Math.ceil((plan.hasta - plan.desde) / 14) || 1) {
        const [x, y] = plan.camino[k];
        soltarPapelitos({ cx: x, cy: y, w: 30 * u, h: 30 * u, dir: [plan.n[0] * (k % 2 ? 1 : -1), plan.n[1]] }, 1);
      }
    }
    const [nx, ny] = plan.n;
    const diag = Math.hypot(W, H);
    conZoom(plan.zoom, () => plan.mitades.forEach((hoja, k) => {
      const s = k ? -1 : 1;
      ctx.save();
      ctx.translate(frente[0] + nx * s * diag * 0.75 * e, frente[1] + ny * s * diag * 0.75 * e + H * 0.35 * e);
      ctx.rotate(-s * abre - s * plan.giro * e * (k ? 0.6 : 1));
      if (!k && q > 0) {
        // La mitad grande se enrosca un poco al despegarse.
        const a = Math.atan2(ny, nx);
        ctx.rotate(a);
        ctx.scale(1 - 0.35 * e, 1);
        ctx.rotate(-a);
      }
      ctx.translate(-frente[0], -frente[1]);
      ctx.drawImage(hoja, 0, 0);
      ctx.restore();
    }));
    return t >= plan.fin;
  }

  // La hoja se hace bola y sale volando; debajo, la nueva se alisa como papel recién extendido.
  function pintarArrugado(plan, t) {
    const T1 = 950;
    const arrugas = 1 - limitar((t - 450) / (plan.fin - 450));
    if (arrugas > 0) pintarMalla(ctx, siguiente, plan.nueva, 0, Math.min(W, H) * 0.012 * arrugas, 0.32 * arrugas);
    else pintarEscena(siguiente, 1);
    const k = limitar(t / T1);
    const q = limitar((t - T1) / (plan.fin - 150 - T1));
    if (q >= 1) return t >= plan.fin;
    const diag = Math.hypot(W, H);
    const [ox, oy] = plan.o;
    conZoom(plan.zoom, () => {
      ctx.translate(ox + plan.lanza[0] * diag * q, oy + plan.lanza[1] * diag * q + H * 0.9 * q * q);
      ctx.rotate(plan.giro * q);
      ctx.scale(1 - 0.3 * q, 1 - 0.3 * q);
      ctx.translate(-ox, -oy);
      pintarMalla(ctx, actual, plan.vieja, k, Math.min(W, H) * 0.035 * k, 0.42 * k);
    });
    return false;
  }

  // Una bola de papel entra rodando y se extiende sobre la escena hasta cubrirla.
  function pintarExtendido(plan, t) {
    pintarEscena(actual, plan.zoom);
    const T0 = 450;
    const T1 = 1600;
    const [ox, oy] = plan.o;
    const diag = Math.hypot(W, H);
    let k = 1;
    if (t < T0) {
      const q = 1 - (1 - t / T0) ** 3;
      ctx.save();
      ctx.translate(ox + plan.desde[0] * diag * 0.7 * (1 - q), oy + plan.desde[1] * diag * 0.7 * (1 - q));
      ctx.rotate(plan.giro * (1 - q));
      ctx.translate(-ox, -oy);
    } else {
      const q = limitar((t - T0) / (T1 - T0));
      k = 1 - (1 - (1 - q) ** 3);
      if (!plan.golpe) {
        plan.golpe = true;
        sacudida = 6 * u;
      }
    }
    if (k > 0.4) {
      const g = ctx.createRadialGradient(ox + 10 * u, oy + plan.radio * 0.9, 0, ox + 10 * u, oy + plan.radio * 0.9, plan.radio * 1.3);
      g.addColorStop(0, `rgba(0,0,0,${0.45 * k})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(ox - plan.radio * 2, oy - plan.radio, plan.radio * 4, plan.radio * 3);
    }
    const arrugas = Math.max(k, 0.55 * (1 - limitar((t - T0) / (plan.fin - T0))));
    pintarMalla(ctx, siguiente, plan.malla, k, Math.min(W, H) * (0.035 * k + 0.012 * arrugas), 0.42 * arrugas);
    if (t < T0) ctx.restore();
    return t >= plan.fin;
  }

  const PINTORES = { pegar: pintarPegado, rasgar: pintarRasgado, arrugar: pintarArrugado, extender: pintarExtendido };

  function pintarTransicion(plan, ahora, dt) {
    const terminada = (PINTORES[plan.tipo] ?? pintarVuelo)(plan, ahora - plan.inicio);
    pintarPapelitos(dt);
    if (terminada) {
      actual = siguiente;
      siguiente = null;
      trozos = null;
      transicion = null;
      delete canvas.dataset.transicion;
      nuevaEspera(ahora);
      preparar();
      cuantas += 1;
      alCambiar?.(cuantas);
    }
  }

  function nuevaEspera(ahora) {
    inicioEscena = ahora;
    duracionEscena = azar(espera[0], espera[1]);
  }

  let previo = 0;
  function cuadro(ahora) {
    if (!vivo) return;
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min(ahora - previo, 50);
    previo = ahora;
    // Fuera de la pantalla no se pinta, y la escena quieta no gasta su turno.
    if (!visible && !transicion) {
      inicioEscena += dt;
      return;
    }
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
      if (listo() && (forzar || (!pausado && ahora - inicioEscena > duracionEscena))) {
        transicion = planear(forzar);
        canvas.dataset.transicion = transicion.tipo;
        forzar = null;
      }
    }
    ctx.restore();
  }

  async function arrancar() {
    medir();
    const base = await Promise.all([cargar(material.oro), cargar(material.grano)]);
    [oroTextura, grano] = base;
    await cargarFuentes();
    await document.fonts.load('500 25px Archivo', 'Guadalajara');
    const entra = (lista) => Promise.all(lista.map(async (m) => {
      const im = await cargar(m.src);
      if (!im) return;
      pool[m.tipo].push({ ...m, im });
      if (m.tipo === 'galaxia') pool.espacio.push({ ...m, im });
    }));
    const porTipo = (t) => material.imagenes.filter((m) => m.tipo === t);
    const mezcla = (l) => [...l].sort(() => Math.random() - 0.5);
    const primeras = [...porTipo('foto').slice(0, 3), ...['ciudad', 'tequila', 'naturaleza', 'galaxia', 'astro'].flatMap((t) => mezcla(porTipo(t)).slice(0, 2))];
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
      vigia.disconnect();
      clearTimeout(esperaTam);
      window.removeEventListener('resize', alCambiarTam);
    },
  };
}
