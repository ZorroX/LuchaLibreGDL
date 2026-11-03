// Rótulo pintado a mano: letra por letra, con pincelada seca, sombra corrida, filete y destellos.
const azar = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const uno = (lista) => lista[Math.floor(Math.random() * lista.length)];
const lienzo = (w, h) => Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.ceil(w)), height: Math.max(1, Math.ceil(h)) });
const PESOS = { pincel: 400, bloque: 900 };
const fuente = (tipo, fs) => (tipo === 'letra' ? `${fs}px Yellowtail` : `${PESOS[tipo]} ${fs}px "Londrina Solid"`);

export const cargarFuentes = () => Promise.all([
  document.fonts.load(fuente('pincel', 100), 'LA TAPATÍA'),
  document.fonts.load(fuente('bloque', 100), 'LA TAPATÍA'),
  document.fonts.load(fuente('letra', 100), 'Tapatía'),
]);

// tipo: pincel y bloque son la misma letra en dos pesos; letra es la cursiva.
// abajo: color de la mitad inferior, pintado con cerdas sobre el relleno.
// corre: hacia dónde cae la sombra, en fracción del tamaño de letra.
const TINTAS = {
  amarillo: { tipo: 'pincel', relleno: '#fbc913', sombra: '#b3161c', corre: [0.085, 0.07] },
  fuego: { tipo: 'pincel', relleno: '#fbc913', abajo: '#d81f1a', sombra: '#8e1016', corre: [0.08, 0.065] },
  brasa: { tipo: 'pincel', relleno: '#f45b3c', abajo: '#a3141c', sombra: '#fbc913', corre: [-0.075, -0.03] },
  letrero: { tipo: 'bloque', relleno: '#e0291e', sombra: '#fbc913', corre: [-0.05, 0.065], extruir: true, filete: '#b81a14', brillo: '#fff3d1' },
  azul: { tipo: 'letra', relleno: '#4a7be0', abajo: '#2a52b0', sombra: '#14275c', corre: [0.025, 0.04], filete: '#f6f2e8', brillo: '#ffffff', rubrica: '#e0291e' },
};

// Cada estilo decide la tinta de cada línea; la línea más grande es la que lleva la pincelada.
const ESTILOS = {
  barrio: (i, n, mayor) => (i === mayor ? TINTAS.fuego : TINTAS.amarillo),
  brasa: (i, n, mayor) => (i === mayor ? TINTAS.brasa : TINTAS.amarillo),
  letrero: (i, n) => (n > 1 && i === n - 1 ? TINTAS.azul : TINTAS.letrero),
  // Para fondo rojo: amarillo con sombra vino y la pincelada en papel.
  grito: (i, n, mayor) => ({ ...TINTAS.amarillo, sombra: '#5e0a0e', ...(i === mayor && { abajo: '#f6f2e8' }) }),
};
// Los que salen al azar; grito solo se pide a propósito.
export const ESTILOS_ROTULO = ['barrio', 'brasa', 'letrero'];

const aLetra = (t) => {
  const bajo = t.toLocaleLowerCase('es-MX');
  return bajo.charAt(0).toLocaleUpperCase('es-MX') + bajo.slice(1);
};

