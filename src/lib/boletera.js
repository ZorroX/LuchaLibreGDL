// Boletera, fase 0: una arena, una función de ejemplo y ventas inventadas. Nada se vende.
// Zona = dónde estás (primera fila numerada, general con cupo). Tarifa = quién paga (adulto, niño).
// Separarlas deja que cada función abra las zonas y precios que quiera sin rehacer nada.
// Este archivo también corre en el navegador: no importa datos del acervo.
import { pesos } from './reparto.js';

export const arena = {
  id: 'roberto-paz',
  nombre: 'Arena Roberto Paz',
  // Dirección aproximada (la más cercana en OpenStreetMap a las coordenadas de Google Maps): falta confirmarla con la arena.
  direccion: 'Cerca de Calle Valentín Gómez Farías 2603, C.P. 44790, Guadalajara, Jal.',
  coordenadas: [20.6608391, -103.3024578],
  mapa: 'https://maps.app.goo.gl/jo3tkN1q7eHD3wN3A',
};

export const LADOS = ['A', 'B', 'C', 'D'];

export const funcion = {
  id: 'ejemplo-dic',
  nombre: 'Función de ejemplo',
  fecha: '2026-12-04',
  fechaTexto: 'Viernes 4 de diciembre de 2026',
  hora: '8:30 p. m.',
  organiza: 'la arena y la promotora (por acordar)',
  limite: 10,
  zonas: [
    { id: 'primera-fila', nombre: 'Primera fila', numerada: true, porLado: 8, precio: 300, texto: 'Silla numerada pegada al ring.' },
    { id: 'general', nombre: 'General', cupo: 150, texto: 'Sin numerar: sentado donde haya lugar o de pie.', tarifas: [
      { id: 'adulto', nombre: 'Adulto', precio: 200 },
      { id: 'nino', nombre: 'Niño', precio: 50 },
    ] },
  ],
};

export const zona = (id) => funcion.zonas.find((z) => z.id === id);
export const primeraFila = zona('primera-fila');
export const general = zona('general');

// A y C corren de izquierda a derecha; B y D de arriba abajo, como se ve el ring en el mapa.
export const asientos = LADOS.flatMap((lado) => Array.from({ length: primeraFila.porLado }, (_, i) => ({ id: `${lado}${i + 1}`, lado, numero: i + 1 })));

export const CANALES = {
  linea: { nombre: 'En línea', color: '#e0291e' },
  whatsapp: { nombre: 'WhatsApp', color: '#0f97a3' },
  taquilla: { nombre: 'Taquilla', color: '#fbc913' },
  cortesia: { nombre: 'Cortesía', color: '#a63c7e' },
};

// Ventas inventadas para que el mapa y el panel tengan algo que mostrar.
export const ventasEjemplo = [
  { id: 'R-1041', canal: 'linea', asientos: ['A4', 'A5'], adultos: 0, ninos: 0 },
  { id: 'R-1042', canal: 'whatsapp', asientos: ['C1', 'C2', 'C3'], adultos: 0, ninos: 0 },
  { id: 'R-1043', canal: 'cortesia', asientos: ['B1', 'B2'], adultos: 0, ninos: 0 },
  { id: 'R-1044', canal: 'linea', asientos: [], adultos: 4, ninos: 2 },
  { id: 'R-1045', canal: 'whatsapp', asientos: [], adultos: 9, ninos: 3 },
  { id: 'R-1046', canal: 'linea', asientos: ['D5'], adultos: 0, ninos: 0 },
  { id: 'R-1047', canal: 'linea', asientos: [], adultos: 6, ninos: 0 },
  { id: 'R-1048', canal: 'whatsapp', asientos: ['A1', 'A2'], adultos: 2, ninos: 2 },
];

const tarifa = (id) => general.tarifas.find((t) => t.id === id);

// Lo que cuesta una compra, renglón por renglón.
export function lineasDe({ asientos: elegidos = [], adultos = 0, ninos = 0 }) {
  return [
    elegidos.length && { nombre: `${primeraFila.nombre}: ${elegidos.join(', ')}`, precio: primeraFila.precio, cantidad: elegidos.length },
    adultos && { nombre: `${general.nombre}, adulto`, precio: tarifa('adulto').precio, cantidad: adultos },
    ninos && { nombre: `${general.nombre}, niño`, precio: tarifa('nino').precio, cantidad: ninos },
  ].filter(Boolean);
}

export const importe = (venta) => lineasDe(venta).reduce((s, l) => s + l.precio * l.cantidad, 0);

export function estado(ventas) {
  const ocupados = Object.fromEntries(ventas.flatMap((v) => v.asientos.map((a) => [a, v.canal])));
  const enGeneral = ventas.reduce((s, v) => s + v.adultos + v.ninos, 0);
  return { ocupados, enGeneral, quedanGeneral: general.cupo - enGeneral, quedanFila: asientos.length - Object.keys(ocupados).length };
}

