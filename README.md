# La Tapatía

Prototipo local del sitio de lucha libre independiente de Guadalajara, hecho con Astro.

## Uso

```
npm install
npm run dev       # http://localhost:4321
npm run importar  # regenera fotos y datos desde ../bngno.mta (requiere Python con Pillow)
npm run build
npm run publicar  # compila y sube el sitio a GitHub Pages
```

## Dónde se edita

- `datos/curaduria.json`: nombres y apodos de luchadores, funciones, y posts o fotos excluidos.
  El campo final de cada luchador vale `1` si su nombre pertenece a una empresa externa y no debe tener merch.
- `src/lib/acervo.js`: productos de El Puesto y fotos fijas del sitio.
- `src/data/acervo.json` y `public/fotos/`: se generan con `npm run importar`; no se editan a mano.

- `src/lib/collage-vivo.js`: motor del collage animado, con sus plantillas de escena y sus transiciones
  (estallar, mezcla, barrer, deshojar, rasgar, pegar, arrugar y extender; la lista `siguienteTipo` decide cuánto sale cada una).
- `src/components/Cartel.astro`: cabecera de collage de cada página. Recibe el rótulo (el nombre de la página), las fotos
  de la página, que se pegan al frente con las plantillas `portada`, `tira` y `muro`, y la tarjeta de papel con el título.
  La portada usa el mismo componente desde `Escenario.astro`, con todas las frases de `collage.json`.
- `src/lib/rotulo-pincel.js`: rótulos pintados a pincel que usan el collage y el componente `Rotulo`.
  Con `ajuste="titulo"`, `Rotulo` pinta un título de sección del tamaño de su letra en CSS y lo reparte en líneas.
- `src/styles/papel.css`: recortes rasgados de tarjetas y fotos, bordes de sección y transición entre páginas.
  Se genera con `node scripts/papel.mjs src/styles/papel.css`; un contenedor con la clase `pegados` reparte recortes y giros a sus hijos.
- `src/data/collage.json`: frases, notas e imágenes que usa el collage. Cada imagen externa debe registrarse en `src/data/creditos.json`.
- `scripts/recortes.py`: genera recortes de luchadores (requiere `rembg` y `scipy`). Los elegidos viven en `public/collage/recortes/`.

Para publicar una función próxima, agrégala a `funciones` en la curaduría con una fecha futura y ejecuta `npm run importar`.

## Publicación

`npm run publicar` compila con la ruta `/LuchaLibreGDL/` y reemplaza la rama `gh-pages`, que es la que sirve GitHub Pages.
El código y las fotos fuente del sitio viven en `main`.

## Derechos

Código sin licencia abierta. Las fotografías de lucha libre son de Benigno Mata y no pueden reutilizarse sin su permiso.
Las imágenes externas conservan sus licencias, listadas en `/creditos/`.
