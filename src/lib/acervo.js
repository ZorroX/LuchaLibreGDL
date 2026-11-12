import datos from '../data/acervo.json';
import { url } from './rutas.js';

export const fotos = datos.fotos;
export const luchadores = datos.luchadores;
export const funciones = datos.funciones;

const porId = new Map(fotos.map((f) => [f.id, f]));
const porSlug = new Map(luchadores.map((l) => [l.slug, l]));

export const foto = (id) => porId.get(id);
export const luchador = (slug) => porSlug.get(slug);
export const chica = (id) => url(`/fotos/${id}-m.webp`);
export const grande = (id) => url(`/fotos/${id}-g.webp`);

export const locales = luchadores.filter((l) => !l.marcaExterna);
export const proximas = funciones.filter((f) => new Date(f.fecha) > new Date());
export const pasadas = funciones.filter((f) => new Date(f.fecha) <= new Date() && f.fotos.length);
export const instagram = (handle) => `https://www.instagram.com/${handle}/`;

export const FOTOS_CLAVE = {
  apertura: '2026-10-06_14-54-54-1',
  vuelo: '2026-10-07_18-27-15-1',
  grito: '2026-10-09_01-55-03-1',
  plata: '2026-10-17_16-15-28-1',
  monstruo: '2026-10-09_17-37-39-1',
  cuernos: '2026-10-13_20-00-40-1',
  charro: '2026-05-28_15-10-55-1',
  calle: '2026-10-31_00-55-50-1',
  mascara: '2026-06-08_23-54-52-1',
};

// Los primeros luchadores que se suman al proyecto: cada pieza de El Puesto se hace con uno de ellos.
const PILOTOS = { 'sunboy-santi': '2026-06-22_15-53-19-1', yokai: '2026-07-07_17-23-44-1' };
export const pilotos = Object.entries(PILOTOS).map(([slug, foto]) => ({ slug, nombre: luchador(slug).nombre, foto }));

// precio y fabricacion son cifras de ejemplo para mostrar el reparto (ver reparto.js); nada está a la venta.
// Cada variante (talla, firma) trae su precio y fabricación; la primera es la que se muestra de entrada.
const PIEZAS = [
  {
    id: 'playera', nombre: 'Playera', tipo: 'Lote corto', variante: 'Talla',
    texto: 'Playera con la foto que Benigno Mata le tomó al luchador que elijas, con crédito de los dos.',
    variantes: [{ nombre: 'Chica a XL', precio: 320, fabricacion: 120 }, { nombre: 'XXL a XXXL', precio: 350, fabricacion: 150 }],
  },
  {
    id: 'foto-enmarcada', nombre: 'Fotografía enmarcada', tipo: 'Con o sin firma', variante: 'Firma',
    texto: 'Fotografía de Benigno Mata, enmarcada. Con firma, el luchador la autografía a mano y los $50 de la firma van completos al luchador.',
    variantes: [{ nombre: 'Sin firma', precio: 200, fabricacion: 40 }, { nombre: 'Con firma del luchador', precio: 250, fabricacion: 40, firma: 50 }],
  },
];

// Cada pieza abre con un luchador distinto para que El Puesto no repita la misma foto.
const rotar = (lista, i) => [...lista.slice(i % lista.length), ...lista.slice(0, i % lista.length)];
export const productos = PIEZAS.map((p, i) => {
  const luchadores = rotar(pilotos, i);
  const { precio, fabricacion, firma = 0 } = p.variantes[0];
  return { ...p, precio, fabricacion, firma, luchadores, foto: luchadores[0].foto, beneficiario: luchadores[0].nombre };
});
export const producto = (id) => productos.find((p) => p.id === id);
