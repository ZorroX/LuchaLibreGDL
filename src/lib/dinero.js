// Formularios de la fase 0: muestran el reparto mientras la persona elige. No cobran nada.
import { desgloseProducto, desgloseBoleto, desgloseDonacion, htmlDesglose, pesos } from './reparto.js';

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

// Lo que eligió la persona en "paga más", para guardarlo con el apartado.
export function extraElegido() {
  const form = document.querySelector('[data-paga-mas]');
  if (!form) return null;
  const extra = Number(form.elements.extra.value);
  if (!extra) return null;
  const destino = Object.fromEntries([...form.querySelectorAll('[data-repartir] input')].map((b) => [b.name, Number(b.value)]));
  return { extra, destino };
}

function iniciarPagaMas(form) {
  const { producto } = JSON.parse(form.dataset.pagaMas);
  const barras = [...form.querySelectorAll('[data-repartir] input')];
  const pintar = () => {
    const extra = Number(form.elements.extra.value);
    form.querySelector('[name="extra-texto"]').value = pesos(extra);
    form.querySelector('[data-repartir]').hidden = !extra || barras.length < 2;
    barras.forEach((b) => (form.querySelector(`[name="${b.name}-texto"]`).value = `${b.value}%`));
    const destino = Object.fromEntries(barras.map((b) => [b.name, Number(b.value) / 100]));
    repintar(form, desgloseProducto(producto, { extra, destino: barras.length ? destino : producto.margen }));
  };
  form.elements.extra.addEventListener('input', pintar);
  barras.forEach((b) => b.addEventListener('input', () => {
    enlazar(barras, b);
    pintar();
  }));
  pintar();
}

function iniciarBoletos(form) {
  const { precio, promotora, cartel } = JSON.parse(form.dataset.boletos);
  const otra = form.elements['propina-otra'];
  const pintar = () => {
    const cantidad = Math.min(10, Math.max(1, Number(form.elements.cantidad.value) || 1));
    const elegida = form.elements.propina.value;
    otra.hidden = elegida !== 'otra';
    const propina = elegida === 'otra' ? Math.max(0, Number(otra.value) || 0) : Number(elegida);
    const quien = form.elements.para.value;
    form.elements.luchador.disabled = quien !== 'luchador';
    const para = quien === 'arena' ? 'la arena' : quien === 'luchador' ? form.elements.luchador.value : `el cartel (${cartel} luchadores, parejo)`;
    repintar(form, desgloseBoleto({ precio, cantidad, promotora, propina, para }));
  };
  form.addEventListener('input', pintar);
  form.addEventListener('change', pintar);
  form.querySelectorAll('[data-cantidad]').forEach((b) => b.addEventListener('click', () => {
    form.elements.cantidad.value = Math.min(10, Math.max(1, Number(form.elements.cantidad.value) + Number(b.dataset.cantidad)));
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

export function iniciarDinero() {
  document.querySelectorAll('[data-paga-mas]').forEach(iniciarPagaMas);
  document.querySelectorAll('[data-boletos]').forEach(iniciarBoletos);
  document.querySelectorAll('[data-donar]').forEach(iniciarDonar);
}