function teñir(origen, color) {
  const c = lienzo(origen.width, origen.height);
  const x = c.getContext('2d');
  x.drawImage(origen, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

// Una cerda horizontal: arranca en un lado de la letra y se le acaba la pintura en el camino.
function cerda(x, x0, y, largo, ancho, alfa) {
  x.globalAlpha = alfa;
  x.lineWidth = ancho;
  x.beginPath();
  let t = 0;
  while (t < largo) {
    const tramo = largo * azar(0.25, 0.8);
    x.moveTo(x0 + t, y + azar(-0.3, 0.3) * ancho);
    t = Math.min(largo, t + tramo);
    x.lineTo(x0 + t, y + azar(-0.3, 0.3) * ancho);
    t += azar() < 0.35 ? largo * azar(0.03, 0.12) : 0;
  }
  x.stroke();
}

// Barrido de cerdas dentro de la caja de una letra, girado como el trazo del pincel.
function barrido(x, caja, fs, { y, banda, hacia, color, n, grosor = [0.004, 0.012], alfa = [0.55, 1] }) {
  x.save();
  x.translate(caja.x + caja.w / 2, y);
  x.rotate(caja.giro);
  x.strokeStyle = color;
  const w = caja.w * 1.5;
  for (let i = 0; i < n; i++) {
    const d = hacia * banda * azar() ** 1.7;
    const desdeIzq = azar() < 0.7;
    const largo = w * azar(0.15, 0.85) ** 1.3;
    cerda(x, desdeIzq ? -w / 2 : w / 2 - largo, d, largo, fs * azar(grosor[0], grosor[1]), azar(alfa[0], alfa[1]));
  }
  x.restore();
  x.globalAlpha = 1;
}

// Pincelada de dos tonos: la parte baja en otro color y la frontera hecha de cerdas que se cruzan.
function partir(c, cajas, fs, tinta) {
  const x = c.getContext('2d');
  x.globalCompositeOperation = 'source-atop';
  x.lineCap = 'round';
  for (const caja of cajas) {
    const corte = caja.y + caja.h * azar(0.45, 0.6);
    const tramo = { ...caja, giro: caja.giro + azar(-0.16, 0.16) };
    x.save();
    x.translate(caja.x + caja.w / 2, corte);
    x.rotate(tramo.giro);
    x.fillStyle = tinta.abajo;
    x.fillRect(-caja.w, fs * 0.01, caja.w * 2, caja.h * 1.5);
    x.restore();
    const banda = fs * azar(0.07, 0.13);
    barrido(x, tramo, fs, { y: corte + fs * 0.012, banda, hacia: -1, color: tinta.abajo, n: 20, grosor: [0.006, 0.02], alfa: [0.8, 1] });
    barrido(x, tramo, fs, { y: corte + fs * 0.012, banda: banda * 0.5, hacia: 1, color: tinta.relleno, n: 9, grosor: [0.005, 0.014], alfa: [0.8, 1] });
  }
}

// Pincel seco: cerdas sin pintura que deshilachan un lado de cada trazo y a veces lo cruzan.
// lado: 1 deshilacha por la derecha, -1 por la izquierda, 0 al azar.
function secar(c, cajas, fs, { lado = 0, puntas, largo, rayas = 0 }) {
  const x = c.getContext('2d');
  x.globalCompositeOperation = 'destination-out';
  x.lineCap = 'round';
  x.strokeStyle = '#000';
  for (const caja of cajas) {
    const m = Math.round(puntas * azar(0.6, 1.4));
    for (let i = 0; i < m; i++) {
      const derecha = lado ? lado > 0 : azar() < 0.5;
      const l = fs * azar(largo[0], largo[1]);
      const py = caja.y + caja.h * azar(0.04, 0.96);
      x.save();
      x.translate(derecha ? caja.x + caja.w + fs * 0.03 : caja.x - fs * 0.03, py);
      x.rotate(caja.giro);
      x.globalAlpha = azar(0.8, 1);
      x.lineWidth = fs * azar(0.004, 0.011);
      x.beginPath();
      x.moveTo(derecha ? -l : l, 0);
      x.lineTo(0, azar(-0.006, 0.006) * fs);
      x.stroke();
      x.restore();
    }
    if (azar() < rayas) barrido(x, caja, fs, { y: caja.y + caja.h * azar(0.15, 0.85), banda: 0, hacia: 1, color: '#000', n: 1, grosor: [0.003, 0.007], alfa: [0.7, 1] });
  }
  x.globalAlpha = 1;
}

// Brillo de rotulista: una línea clara por dentro del lado superior izquierdo de cada trazo.
function abrillantar(c, mascara, fs, color) {
  const h = fs * 0.04;
  const filo = lienzo(mascara.width, mascara.height);
  const f = filo.getContext('2d');
  f.drawImage(mascara, 0, 0);
  f.globalCompositeOperation = 'destination-out';
  f.drawImage(mascara, h * 0.6, h * 0.75);
  const x = c.getContext('2d');
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = 0.92;
  x.drawImage(teñir(filo, color), h * 1.1, h * 1.3);
  x.globalAlpha = 1;
}

function rubrica(x, x0, x1, y, fs, color) {
  const pts = [];
  const n = 40;
  const alto = fs * 0.22;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x0 + (x1 - x0) * t;
    const py = y + alto * (1 - (2 * t - 1) ** 2) * 0.35 - alto * t;
    const g = fs * 0.07 * Math.sin(Math.PI * t) ** 0.8;
    pts.push([px, py, g]);
  }
  x.fillStyle = color;
  x.beginPath();
  pts.forEach(([px, py, g], i) => (i ? x.lineTo(px, py - g) : x.moveTo(px, py - g)));
  [...pts].reverse().forEach(([px, py, g]) => x.lineTo(px, py + g * 0.6));
  x.closePath();
  x.fill();
}

// Destello de cuatro puntas largas y cuatro cortas, delgado como trazo de pincel fino.
function destello(x, cx, cy, r, color) {
  const brazo = (rx, ry, k) => {
    x.beginPath();
    x.moveTo(0, -ry);
    x.quadraticCurveTo(k, -k, rx, 0);
    x.quadraticCurveTo(k, k, 0, ry);
    x.quadraticCurveTo(-k, k, -rx, 0);
    x.quadraticCurveTo(-k, -k, 0, -ry);
    x.fill();
  };
  x.save();
  x.fillStyle = color;
  x.translate(cx, cy);
  x.rotate(azar(-0.25, 0.25));
  brazo(r * 0.8, r, r * 0.035);
  x.rotate(Math.PI / 4);
  brazo(r * 0.4, r * 0.4, r * 0.03);
  x.restore();
}

function medir(x, texto, tipo) {
  x.font = fuente(tipo, 100);
  const m = x.measureText(texto);
  const linea = { texto, tipo, total: m.width, sube: m.actualBoundingBoxAscent, baja: m.actualBoundingBoxDescent, glifos: [] };
  if (tipo === 'letra') return linea;
  let antes = 0;
  for (let i = 0; i < texto.length; i++) {
    const hasta = x.measureText(texto.slice(0, i + 1)).width;
    linea.glifos.push({ ch: texto[i], x: antes, w: hasta - antes });
    antes = hasta;
  }
  return linea;
}

function pintarLinea(destino, l, cx, base) {
  const { fs, tinta, tipo } = l;
  const k = fs / 100;
  const M = fs * 0.34;
  const sube = l.sube * k;
  const baja = l.baja * k;
  const lw = l.total * k + M * 2;
  const lh = sube + baja + M * 2;
  const oy = M + sube;
  const mascara = lienzo(lw, lh);
  const m = mascara.getContext('2d');
  m.fillStyle = '#fff';
  m.font = fuente(tipo, fs);
  m.textAlign = 'center';
  const cajas = [];
  if (tipo === 'letra') {
    const giro = -0.035;
    m.save();
    m.translate(lw / 2, oy);
    m.rotate(giro);
    m.fillText(l.texto, 0, 0);
    m.restore();
    for (let i = 0; i < 4; i++) cajas.push({ x: M + (l.total * k * i) / 4, y: oy - fs * 0.5, w: (l.total * k) / 4, h: fs * 0.55, giro });
  } else {
    for (const g of l.glifos) {
      const gx = M + (g.x + g.w / 2) * k;
      const gy = oy + azar(-0.035, 0.035) * fs;
      const giro = azar(-0.055, 0.055);
      const s = azar(0.95, 1.06);
      m.save();
      m.translate(gx, gy);
      m.rotate(giro);
      m.scale(s, s * azar(0.97, 1.05));
      m.fillText(g.ch, 0, 0);
      m.restore();
      if (g.ch.trim()) cajas.push({ x: gx - (g.w * k) / 2, y: gy - fs * 0.72 * s, w: g.w * k, h: fs * 0.72 * s, giro });
    }
  }

  const capa = lienzo(lw, lh);
  const c = capa.getContext('2d');
  const [sx, sy] = tinta.corre.map((v) => v * fs);
  const pasos = tinta.extruir ? Math.max(2, Math.ceil(Math.hypot(sx, sy) / (fs * 0.006))) : 1;

  if (tinta.filete) {
    const silueta = lienzo(lw, lh);
    const s = silueta.getContext('2d');
    s.drawImage(mascara, 0, 0);
    for (let i = 1; i <= pasos; i++) s.drawImage(mascara, (sx * i) / pasos, (sy * i) / pasos);
    const borde = teñir(silueta, tinta.filete);
    const r = fs * 0.03;
    for (let i = 0; i < 16; i++) c.drawImage(borde, Math.cos((i / 16) * Math.PI * 2) * r, Math.sin((i / 16) * Math.PI * 2) * r);
  }

  const sombra = teñir(mascara, tinta.sombra);
  if (!tinta.extruir) secar(sombra, cajas, fs, { lado: Math.sign(sx), puntas: 11, largo: [0.05, 0.24], rayas: 0.3 });
  for (let i = 1; i <= pasos; i++) c.drawImage(sombra, (sx * i) / pasos, (sy * i) / pasos);

  const letra = teñir(mascara, tinta.relleno);
  if (tinta.abajo) partir(letra, cajas, fs, tinta);
  if (tinta.brillo) abrillantar(letra, mascara, fs, tinta.brillo);
  secar(letra, cajas, fs, tinta.extruir ? { puntas: 0.4, largo: [0.03, 0.08] } : { puntas: 2.5, largo: [0.03, 0.1], rayas: 0.12 });
  c.drawImage(letra, 0, 0);

  const x = destino.getContext('2d');
  if (tinta.rubrica) rubrica(x, cx - l.total * k * 0.42, cx + l.total * k * 0.46, base + baja * 0.55, fs, tinta.rubrica);
  x.drawImage(capa, cx - lw / 2, base - oy);
}

// Reparte un título en una a tres líneas: las menos que alcancen el tamaño de letra deseado.
export function repartir(texto, { ancho, tam }) {
  const x = lienzo(1, 1).getContext('2d');
  x.font = fuente('pincel', 100);
  const p = texto.split(/\s+/).filter(Boolean);
  const tamDe = (ls) => Math.min(tam, (ancho * 100) / Math.max(...ls.map((l) => x.measureText(l).width)));
  const juntar = (...cortes) => [0, ...cortes].map((c, i, cs) => p.slice(c, cs[i + 1] ?? p.length).join(' '));
  const opciones = [[juntar()]];
  for (let i = 1; i < p.length; i++) {
    opciones.push(juntar(i));
    for (let j = i + 1; j < p.length; j++) opciones.push(juntar(i, j));
  }
  const mejor = (n) => opciones.filter((o) => o.length === n).sort((a, b) => tamDe(b) - tamDe(a))[0];
  const candidatas = [1, 2, 3].map(mejor).filter(Boolean);
  return candidatas.find((o) => tamDe(o) >= tam * 0.92) ?? candidatas.sort((a, b) => tamDe(b) - tamDe(a))[0];
}

// Devuelve el rótulo en su propio lienzo, para pegarlo donde haga falta.
// tam: tope para la letra más grande, en px de lienzo.
export function crearRotulo(lineas, { ancho, alto, tam, estilo = uno(ESTILOS_ROTULO), destellos = true }) {
  const tinta = ESTILOS[estilo] ?? ESTILOS.barrio;
  const x = lienzo(1, 1).getContext('2d');
  // Primero se mide en bloque para saber cuál línea queda más grande.
  x.font = fuente('pincel', 100);
  const anchos = lineas.map((t) => x.measureText(t).width);
  const tope = Math.max(...anchos) / 1.6;
  const mayor = lineas.map((t, i) => [Math.max(tope, anchos[i]), t.length, i]).sort((a, b) => a[0] - b[0] || b[1] - a[1])[0][2];
  const ls = lineas.map((t, i) => {
    const tn = tinta(i, lineas.length, mayor);
    return { ...medir(x, tn.tipo === 'letra' ? aLetra(t) : t, tn.tipo), tinta: tn };
  });
  ls.forEach((l) => (l.fs = (100 * ancho * (l.tipo === 'letra' ? 0.86 : 1)) / l.total));
  const bloques = ls.filter((l) => l.tipo !== 'letra').map((l) => l.fs);
  const menor = bloques.length ? Math.min(...bloques) : ls[0].fs;
  ls.forEach((l) => (l.fs = Math.min(l.fs, menor * (l.tipo === 'letra' ? 1.25 : 1.6))));
  const altoDe = (l) => ((l.tipo === 'letra' ? l.sube * 0.8 + l.baja * 0.55 : l.sube + l.baja) * l.fs) / 100 + l.fs * 0.05;
  const total = ls.reduce((s, l) => s + altoDe(l), 0);
  if (total > alto) ls.forEach((l) => (l.fs *= alto / total));
  const letraMayor = Math.max(...ls.map((l) => l.fs));
  if (tam && letraMayor > tam) ls.forEach((l) => (l.fs *= tam / letraMayor));

  const fsMax = Math.max(...ls.map((l) => l.fs));
  const pad = fsMax * 0.42;
  const anchoReal = Math.max(...ls.map((l) => (l.total * l.fs) / 100));
  const altoReal = ls.reduce((s, l) => s + altoDe(l), 0);
  const hoja = lienzo(anchoReal + pad * 2, altoReal + pad * 2);
  const cx = hoja.width / 2;
  let y = pad;
  const bases = ls.map((l) => {
    const base = y + ((l.sube * l.fs) / 100) * (l.tipo === 'letra' ? 0.8 : 1);
    y += altoDe(l);
    return base;
  });
  ls.forEach((l, i) => pintarLinea(hoja, l, cx, bases[i]));

  if (destellos) {
    const c = hoja.getContext('2d');
    const color = '#fbc913';
    const p = ls[0];
    if (azar() < 0.8) destello(c, Math.min(cx + anchoReal / 2, cx + (p.total * p.fs) / 200 + p.fs * 0.25), bases[0] - (p.sube * p.fs) / 100, p.fs * azar(0.34, 0.48), color);
    const u = ls[ls.length - 1];
    if (azar() < 0.45) destello(c, Math.max(cx - anchoReal / 2, cx - (u.total * u.fs) / 200 - u.fs * 0.2), bases[ls.length - 1] - u.fs * 0.15, u.fs * azar(0.2, 0.3), color);
  }
  return { lienzo: hoja, pad, ancho: anchoReal, alto: altoReal, fs: fsMax };
}

// Pinta el rótulo sobre un contexto. y es el borde superior del texto, o su centro si centrar.
export function pintarRotulo(ctx, lineas, { x, y, ancho, alto, giro = 0, centrar = false, estilo }) {
  const r = crearRotulo(lineas, { ancho, alto, estilo });
  ctx.save();
  ctx.translate(x, centrar ? y : y + r.alto / 2);
  ctx.rotate(giro);
  ctx.shadowColor = 'rgba(0,0,0,.42)';
  ctx.shadowBlur = r.fs * 0.22;
  ctx.shadowOffsetY = r.fs * 0.04;
  ctx.drawImage(r.lienzo, -r.lienzo.width / 2, -r.lienzo.height / 2);
  ctx.restore();
  return r;
}
