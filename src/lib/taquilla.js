// Boletera en el navegador: la compra en /boletos/, el panel de la arena y la puerta. Todo es maqueta:
// nada se guarda ni se cobra, y al recargar la página vuelven las ventas de ejemplo.
import { desgloseBoleto, htmlDesglose, pesos } from './reparto.js';
import { funcion, primeraFila, CANALES, ventasEjemplo, lineasDe, importe, estado, boletosDe, htmlBoleto, htmlVenta, resumenTaquilla, ordenAsiento } from './boletera.js';

const numero = (form, nombre) => Math.max(0, Math.floor(Number(form.elements[nombre].value) || 0));
const leer = (form, elegidos) => ({ asientos: [...elegidos].sort(ordenAsiento), adultos: numero(form, 'adultos'), ninos: numero(form, 'ninos') });
const total = (c) => c.asientos.length + c.adultos + c.ninos;
const textoAsientos = (c) => (c.asientos.length ? `Asientos ${c.asientos.join(', ')}` : 'Toca un asiento en el mapa.');

// Elegir asientos en el mapa. "puede" decide si cabe uno más.
function elegirAsientos(mapa, { puede = () => true, alCambiar }) {
  const elegidos = new Set();
  mapa.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-asiento]');
    if (!boton || boton.disabled) return;
    const id = boton.dataset.asiento;
    if (elegidos.has(id)) elegidos.delete(id);
    else if (puede()) elegidos.add(id);
    else return;
    boton.setAttribute('aria-pressed', String(elegidos.has(id)));
    alCambiar();
  });
  return elegidos;
}

// Los asientos vendidos se bloquean; en el panel de la arena se pintan del color del canal.
function ocupar(mapa, ids, canal) {
  const verCanal = mapa.hasAttribute('data-ver-canal');
  ids.forEach((id) => {
    const boton = mapa.querySelector(`[data-asiento="${id}"]`);
    boton.disabled = true;
    boton.setAttribute('aria-pressed', 'false');
    boton.setAttribute('aria-label', `Lado ${id[0]}, asiento ${id.slice(1)}, ${verCanal ? `vendido por ${CANALES[canal].nombre}` : 'ocupado'}`);
    if (verCanal) boton.style.setProperty('--ocupado', CANALES[canal].color);
  });
}

// Contadores de general: el botón suma o resta y el tope lo pone quien pinta.
function contar(form, alCambiar) {
  form.querySelectorAll('[data-sumar]').forEach((b) => b.addEventListener('click', () => {
    const campo = form.elements[b.dataset.sumar];
    campo.value = Math.max(0, Number(campo.value) + Number(b.dataset.paso));
    alCambiar(b.dataset.sumar);
  }));
}

// Recorta adultos y niños al lugar que queda; devuelve el aviso si tuvo que recortar.
function topar(form, c, { quedan, limite = Infinity }) {
  let aviso = null;
  for (const nombre of ['adultos', 'ninos']) {
    const otro = nombre === 'adultos' ? numero(form, 'ninos') : numero(form, 'adultos');
    const porLimite = limite - c.asientos.length - otro;
    const tope = Math.max(0, Math.min(porLimite, quedan - otro));
    if (numero(form, nombre) > tope) {
      form.elements[nombre].value = tope;
      aviso = porLimite < quedan - otro ? `Máximo ${limite} boletos por compra.` : `Solo quedan ${quedan} lugares en general.`;
    }
  }
  return aviso;
}

function avisar(nodo, texto) {
  nodo.hidden = !texto;
  nodo.textContent = texto ?? '';
}

