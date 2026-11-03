// Reparto transparente del dinero. En el prototipo todas las cifras son de ejemplo:
// los porcentajes reales se acuerdan con cada luchador, fotógrafo y promotora antes de cobrar.

export const COMISION_COBRO = 0.04;
// Cómo se divide lo que queda después de fabricar y cobrar, si el producto no dice otra cosa.
export const MARGEN = { luchador: 0.6, fotografo: 0.1, casa: 0.3 };

export const COLORES = {
  luchador: '#e0291e', fotografo: '#fbc913', casa: '#0f97a3', promotora: '#a63c7e',
  fabricacion: '#8f8a7e', comision: '#4a4740', destino: '#e0291e',
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

// p: { precio, fabricacion, margen?, beneficiario }. extra: lo que la persona agrega; destino: cómo lo reparte.
export function desgloseProducto(p, { extra = 0, destino = p.margen ?? MARGEN } = {}) {
  const total = p.precio + extra;
  const comision = Math.round(total * COMISION_COBRO);
  const comisionBase = Math.round(p.precio * COMISION_COBRO);
  const base = dividir(p.precio - p.fabricacion - comisionBase, p.margen ?? MARGEN);
  const sobre = dividir(extra - (comision - comisionBase), destino);
  const suma = (k) => (base[k] ?? 0) + (sobre[k] ?? 0);
  return {
    total,
    partes: [
      { clave: 'luchador', nombre: p.beneficiario, monto: suma('luchador') },
      { clave: 'fotografo', nombre: 'Benigno Mata, por la foto', monto: suma('fotografo') },
      { clave: 'casa', nombre: 'La Tapatía', monto: suma('casa') },
      { clave: 'fabricacion', nombre: 'Fabricación', monto: p.fabricacion },
      { clave: 'comision', nombre: 'Comisión de cobro', monto: comision },
    ].filter((x) => x.monto > 0),
  };
}

// La entrada es de la promotora; la propina va completa a quien se elija, menos la comisión de cobro.
export function desgloseBoleto({ precio, cantidad, promotora, propina = 0, para }) {
  const entradas = precio * cantidad;
  const total = entradas + propina;
  const comision = Math.round(total * COMISION_COBRO);
  const comisionEntradas = Math.round(entradas * COMISION_COBRO);
  const neta = propina - (comision - comisionEntradas);
  return {
    total,
    partes: [
      { clave: 'promotora', nombre: `${promotora}, por ${cantidad === 1 ? 'la entrada' : `${cantidad} entradas`}`, monto: entradas - comisionEntradas },
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
