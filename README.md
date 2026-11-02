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

- `src/lib/collage-vivo.js`: motor del collage animado de la portada, con sus plantillas de escena.
- `src/data/collage.json`: frases, notas e imágenes que usa el collage. Cada imagen externa debe registrarse en `src/data/creditos.json`.
- `scripts/recortes.py`: genera recortes de luchadores (requiere `rembg` y `scipy`). Los elegidos viven en `public/collage/recortes/`.

Para publicar una función próxima, agrégala a `funciones` en la curaduría con una fecha futura y ejecuta `npm run importar`.

## Publicación

`npm run publicar` compila con la ruta `/LuchaLibreGDL/` y reemplaza la rama `gh-pages`, que es la que sirve GitHub Pages.
El código y las fotos fuente del sitio viven en `main`.

## Derechos

Código sin licencia abierta. Las fotografías de lucha libre son de Benigno Mata y no pueden reutilizarse sin su permiso.
Las imágenes externas conservan sus licencias, listadas en `/creditos/`.