// En la compra primero se dice cuántos van y luego dónde. En primera fila cada persona lleva su silla.
function iniciarCompra(form) {
  const datos = JSON.parse(form.dataset.boletos);
  let quedan = datos.quedanGeneral;
  const mapa = document.querySelector('[data-mapa-ring]');
  const aviso = form.querySelector('[data-aviso]');
  const otra = form.elements['propina-otra'];
  const personas = () => numero(form, 'adultos') + numero(form, 'ninos');
  const enFila = () => form.elements.zona.value === primeraFila.id;
  const libresFila = () => mapa.querySelectorAll('.asiento:not(:disabled)').length;
  const ordenados = () => [...elegidos].sort(ordenAsiento);
  const soltar = (id) => {
    elegidos.delete(id);
    mapa.querySelector(`[data-asiento="${id}"]`).setAttribute('aria-pressed', 'false');
  };

  // Tocar una silla pasa a primera fila; si todos ya tienen silla, suma un adulto.
  const elegidos = elegirAsientos(mapa, {
    puede: () => {
      if (!enFila()) form.elements.zona.value = primeraFila.id;
      if (elegidos.size < personas()) return true;
      if (personas() >= funcion.limite) {
        avisar(aviso, `Máximo ${funcion.limite} boletos por compra.`);
        return false;
      }
      form.elements.adultos.value = numero(form, 'adultos') + 1;
      return true;
    },
    alCambiar: () => pintar(),
  });

  const compra = () => (enFila()
    ? { asientos: ordenados(), adultos: 0, ninos: 0 }
    : { asientos: [], adultos: numero(form, 'adultos'), ninos: numero(form, 'ninos') });

  // Si no caben, recorta primero el campo que se acaba de mover.
  function toparPersonas(origen) {
    const tope = Math.min(funcion.limite, enFila() ? libresFila() : quedan);
    let sobra = personas() - tope;
    if (sobra <= 0) return null;
    for (const nombre of origen === 'ninos' ? ['ninos', 'adultos'] : ['adultos', 'ninos']) {
      const quita = Math.min(sobra, numero(form, nombre));
      form.elements[nombre].value = numero(form, nombre) - quita;
      sobra -= quita;
    }
    if (tope === funcion.limite) return `Máximo ${funcion.limite} boletos por compra.`;
    return enFila() ? `Solo quedan ${tope} sillas libres en primera fila.` : `Solo quedan ${tope} lugares en general.`;
  }

  function describir() {
    if (!enFila()) return `Te acomodas donde haya lugar. Quedan ${quedan}.`;
    const faltan = personas() - elegidos.size;
    const ninos = numero(form, 'ninos') ? ' Los niños pagan la silla completa (por confirmar).' : '';
    if (faltan <= 0) return `Sillas ${ordenados().join(', ')}.${ninos}`;
    const llevas = elegidos.size ? ` Llevas ${ordenados().join(', ')}.` : '';
    return `Toca ${faltan === 1 ? '1 silla' : `${faltan} sillas`} en el mapa, una por persona.${llevas}${ninos}`;
  }

  function pintar(origen) {
    const mensaje = toparPersonas(origen);
    if (!enFila()) ordenados().forEach(soltar);
    while (elegidos.size > personas()) soltar(ordenados().pop());
    avisar(aviso, mensaje);
    form.querySelector('[data-elegidos]').textContent = describir();
    const elegida = form.elements.propina.value;
    otra.hidden = elegida !== 'otra';
    const propina = elegida === 'otra' ? Math.max(0, Number(otra.value) || 0) : Number(elegida);
    form.querySelector('[data-para]').hidden = !propina;
    const quien = form.elements.para.value;
    form.elements.luchador.disabled = quien !== 'luchador';
    const para = quien === 'arena' ? 'la arena' : quien === 'luchador' ? form.elements.luchador.value : `el cartel (${datos.cartel} luchadores, parejo)`;
    form.querySelector('[data-desglose]').innerHTML = htmlDesglose(desgloseBoleto({ lineas: lineasDe(compra()), organiza: funcion.organiza, propina, para }));
    form.querySelector('[data-comprar]').disabled = !personas() || (enFila() && elegidos.size < personas());
  }

  form.querySelector('[data-comprar]').addEventListener('click', () => {
    const c = compra();
    if (!total(c) || total(c) < personas()) return;
    const venta = { id: `EJ-${Math.floor(1000 + Math.random() * 9000)}`, ...c };
    const boletos = boletosDe(venta);
    document.querySelector('[data-boletos-lista]').innerHTML = boletos.map(htmlBoleto).join('');
    document.querySelector('[data-boletos-texto]').textContent = `Listo: ${boletos.length === 1 ? 'tu boleto' : `tus ${boletos.length} boletos`} de la compra ${venta.id}. En la versión real te llegan por correo o WhatsApp.`;
    ocupar(mapa, c.asientos, 'linea');
    elegidos.clear();
    quedan -= c.adultos + c.ninos;
    mapa.querySelector('[data-quedan-general]').textContent = quedan;
    form.elements.adultos.value = 0;
    form.elements.ninos.value = 0;
    form.elements.zona.value = 'general';
    pintar();
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector('#tus-boletos').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth' });
  });

  form.addEventListener('input', (e) => pintar(e.target.name));
  form.addEventListener('change', (e) => pintar(e.target.name));
  contar(form, pintar);
  pintar();
}

