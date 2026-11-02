"""Recorta luchadores locales del acervo y les agrega el borde de papel del collage."""
import glob, json, os
import numpy as np
from PIL import Image, ImageOps
from rembg import new_session, remove
from scipy import ndimage as ni

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACERVO = os.path.join(os.path.dirname(RAIZ), 'bngno.mta')
SALIDA = os.path.join(RAIZ, 'public', 'collage', 'recortes')
LADO = 1000
BORDE = 8
os.makedirs(SALIDA, exist_ok=True)


def original(id_foto):
    clave, i = id_foto.rsplit('-', 1)
    base = os.path.join(ACERVO, f'{clave}_UTC')
    return base + f'_{i}.jpg' if os.path.exists(base + f'_{i}.jpg') else base + '.jpg'


def mascara(alfa):
    """Vuelve opaca la figura: el modelo deja semitransparentes las zonas oscuras."""
    a = np.clip((alfa / 255 - .28) / .3, 0, 1)
    solido = ni.binary_fill_holes(a > .5)
    etiquetas, n = ni.label(solido)
    if not n:
        return None
    tam = ni.sum(solido, etiquetas, range(1, n + 1))
    solido = etiquetas == 1 + int(np.argmax(tam))
    return np.maximum(a * solido, ni.binary_erosion(solido, iterations=3).astype(float))


def papel(a):
    """Borde blanco irregular, como una figura recortada a mano."""
    rng = np.random.default_rng(3)
    h, w = a.shape
    ruido = np.asarray(Image.fromarray((rng.random((h // 18 + 2, w // 18 + 2)) * 255).astype('uint8')).resize((w, h), Image.BICUBIC), float) / 255
    distancia = ni.distance_transform_edt(a < .5)
    return np.clip((BORDE * (.55 + ruido) - distancia) / 1.5, 0, 1)


datos = json.load(open(os.path.join(RAIZ, 'src', 'data', 'acervo.json'), encoding='utf-8'))
fotos = {f['id']: f for f in datos['fotos']}
sesion = new_session('isnet-general-use')
hechos = []
for l in [x for x in datos['luchadores'] if not x['marcaExterna']]:
    candidatas = [i for i in l['fotos'] if len(fotos[i]['luchadores']) == 1][:2]
    for id_foto in candidatas:
        im = Image.open(original(id_foto)).convert('RGB')
        im.thumbnail((LADO, LADO))
        rec = np.asarray(remove(im, session=sesion))
        a = mascara(rec[..., 3].astype(float))
        if a is None or not .05 < a.mean() < .6:
            continue
        gris = np.asarray(ImageOps.autocontrast(ImageOps.grayscale(im), cutoff=(1, .3)), float)
        fondo = papel(a)
        v = gris * a + 248 * (1 - a)
        ys, xs = np.where(fondo > .02)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgba = np.dstack([v, v, v * .97, np.maximum(a, fondo) * 255]).clip(0, 255).astype('uint8')[y0:y1, x0:x1]
        nombre = f'{l["slug"]}-{len([h for h in hechos if h["luchador"] == l["slug"]]) + 1}'
        Image.fromarray(rgba, 'RGBA').save(os.path.join(SALIDA, nombre + '.webp'), quality=76, method=4)
        hechos.append({'id': nombre, 'luchador': l['slug'], 'ancho': int(x1 - x0), 'alto': int(y1 - y0)})
json.dump(hechos, open(os.path.join(RAIZ, 'datos', 'recortes-candidatos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(hechos))
