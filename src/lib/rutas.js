// Antepone la ruta base del sitio: "/" en local y "/LuchaLibreGDL/" en GitHub Pages.
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export const url = (ruta) => base + ruta.replace(/^\//, '');