function pintarCifras(ventas) {
  const r = resumenTaquilla(ventas);
  const poner = (clave, texto) => document.querySelectorAll(`[data-cifra="${clave}"]`).forEach((n) => (n.textContent = texto));
  poner('fila', r.enFila);
  poner('general', r.enGeneral);
  poner('cobrado', pesos(r.cobrado));
  poner('boletos', r.boletos);
  r.porCanal.forEach((c) => poner(`canal-${c.id}`, `${c.boletos} · ${c.id === 'cortesia' ? 'sin cobro' : pesos(c.monto)}`));
}

function iniciarTaquilla(form) {
  const mapa = document.querySelector('[data-mapa-ring]');
  const lista = document.querySelector('[data-ventas]');
  const resultado = form.querySelector('[data-resultado]');
  const ventas = [...ventasEjemplo];
  let folio = 1049;
  const elegidos = elegirAsientos(mapa, { alCambiar: () => pintar() });

  function pintar() {
    const aviso = topar(form, leer(form, elegidos), { quedan: estado(ventas).quedanGeneral });
    if (aviso) avisar(resultado, aviso);
    const c = leer(form, elegidos);
    form.querySelector('[data-elegidos]').textContent = textoAsientos(c);
    form.querySelector('[data-importe]').textContent = form.elements.canal.value === 'cortesia' ? 'Cortesía, sin cobro' : pesos(importe(c));
    form.querySelector('[data-registrar]').disabled = total(c) === 0;
  }

  form.querySelector('[data-registrar]').addEventListener('click', () => {
    const c = leer(form, elegidos);
    if (!total(c)) return;
    const venta = { id: `R-${folio++}`, canal: form.elements.canal.value, ...c };
    ventas.push(venta);
    ocupar(mapa, c.asientos, venta.canal);
    elegidos.clear();
    form.elements.adultos.value = 0;
    form.elements.ninos.value = 0;
    lista.insertAdjacentHTML('afterbegin', htmlVenta(venta));
    mapa.querySelector('[data-quedan-general]').textContent = estado(ventas).quedanGeneral;
    pintarCifras(ventas);
    const n = boletosDe(venta).length;
    const destino = { whatsapp: 'listos para mandar por WhatsApp', taquilla: 'listos para imprimir o mostrar en la puerta', cortesia: 'listos para entregar' }[venta.canal];
    avisar(resultado, `Venta ${venta.id} registrada: ${n} ${n === 1 ? 'boleto' : 'boletos'} con su código, ${destino}.`);
    pintar();
  });

  form.addEventListener('input', pintar);
  form.addEventListener('change', pintar);
  contar(form, pintar);
  pintar();
}

const ESTADOS = {
  valido: { titulo: 'Puede pasar', icono: '✓' },
  usado: { titulo: 'Ya entró', icono: '✕' },
  otra: { titulo: 'No es de esta función', icono: '!' },
};

function iniciarPuerta(caja) {
  const pruebas = JSON.parse(caja.dataset.puerta);
  const resultado = caja.querySelector('[data-resultado]');
  const contador = caja.querySelector('[data-entraron]');
  let entraron = Number(contador.textContent);
  let i = 0;
  caja.querySelector('[data-escanear]').addEventListener('click', () => {
    const p = pruebas[i++ % pruebas.length];
    const e = ESTADOS[p.resultado];
    if (p.resultado === 'valido') entraron += 1;
    contador.textContent = entraron;
    resultado.className = `escaneo estado-${p.resultado}`;
    resultado.innerHTML = `<span class="escaneo-icono" aria-hidden="true">${e.icono}</span><b>${e.titulo}</b><span>${p.codigo} · ${p.zona}, ${p.detalle}</span>${p.nota ? `<small>${p.nota}</small>` : ''}`;
  });
}

export function iniciarBoletera() {
  document.querySelectorAll('[data-boletos]').forEach(iniciarCompra);
  document.querySelectorAll('[data-taquilla]').forEach(iniciarTaquilla);
  document.querySelectorAll('[data-puerta]').forEach(iniciarPuerta);
}