const cuantos = (v) => v.asientos.length + v.adultos + v.ninos;

// Lo que ve la arena arriba del panel. Las cortesías ocupan lugar pero no cobran.
export function resumenTaquilla(ventas) {
  const { enGeneral } = estado(ventas);
  const enFila = ventas.reduce((s, v) => s + v.asientos.length, 0);
  const cobrado = ventas.filter((v) => v.canal !== 'cortesia').reduce((s, v) => s + importe(v), 0);
  const porCanal = Object.entries(CANALES).map(([id, c]) => {
    const suyas = ventas.filter((v) => v.canal === id);
    return { id, ...c, boletos: suyas.reduce((s, v) => s + cuantos(v), 0), monto: id === 'cortesia' ? 0 : suyas.reduce((s, v) => s + importe(v), 0) };
  });
  return { enFila, enGeneral, cobrado, porCanal, boletos: enFila + enGeneral };
}

export function htmlVenta(v) {
  const que = [v.asientos.length && `Fila ${v.asientos.join(', ')}`, v.adultos && `${v.adultos} adulto${v.adultos > 1 ? 's' : ''}`, v.ninos && `${v.ninos} niño${v.ninos > 1 ? 's' : ''}`].filter(Boolean).join(' · ');
  return `<div class="cuentas-fila venta-taquilla"><span>${v.id}</span><span><i style="background:${CANALES[v.canal].color}"></i>${CANALES[v.canal].nombre}</span><span>${que}</span><b>${v.canal === 'cortesia' ? 'Cortesía' : pesos(importe(v))}</b></div>`;
}

// Un boleto por persona: cada asiento numerado y cada entrada de general lleva su propio código.
export function boletosDe(venta) {
  const base = venta.id.replace(/\W/g, '');
  return [
    ...venta.asientos.map((a) => ({ zona: primeraFila.nombre, detalle: `Asiento ${a}`, precio: primeraFila.precio })),
    ...Array.from({ length: venta.adultos }, () => ({ zona: general.nombre, detalle: 'Adulto', precio: tarifa('adulto').precio })),
    ...Array.from({ length: venta.ninos }, () => ({ zona: general.nombre, detalle: 'Niño', precio: tarifa('nino').precio })),
  ].map((b, i) => ({ ...b, codigo: `${base}-${String(i + 1).padStart(2, '0')}` }));
}

// El mismo marcado sirve para el boleto de muestra (servidor) y para los que genera la compra (navegador).
export function htmlBoleto(b) {
  return `<article class="boleto">
    <div class="boleto-datos">
      <p class="boleto-marca">Boleto de ejemplo · no válido</p>
      <h3>${funcion.nombre}</h3>
      <p>${arena.nombre} · ${funcion.fechaTexto}, ${funcion.hora}</p>
      <dl><div><dt>Zona</dt><dd>${b.zona}</dd></div><div><dt>Lugar</dt><dd>${b.detalle}</dd></div><div><dt>Precio</dt><dd>${pesos(b.precio)}</dd></div></dl>
      <p class="boleto-codigo">${b.codigo}</p>
    </div>
    <div class="boleto-qr">${qrDeEjemplo(b.codigo)}</div>
  </article>`;
}

// Orden natural de asientos: por lado y luego por número (A2 antes que A10).
export const ordenAsiento = (a, b) => a[0].localeCompare(b[0]) || Number(a.slice(1)) - Number(b.slice(1));

// Dibujo con forma de QR para la maqueta. NO es un QR que se pueda leer: el real lo genera el sistema de cobro.
export function qrDeEjemplo(codigo, lado = 21) {
  let semilla = [...codigo].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const azar = () => ((semilla = (semilla * 1103515245 + 12345) >>> 0) >>> 16) & 1;
  const ojo = (x, y) => [[0, 0], [lado - 7, 0], [0, lado - 7]].some(([ox, oy]) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7);
  const ojoLleno = (x, y) => {
    const [ox, oy] = [[0, 0], [lado - 7, 0], [0, lado - 7]].find(([a, b]) => x >= a && x < a + 7 && y >= b && y < b + 7);
    const [dx, dy] = [x - ox, y - oy];
    return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
  };
  let cuadros = '';
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const lleno = ojo(x, y) ? ojoLleno(x, y) : azar();
      if (lleno) cuadros += `M${x} ${y}h1v1h-1z`;
    }
  }
  return `<svg viewBox="-2 -2 ${lado + 4} ${lado + 4}" role="img" aria-label="Código de ejemplo ${codigo}"><rect x="-2" y="-2" width="${lado + 4}" height="${lado + 4}" fill="#fff"/><path d="${cuadros}" fill="#111"/></svg>`;
}
