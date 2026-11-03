# La Tapatía

Sitio de la lucha libre independiente de Guadalajara, hecho con la comunidad: Benigno Mata (El Lente Enmascarado)
en fotografía, el trabajo de collage de Mapi como referencia visual, luchadores y promotoras.
Es un **prototipo**: "La Tapatía" es un nombre propuesto sin aprobar, el sitio lleva `noindex` y nada se vende todavía.

## Comandos

```
npm install
npm run dev        # http://localhost:4321
npm run build      # compila a dist/
npm run importar   # regenera src/data/acervo.json y public/fotos/ desde ../bngno.mta (Python + Pillow)
npm run publicar   # compila con base /LuchaLibreGDL/ y sube dist/ a la rama gh-pages
node scripts/papel.mjs src/styles/papel.css   # regenera las formas de papel rasgado
```

Para probar la versión de GitHub Pages: compila con `BASE_PATH=/LuchaLibreGDL`. En Git Bash, MSYS convierte
las rutas que empiezan con `/` (variables y argumentos); usa PowerShell o `MSYS_NO_PATHCONV=1`.

## Mapa

- `src/pages/`: una página por sección. `[slug].astro` e `[id].astro` salen de los datos del acervo.
- `src/layouts/Base.astro`: menú, pie, fuentes y `ClientRouter` (navegación con transición de vista).
- `src/components/Cartel.astro`: cabecera de collage vivo de cada página (rótulo = nombre de la página, fotos de la página
  al frente). `Escenario.astro` es la de la portada.
- `src/components/Rotulo.astro`: texto pintado a pincel en canvas; con `ajuste="titulo"` sirve como h1/h2 de sección.
- `src/lib/collage-vivo.js`: motor del collage (plantillas de escena y transiciones). `rotulo-pincel.js`: el pincel.
- `src/lib/cliente.js`: todo el JavaScript del navegador que no es collage; corre en `astro:page-load`.
- `src/lib/reparto.js`: **única fuente** de cómo se reparte el dinero (productos, boletos, aportaciones) y del marcado
  de la barra de desglose. `dinero.js` mueve los formularios; `Desglose.astro` pinta la barra.
- `src/lib/acervo.js`: acceso a fotos, luchadores y funciones; productos de El Puesto y fotos fijas (`FOTOS_CLAVE`).
- `src/styles/global.css`: tokens y todos los estilos. `papel.css` es generado: no se edita a mano.
- `datos/curaduria.json`: nombres, apodos, funciones y exclusiones. `src/data/acervo.json` y `public/fotos/` se generan.
- `src/data/collage.json`: frases, notas e imágenes del collage; cada imagen externa va en `creditos.json`.

## Convenciones

- Todo en español: identificadores, comentarios, textos y mensajes de commit. Tú en los textos del sitio, español de México.
- JavaScript de módulos ES, 2 espacios, comillas simples, punto y coma. Sin frameworks ni dependencias nuevas sin motivo.
- Comentarios pocos y sobre el porqué. Funciones cortas con nombres en verbo (`pintar`, `repartir`, `trocear`).
- Toda ruta interna o archivo de `public/` pasa por `url()` de `src/lib/rutas.js`, para que funcione con la base de GitHub Pages.
- Estilos con los tokens de `:root` (`--rojo`, `--amarillo`, `--turquesa`, `--papel`, `--noche`...). Las páginas con
  `papel` en `Base` usan fondo claro.

## Lenguaje visual

Arena negra, papel rasgado, hoja de oro y rótulo de barrio pintado a mano (referencia: @barrioclaro y los rótulos de fonda).
- Cada página abre con `Cartel`; los títulos de sección son `<Rotulo as="h2" ajuste="titulo" texto="..." />`.
- Las rejillas de piezas llevan la clase `pegados`: reparte a cada hija un recorte rasgado (`--rasgo`) y un giro (`--giro`).
- Las secciones `.lona`, `.voz` y el pie llevan orilla rasgada arriba.
- Fuentes: Londrina Solid (rótulo), Yellowtail (marca), Anton (carteles y botones), Archivo (texto).
- Respeta `prefers-reduced-motion`: el collage queda quieto y no hay transición de página animada.

## Dinero: fase 0

El sitio muestra cómo se repartiría cada peso, pero **no cobra**. Todas las cifras (precios, fabricación, comisión de 4%,
porcentajes) son ejemplos en `reparto.js` y `acervo.js`, y se rotulan como tales en pantalla.
- El Puesto: desglose por producto y "paga más si quieres" con barras enlazadas; el apartado guarda `{ id, extra, destino }` en `localStorage`.
- `/boletos/`: maqueta de compra con propina para un luchador, todo el cartel o la arena.
- `/apoya/`: metas, aportación y tabla de cuentas públicas (vacía).

Antes de cobrar dinero real falta: decidir quién recibe y factura (revisar con un contador), acuerdos por escrito con cada
luchador, guardar en privado los datos de pago de los enmascarados y elegir pasarela con pago dividido. No conectes pagos
reales sin que el grupo lo haya decidido.

## Reglas del proyecto

- Las fotos de lucha son de Benigno Mata: siempre con crédito y nunca fuera del sitio sin su permiso.
- Luchadores con `marcaExterna` (su nombre pertenece a una empresa externa) no tienen merch.
- No inventes biografías, fechas ni datos de luchadores o promotoras; lo que falta se marca "por confirmar".
- Nunca expongas la identidad real de un luchador enmascarado.
- La carpeta `../bngno.mta` (descarga de Instagram) no se sube al repositorio.

## Git y publicación

- `main` tiene el código (la raíz del repo es esta carpeta); `gh-pages` tiene el sitio compilado y lo sirve GitHub Pages
  en https://zorrox.github.io/LuchaLibreGDL/. No hay GitHub Actions: el token de `gh` no tiene permiso `workflow`.
- El repo usa un correo noreply de GitHub en su configuración local; no cambies la configuración global de Git.
- Haz commit, push o `npm run publicar` solo cuando se pida.

## Cómo verificar

Prueba en el navegador, no solo compilando: escritorio de 1440 px y celular de 390 px, sin errores de consola ni
desborde horizontal, con el collage listo (`canvas[data-listo]`) y los rótulos pintados (`[data-pintado]`).
Antes de publicar, compila con `BASE_PATH=/LuchaLibreGDL` y revisa que no haya rutas rotas.
