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

// precio y fabricacion son cifras de ejemplo para mostrar el reparto (ver reparto.js); nada está a la venta.
// beneficiario: quién recibe la parte del luchador; margen, si el reparto no es el general.
export const productos = [
  { id: 'impresion-firmada', nombre: 'Impresión firmada', tipo: 'Edición numerada', foto: FOTOS_CLAVE.plata, precio: 650, fabricacion: 180, beneficiario: 'Gravity, que la firma', texto: 'Fotografía de Benigno Mata en papel Hahnemühle Matt Fibre, tamaño 8.5 × 11, numerada y firmada por el luchador.' },
  { id: 'foto-autografiada', nombre: 'Fotografía autografiada', tipo: 'Se firma en la arena', foto: FOTOS_CLAVE.mascara, precio: 250, fabricacion: 40, beneficiario: 'El luchador que elijas', texto: 'Elige a tu luchador y recoge tu foto firmada el día de la función.' },
  { id: 'playera', nombre: 'Playera La Tapatía', tipo: 'Lote corto', foto: FOTOS_CLAVE.monstruo, precio: 500, fabricacion: 200, beneficiario: 'Murder, el de la foto', texto: 'Collage rotulado al frente y crédito del luchador y del fotógrafo.' },
  { id: 'stickers', nombre: 'Paquete de stickers', tipo: 'Coleccionable', foto: FOTOS_CLAVE.cuernos, precio: 120, fabricacion: 35, beneficiario: 'Los luchadores de la plancha, en partes iguales', texto: 'Máscaras recortadas de la escena local, listas para la laptop o el casco.' },
  { id: 'gorra', nombre: 'Gorra Los Nuestros', tipo: 'Bordada', foto: FOTOS_CLAVE.charro, precio: 380, fabricacion: 150, beneficiario: 'Fondo de Los Nuestros, para los luchadores', margen: { luchador: 0.6, fotografo: 0, casa: 0.4 }, texto: 'Bordado de la marca, pensado para sobrevivir a la tercera caída.' },
  { id: 'art-toy', nombre: 'Art toy', tipo: 'Preventa futura', foto: FOTOS_CLAVE.calle, precio: 1200, fabricacion: 600, beneficiario: 'El luchador piloto', texto: 'Figura de edición limitada con un luchador piloto. Se fabricará solo si la preventa lo justifica.' },
];
export const producto = (id) => productos.find((p) => p.id === id);
