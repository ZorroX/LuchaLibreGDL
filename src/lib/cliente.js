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

export function iniciar() {
  document.querySelector('#menu') && (document.querySelector('#menu').checked = false);
  pintarTotal();
  iniciarApartado();
  iniciarVisor();
  iniciarFiltros();
}
