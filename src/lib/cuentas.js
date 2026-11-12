// Cuentas de los miembros: lo que cada quien ha ganado, por qué y cuánto se le ha pagado.
// En la maqueta salen de ventas inventadas; la cuenta real leerá las mismas dos listas (ventas y pagos)
// de una base de datos con login, y cada miembro verá solo lo suyo.
import datos from '../data/ventas-ejemplo.json';
import { producto, pilotos, luchador, FOTOS_CLAVE } from './acervo.js';
import { repartirProducto, desgloseProducto, costoEnvio, pesos, MARGEN } from './reparto.js';

export const miembros = [
  { id: 'benigno', nombre: 'Benigno Mata', papel: 'Fotografía', clave: 'fotografo', foto: FOTOS_CLAVE.plata },
  ...pilotos.map((l) => ({ id: l.slug, nombre: l.nombre, papel: 'Luchador', clave: 'luchador', foto: l.foto })),
  { id: 'la-tapatia', nombre: 'La Tapatía', papel: 'Caja y administración', caja: true, foto: FOTOS_CLAVE.apertura },
];
export const miembro = (id) => miembros.find((m) => m.id === id);

const sumar = (lista, f) => lista.reduce((s, x) => s + f(x), 0);
const DIA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MES = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const dia = (iso) => DIA.format(new Date(iso));

// Por qué le toca a cada quien lo que le toca, en palabras de la persona que lo lee.
function motivos(clave, r) {
  return [
    r.base[clave] && `${Math.round(MARGEN[clave] * 100)}% de la utilidad (${pesos(r.base[clave])})`,
    clave === 'luchador' && r.firma && `la firma completa (${pesos(r.firma)})`,
    r.sobre[clave] && `tu parte del extra que dejó quien compró (${pesos(r.sobre[clave])})`,
  ].filter(Boolean);
}

function calcular(v) {
  const quien = luchador(v.luchador).nombre;
  const pieza = { precio: v.precio, fabricacion: v.fabricacion, firma: v.firma ?? 0, beneficiario: quien };
  const opciones = { extra: v.extra, destino: v.destino };
  const r = repartirProducto(pieza, opciones);
  const envio = costoEnvio(v.envio);
  const partes = Object.fromEntries([
    [v.luchador, { monto: r.suma('luchador'), motivos: motivos('luchador', r) }],
    ['benigno', { monto: r.suma('fotografo'), motivos: motivos('fotografo', r) }],
  ].filter(([, x]) => x.monto > 0));
  return {
    ...v, quien, partes, envio,
    pieza: producto(v.producto).nombre,
    total: r.total,
    comision: r.comision,
    cobrado: r.total + envio,
    desglose: desgloseProducto(pieza, opciones),
  };
}

export const ventas = datos.ventas.map(calcular).sort((a, b) => b.fecha.localeCompare(a.fecha));

function porMes(lista) {
  const meses = new Map();
  lista.forEach((v) => {
    const nombre = MES.format(new Date(v.fecha));
    const mes = nombre[0].toUpperCase() + nombre.slice(1);
    const m = meses.get(mes) ?? { mes, piezas: 0, monto: 0 };
    m.piezas += 1;
    m.monto += v.parte.monto;
    meses.set(mes, m);
  });
  return [...meses.values()];
}

export function cuenta(id) {
  const suyas = ventas.filter((v) => v.partes[id]).map((v) => ({ ...v, parte: v.partes[id] }));
  const pagos = datos.pagos.filter((p) => p.miembro === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ganado = sumar(suyas, (v) => v.parte.monto);
  const pagado = sumar(pagos, (p) => p.monto);
  return { ventas: suyas, pagos, ganado, pagado, porPagar: ganado - pagado, meses: porMes(suyas) };
}

// Lo que ve La Tapatía: todo lo que entró y a dónde tiene que ir. Hoy no se queda con parte de las piezas.
export function caja() {
  const socios = miembros.filter((m) => !m.caja).map((m) => ({ ...m, ...cuenta(m.id) }));
  const cobrado = sumar(ventas, (v) => v.cobrado);
  const fabricacion = sumar(ventas, (v) => v.fabricacion);
  const comision = sumar(ventas, (v) => v.comision);
  const envios = sumar(ventas, (v) => v.envio);
  const repartido = sumar(socios, (s) => s.ganado);
  return {
    socios, cobrado, fabricacion, comision, envios, repartido,
    porPagar: sumar(socios, (s) => s.porPagar),
    propia: cobrado - fabricacion - comision - envios - repartido,
  };
}
