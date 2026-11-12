// Formularios de la fase 0: muestran el reparto mientras la persona elige. No cobran nada.
import { desgloseProducto, desgloseDonacion, htmlDesglose, pesos } from './reparto.js';

const repintar = (form, d) => (form.querySelector('[data-desglose]').innerHTML = htmlDesglose(d));

// Barras enlazadas: al mover una, el resto se reparte entre las demás en proporción, y todo suma 100.
function enlazar(barras, movida) {
  const otras = barras.filter((b) => b !== movida);
  const libre = 100 - Number(movida.value);
  const antes = otras.reduce((s, b) => s + Number(b.value), 0);
  let puesto = 0;
  otras.forEach((b, i) => {
    const v = i === otras.length - 1 ? libre - puesto : Math.round(antes ? (Number(b.value) / antes) * libre : libre / otras.length);
    b.value = v;
    puesto += v;
  });
}

// La variante (talla, firma) fija precio y fabricación; el luchador elegido recibe la parte del luchador.
function elegir(form, producto) {
  const variante = producto.variantes[form.elements.variante.selectedIndex];
  // El select se llama "con" porque "luchador" ya es la barra del extra.
  const luchador = producto.luchadores[form.elements.con.selectedIndex];
  const pieza = { ...producto, precio: variante.precio, fabricacion: variante.fabricacion, firma: variante.firma ?? 0, beneficiario: luchador.nombre };
  return { pieza, variante, luchador };
}

// Lo que eligió la persona (luchador, variante y "paga más"), para guardarlo con el apartado.
export function extraElegido() {
  const form = document.querySelector('[data-paga-mas]');
  if (!form) return null;
  const { variante, luchador } = elegir(form, JSON.parse(form.dataset.pagaMas).producto);
  const extra = Number(form.elements.extra.value);
  const destino = extra ? Object.fromEntries([...form.querySelectorAll('[data-repartir] input')].map((b) => [b.name, Number(b.value)])) : undefined;
  return { extra, destino, variante: variante.nombre, precio: variante.precio, luchador: luchador.nombre };
}

function iniciarPagaMas(form) {
  const { producto } = JSON.parse(form.dataset.pagaMas);
  const foto = document.querySelector('[data-foto-producto]');
  const barras = [...form.querySelectorAll('[data-repartir] input')];
  const pintar = () => {
    const { pieza, luchador } = elegir(form, producto);
    document.querySelectorAll('[data-nombre-luchador]').forEach((n) => (n.textContent = luchador.nombre));
    if (foto && foto.getAttribute('src') !== luchador.imagen) {
      foto.src = luchador.imagen;
      foto.alt = `${luchador.nombre}, foto de Benigno Mata`;
    }
    const extra = Number(form.elements.extra.value);
    form.querySelector('[name="extra-texto"]').value = pesos(extra);
    form.querySelector('[data-repartir]').hidden = !extra;
    barras.forEach((b) => (form.querySelector(`[name="${b.name}-texto"]`).value = `${b.value}%`));
    const destino = Object.fromEntries(barras.map((b) => [b.name, Number(b.value) / 100]));
    repintar(form, desgloseProducto(pieza, { extra, destino }));
  };
  form.elements.extra.addEventListener('input', pintar);
  form.elements.variante.addEventListener('change', pintar);
  form.elements.con.addEventListener('change', pintar);
  barras.forEach((b) => b.addEventListener('input', () => {
    enlazar(barras, b);
    pintar();
  }));
  pintar();
}

function iniciarDonar(form) {
  const otra = form.elements['monto-otro'];
  const pintar = () => {
    const elegido = form.elements.monto.value;
    otra.hidden = elegido !== 'otro';
    const monto = elegido === 'otro' ? Math.max(0, Number(otra.value) || 0) : Number(elegido);
    const para = form.querySelector(`[name="para"]:checked`).dataset.texto;
    repintar(form, desgloseDonacion({ monto, para }));
  };
  form.addEventListener('input', pintar);
  form.addEventListener('change', pintar);
  pintar();
}

// Calculadora de envío: gratis en Guadalajara; si cambia el destino, muestra el costo.
function iniciarEnvio(caja) {
  const costos = JSON.parse(caja.dataset.envio);
  const salida = caja.querySelector('[data-envio-costo]');
  const pintar = () => {
    const costo = costos[caja.querySelector('select').value] ?? 0;
    salida.textContent = costo ? `${pesos(costo)} de envío (ejemplo)` : 'Envío gratis';
  };
  caja.querySelector('select').addEventListener('change', pintar);
  pintar();
}

export function iniciarDinero() {
  document.querySelectorAll('[data-envio]').forEach(iniciarEnvio);
  document.querySelectorAll('[data-paga-mas]').forEach(iniciarPagaMas);
  document.querySelectorAll('[data-donar]').forEach(iniciarDonar);
}
