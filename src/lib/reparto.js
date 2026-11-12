// Reparto transparente del dinero. En el prototipo todas las cifras son de ejemplo:
// los porcentajes reales se acuerdan con cada luchador, fotógrafo y promotora antes de cobrar.

export const COMISION_COBRO = 0.04;
// Cómo se divide lo que queda después de fabricar y cobrar (la comisión la absorbe esta utilidad).
// Por ahora va mitad al luchador y mitad a Benigno por la foto; el proyecto no se queda con parte.
export const MARGEN = { luchador: 0.5, fotografo: 0.5 };

// Envío: gratis dentro de Guadalajara; fuera se cobra al costo de la paquetería según el destino.
// Va aparte del reparto (no es ingreso de nadie) y las tarifas son de ejemplo hasta cotizar con la paquetería.
export const ENVIOS = [
  { id: 'guadalajara', nombre: 'Guadalajara (entrega gratis)', costo: 0 },
  { id: 'jalisco', nombre: 'Resto de Jalisco', costo: 90 },
  { id: 'centro', nombre: 'Centro y Bajío', costo: 130 },
  { id: 'republica', nombre: 'Resto de México', costo: 170 },
];
export const costoEnvio = (id) => ENVIOS.find((e) => e.id === id)?.costo ?? 0;

export const COLORES = {
  luchador: '#e0291e', fotografo: '#fbc913', promotora: '#a63c7e',
  fabricacion: '#8f8a7e', comision: '#4a4740', destino: '#e0291e', envio: '#0f97a3',
};

export const pesos = (n) => `$${Math.round(n).toLocaleString('es-MX')}`;

// Reparte un monto entre claves según pesos que suman 1, sin perder centavos por redondeo.
function dividir(monto, pesos) {
  const claves = Object.keys(pesos).filter((k) => pesos[k] > 0);
  const partes = Object.fromEntries(claves.map((k) => [k, Math.floor(monto * pesos[k])]));
  let resto = Math.round(monto) - Object.values(partes).reduce((s, v) => s + v, 0);
  for (const k of claves) {
    if (resto <= 0) break;
    partes[k] += 1;
    resto -= 1;
  }
  return partes;
}

// p: { precio, fabricacion, firma?, margen?, beneficiario }. extra: lo que la persona agrega; destino: cómo lo reparte.
// firma: lo que cuesta de más la pieza firmada; va completo al luchador y no entra en el 50/50.
// Devuelve cada parte por separado (utilidad, extra, firma) para que las cuentas expliquen de dónde sale cada peso.
export function repartirProducto(p, { extra = 0, destino = p.margen ?? MARGEN } = {}) {
  const total = p.precio + extra;
  const comision = Math.round(total * COMISION_COBRO);
  const comisionBase = Math.round(p.precio * COMISION_COBRO);
  const firma = p.firma ?? 0;
  const base = dividir(p.precio - p.fabricacion - comisionBase - firma, p.margen ?? MARGEN);
  const sobre = extra ? dividir(extra - (comision - comisionBase), destino) : {};
  const suma = (k) => (base[k] ?? 0) + (sobre[k] ?? 0) + (k === 'luchador' ? firma : 0);
  return { total, comision, firma, base, sobre, suma };
}

export function desgloseProducto(p, opciones) {
  const { total, comision, firma, suma } = repartirProducto(p, opciones);
  return {
    total,
    partes: [
      { clave: 'luchador', nombre: firma ? `${p.beneficiario} (incluye ${pesos(firma)} de la firma)` : p.beneficiario, monto: suma('luchador') },
      { clave: 'fotografo', nombre: 'Benigno Mata, por la foto', monto: suma('fotografo') },
      { clave: 'fabricacion', nombre: 'Fabricación', monto: p.fabricacion },
      { clave: 'comision', nombre: 'Comisión de cobro', monto: comision },
    ].filter((x) => x.monto > 0),
  };
}

// lineas: [{ nombre, precio, cantidad }] de la compra. Las entradas son de quien organiza la función;
// la propina va completa a quien se elija, menos la comisión de cobro.
export function desgloseBoleto({ lineas, organiza, propina = 0, para }) {
  const entradas = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const cantidad = lineas.reduce((s, l) => s + l.cantidad, 0);
  const total = entradas + propina;
  const comision = Math.round(total * COMISION_COBRO);
  const comisionEntradas = Math.round(entradas * COMISION_COBRO);
  const neta = propina - (comision - comisionEntradas);
  return {
    total,
    partes: [
      { clave: 'promotora', nombre: `${cantidad === 1 ? 'La entrada' : `${cantidad} entradas`}, para ${organiza}`, monto: entradas - comisionEntradas },
      { clave: 'destino', nombre: `Propina para ${para}`, monto: neta },
      { clave: 'comision', nombre: 'Comisión de cobro', monto: comision },
    ].filter((x) => x.monto > 0),
  };
}

const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// El mismo marcado sirve para la página estática y para repintar cuando la persona mueve algo.
export function htmlDesglose({ total, partes }) {
  const barra = partes.map((x) => `<span style="flex:${x.monto};background:${COLORES[x.clave]}" title="${escapar(x.nombre)}: ${pesos(x.monto)}"></span>`).join('');
  const lista = partes.map((x) => `<li><i style="background:${COLORES[x.clave]}"></i><span>${escapar(x.nombre)}</span><b>${pesos(x.monto)}</b></li>`).join('');
  return `<div class="desglose-barra" aria-hidden="true">${barra}</div><ul class="desglose-lista">${lista}</ul><p class="desglose-total"><span>Total</span><b>${pesos(total)}</b></p>`;
}

export function desgloseDonacion({ monto, para }) {
  const comision = Math.round(monto * COMISION_COBRO);
  return {
    total: monto,
    partes: [
      { clave: 'destino', nombre: para, monto: monto - comision },
      { clave: 'comision', nombre: 'Comisión de cobro', monto: comision },
    ].filter((x) => x.monto > 0),
  };
}
