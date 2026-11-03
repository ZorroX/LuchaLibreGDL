import { crearRotulo, cargarFuentes, repartir } from './rotulo-pincel.js';

const CLAVE = 'tapatia-apartado';

function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) ?? [];
  } catch {
    return [];
  }
}

function guardar(lista) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    // Sin almacenamiento el apartado solo dura esta visita.
  }
  pintarTotal(lista);
}

function pintarTotal(lista = leer()) {
  document.querySelectorAll('[data-apartado-total]').forEach((n) => (n.textContent = lista.length));
}

function iniciarApartado() {
  document.querySelectorAll('[data-apartar]').forEach((boton) => {
    boton.addEventListener('click', () => {
      guardar([...leer(), boton.dataset.apartar]);
      boton.textContent = 'Agregado al apartado';
    });
  });

  const contenedor = document.querySelector('[data-apartado-lista]');
  if (!contenedor) return;
  const vacio = document.querySelector('[data-apartado-vacio]');
  const pintar = () => {
    const lista = leer();
    vacio.hidden = lista.length > 0;
    contenedor.querySelectorAll('[data-producto]').forEach((fila) => {
      const cuantos = lista.filter((id) => id === fila.dataset.producto).length;
      fila.hidden = cuantos === 0;
      fila.querySelector('[data-cuantos]').textContent = cuantos;
    });
  };
  contenedor.querySelectorAll('[data-quitar]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const lista = leer();
      lista.splice(lista.indexOf(boton.dataset.quitar), 1);
      guardar(lista);
      pintar();
    });
  });
  pintar();
}

function iniciarVisor() {
  const visor = document.querySelector('.visor');
  const fotos = [...document.querySelectorAll('.muro-foto')];
  if (!visor || !fotos.length) return;
  fotos.forEach((b) => {
    b.addEventListener('click', () => {
      visor.querySelector('img').src = b.dataset.grande;
      visor.querySelector('p').textContent = b.dataset.pie;
      visor.showModal();
    });
  });
  visor.querySelector('.visor-cerrar').onclick = () => visor.close();
  visor.onclick = (e) => {
    if (e.target === visor) visor.close();
  };
}

function iniciarFiltros() {
  const buscador = document.querySelector('#buscar-luchador');
  if (buscador) {
    const tarjetas = [...document.querySelectorAll('[data-nombre]')];
    const nada = document.querySelector('[data-sin-resultados]');
    buscador.addEventListener('input', () => {
      const q = buscador.value.trim().toLowerCase();
      let hay = 0;
      tarjetas.forEach((t) => {
        t.hidden = !t.dataset.nombre.includes(q);
        if (!t.hidden) hay++;
      });
      nada.hidden = hay > 0;
    });
  }
  document.querySelectorAll('[data-filtro]').forEach((boton) => {
    boton.addEventListener('click', () => {
      document.querySelectorAll('[data-filtro]').forEach((b) => b.setAttribute('aria-pressed', b === boton));
      document.querySelectorAll('.muro-foto').forEach((f) => {
        f.hidden = boton.dataset.filtro !== 'todas' && f.dataset.funcion !== boton.dataset.filtro;
      });
    });
  });
}

// Los títulos de sección toman el tamaño de su letra en CSS y se reparten en líneas;
// el estilo, si no viene dado, depende del fondo.
function medidasTitulo(el, dpr) {
  const ancho = el.clientWidth * dpr * 0.94;
  const tam = Math.max(parseFloat(getComputedStyle(el).fontSize) * 0.86, 54) * dpr;
  const texto = JSON.parse(el.dataset.rotulo).join(' ').toLocaleUpperCase('es-MX');
  const tintas = el.closest('.papel') ? ['letrero'] : ['barrio', 'brasa', 'barrio'];
  return { lineas: repartir(texto, { ancho, tam }), ancho, alto: tam * 4, tam, estilo: el.dataset.estilo || tintas[Math.floor(Math.random() * tintas.length)] };
}

async function pintarRotulos() {
  const rotulos = [...document.querySelectorAll('[data-rotulo]:not([data-pintado])')];
  if (!rotulos.length) return;
  await cargarFuentes();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  for (const el of rotulos) {
    const canvas = el.querySelector('canvas');
    let r;
    if (el.dataset.ajuste === 'titulo') {
      const { lineas, ...medidas } = medidasTitulo(el, dpr);
      r = crearRotulo(lineas, medidas);
      // El lienzo trae margen para sombra y destellos: se recorre para que la letra quede al ras del texto.
      const m = r.pad / dpr;
      canvas.style.width = `${r.lienzo.width / dpr}px`;
      canvas.style.margin = `${-m * 0.75}px 0 ${-m * 0.55}px ${-m * 0.85}px`;
    } else {
      const ancho = el.clientWidth * dpr;
      r = crearRotulo(JSON.parse(el.dataset.rotulo), { ancho: ancho * 0.8, alto: ancho * 0.45, estilo: el.dataset.estilo });
    }
    canvas.width = r.lienzo.width;
    canvas.height = r.lienzo.height;
    canvas.getContext('2d').drawImage(r.lienzo, 0, 0);
    el.dataset.pintado = '';
  }
}

export function iniciar() {
  document.querySelector('#menu') && (document.querySelector('#menu').checked = false);
  pintarTotal();
  iniciarApartado();
  iniciarVisor();
  iniciarFiltros();
  pintarRotulos();
}
