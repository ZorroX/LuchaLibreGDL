"""Convierte la descarga de Instagram de Benigno Mata en datos y fotos para el sitio."""
import glob, json, lzma, os, re, unicodedata
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACERVO = os.path.join(os.path.dirname(RAIZ), 'bngno.mta')
SALIDA = os.path.join(RAIZ, 'public', 'fotos')
MIN_LADO = 700


def slug(texto):
    t = unicodedata.normalize('NFKD', texto).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


def etiquetas(media):
    return [t['user']['username'].lower() for t in ((media.get('usertags') or {}).get('in') or [])]


def exportar(ruta, nombre):
    im = Image.open(ruta).convert('RGB')
    w, h = im.size
    if max(w, h) < MIN_LADO:
        return None
    for sufijo, lado, calidad in (('m', 640, 66), ('g', 1800, 74)):
        destino = os.path.join(SALIDA, f'{nombre}-{sufijo}.webp')
        if not os.path.exists(destino):
            c = im.copy()
            c.thumbnail((lado, lado))
            c.save(destino, quality=calidad, method=4)
    return w, h


cur = json.load(open(os.path.join(RAIZ, 'datos', 'curaduria.json'), encoding='utf-8'))
luchadores = {}
for h, n, a, e in cur['luchadores']:
    luchadores[h] = {'handle': h, 'nombre': n, 'apodo': a, 'slug': slug(n), 'marcaExterna': bool(e), 'fotos': []}
alias = cur['alias']
funciones = {f['slug']: {**f, 'fotos': []} for f in cur['funciones']}
fotos = []

for meta in sorted(glob.glob(os.path.join(ACERVO, '2026*.json.xz'))):
    base = os.path.basename(meta)[:-len('.json.xz')]
    clave = base[:19]
    if clave in cur['excluir_posts']:
        continue
    nodo = json.loads(lzma.open(meta).read().decode('utf-8'))['node']
    if (nodo.get('user') or {}).get('username') != 'bngno.mta':
        continue
    ruta_txt = os.path.join(ACERVO, base + '.txt')
    caption = open(ruta_txt, encoding='utf-8').read() if os.path.exists(ruta_txt) else ''
    menciones = [m.lower().rstrip('.') for m in re.findall(r'@([\w.]+)', caption)]
    linea = re.search(r'Evento:\s*(.*)', caption)
    evento = (linea.group(1) if linea else '').lower()
    lugar = (nodo.get('location') or {}).get('name') or ''
    buscar = evento if linea else caption.lower()
    funcion = next((f for f in cur['funciones'] if any(r in buscar for r in f['reconocer'])), None)
    titulo = re.search(r'[“"]([^”"]{2,40})[”"]', caption)
    medios = nodo.get('carousel_media') or [nodo]
    for i, media in enumerate(medios, 1):
        nombre = f'{base}_{i}' if len(medios) > 1 else base
        ruta = os.path.join(ACERVO, nombre + '.jpg')
        if media.get('media_type') == 2 or not os.path.exists(ruta) or f'{clave}-{i}' in cur.get('excluir_fotos', []):
            continue
        tam = exportar(ruta, f'{clave}-{i}')
        if not tam:
            continue
        quienes = []
        for t in etiquetas(media) + etiquetas(nodo) + menciones:
            h = alias.get(t, t)
            if h in luchadores and h not in quienes:
                quienes.append(h)
        foto = {
            'id': f'{clave}-{i}', 'ancho': tam[0], 'alto': tam[1], 'fecha': clave[:10],
            'likes': nodo.get('like_count') or 0, 'titulo': titulo.group(1) if titulo else '',
            'luchadores': [luchadores[h]['slug'] for h in quienes],
            'funcion': funcion['slug'] if funcion else None, 'lugar': lugar,
        }
        fotos.append(foto)
        for h in quienes:
            luchadores[h]['fotos'].append(foto['id'])
        if funcion:
            funciones[funcion['slug']]['fotos'].append(foto['id'])

fotos.sort(key=lambda f: (-f['likes'], f['id']))
orden = {f['id']: n for n, f in enumerate(fotos)}
activos = [l for l in luchadores.values() if l['fotos']]
for l in activos:
    # La portada de cada perfil debe ser una foto individual cuando exista.
    l['fotos'].sort(key=lambda i: (len(next(f for f in fotos if f['id'] == i)['luchadores']) > 1, orden[i]))
activos.sort(key=lambda l: (-len(l['fotos']), l['nombre']))
for f in funciones.values():
    f['fotos'].sort(key=orden.get)

salida = {
    'fotos': fotos,
    'luchadores': activos,
    'funciones': sorted(funciones.values(), key=lambda f: f['fecha'], reverse=True),
}
with open(os.path.join(RAIZ, 'src', 'data', 'acervo.json'), 'w', encoding='utf-8') as f:
    json.dump(salida, f, ensure_ascii=False, indent=1)
print(len(fotos), 'fotos;', len(activos), 'luchadores;', {k: len(v['fotos']) for k, v in funciones.items()})
