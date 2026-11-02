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
};

export const productos = [
  { id: 'impresion-firmada', nombre: 'Impresión firmada', tipo: 'Edición numerada', foto: FOTOS_CLAVE.plata, texto: 'Fotografía de Benigno Mata en papel Hahnemühle Matt Fibre, tamaño 8.5 × 11, numerada y firmada por el luchador.' },
  { id: 'foto-autografiada', nombre: 'Fotografía autografiada', tipo: 'Se firma en la arena', foto: FOTOS_CLAVE.grito, texto: 'Elige a tu luchador y recoge tu foto firmada el día de la función.' },
  { id: 'playera', nombre: 'Playera La Tapatía', tipo: 'Lote corto', foto: FOTOS_CLAVE.monstruo, texto: 'Collage rotulado al frente y crédito del luchador y del fotógrafo.' },
  { id: 'stickers', nombre: 'Paquete de stickers', tipo: 'Coleccionable', foto: FOTOS_CLAVE.cuernos, texto: 'Máscaras recortadas de la escena local, listas para la laptop o el casco.' },
  { id: 'gorra', nombre: 'Gorra Los Nuestros', tipo: 'Bordada', foto: FOTOS_CLAVE.charro, texto: 'Bordado de la marca, pensado para sobrevivir a la tercera caída.' },
  { id: 'art-toy', nombre: 'Art toy', tipo: 'Preventa futura', foto: FOTOS_CLAVE.calle, texto: 'Figura de edición limitada con un luchador piloto. Se fabricará solo si la preventa lo justifica.' },
];
export const producto = (id) => productos.find((p) => p.id === id);
