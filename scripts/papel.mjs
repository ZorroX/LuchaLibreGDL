// Genera src/styles/papel.css (node scripts/papel.mjs src/styles/papel.css): recortes rasgados, bordes de sección y la transición de página.
import { writeFileSync } from 'node:fs';

const [destino] = process.argv.slice(2);
let semilla = 7;
const azar = (a = 1, b) => {
  semilla = (semilla * 9301 + 49297) % 233280;
  const r = semilla / 233280;
  return b === undefined ? r * a : a + r * (b - a);
};
const n1 = (v) => +v.toFixed(1);

// Contorno rasgado de un rectángulo, en porcentajes. j: cuánto muerde el borde.
function recorte(j, pasos = 18) {
  const p = [];
  const mordida = () => azar() ** 1.6 * j;
  for (let i = 0; i < pasos; i++) p.push([(i / pasos) * 100, mordida()]);
  for (let i = 0; i < pasos; i++) p.push([100 - mordida(), (i / pasos) * 100]);
  for (let i = pasos; i > 0; i--) p.push([(i / pasos) * 100, 100 - mordida()]);
  for (let i = pasos; i > 0; i--) p.push([mordida(), (i / pasos) * 100]);
  return `polygon(${p.map(([x, y]) => `${n1(x)}% ${n1(y)}%`).join(',')})`;
}

// Borde de una tira de papel: línea quebrada que se repite sin costura cada 480px.
function borde() {
  const w = 480;
  const h = 18;
  const pts = [];
  const pasos = 60;
  const y0 = 9;
  for (let i = 0; i <= pasos; i++) {
    const x = (i / pasos) * w;
    const y = i === 0 || i === pasos ? y0 : y0 + Math.sin(i * 0.7) * 2.5 + azar(-5, 5);
    pts.push([n1(x), n1(Math.min(h - 1, Math.max(1, y)))]);
  }
  const d = `M0 ${h}L${pts.map(([x, y]) => `${x} ${y}`).join('L')}L${w} ${h}Z`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'><path d='${d}'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
}

// Transición: un borde vertical rasgado que barre la pantalla. Misma cantidad de puntos en cada paso.
function barrido() {
  const pasos = 26;
  const filo = Array.from({ length: pasos + 1 }, (_, i) => [azar(-4, 4) + (i / pasos - 0.5) * 9, (i / pasos) * 100]);
  const poli = (base) => `polygon(-20% -5%, ${filo.map(([dx, y]) => `${n1(base + dx)}% ${n1(y === 0 ? -5 : y === 100 ? 105 : y)}%`).join(', ')}, -20% 105%)`;
  return { desde: poli(-16), hasta: poli(118) };
}

const recortes = Array.from({ length: 6 }, () => recorte(2.4));
// Para piezas grandes, donde un porcentaje fijo muerde demasiado.
const fino = recorte(1, 34);
const giros = [-1.1, 0.8, -0.5, 1.2, -0.9, 0.45];
const { desde, hasta } = barrido();

const css = `/* Generado con scripts/papel.mjs: formas de papel rasgado compartidas por todo el sitio. */
:root {
${recortes.map((r, i) => `  --rasgo-${i + 1}: ${r};`).join('\n')}
  --rasgo-fino: ${fino};
  --borde-rasgado: ${borde()};
}
${recortes.map((_, i) => `.pegados > :nth-child(6n + ${i + 1}) { --rasgo: var(--rasgo-${i + 1}); --giro: ${giros[i]}deg; }`).join('\n')}

@keyframes rasgar-pagina { from { clip-path: ${desde}; } to { clip-path: ${hasta}; } }
`;
writeFileSync(destino, css);
console.log('listo', css.length, 'bytes');
