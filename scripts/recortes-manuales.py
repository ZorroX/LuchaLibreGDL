"""Pasa al collage los recortes hechos a mano en collageMag, con el mismo acabado que recortes.py
(gris con contraste y borde de papel), y los deja como las figuras de collage.json.

Uso: python scripts/recortes-manuales.py
Lee datos/recortes-manuales.json. Los recortes automáticos siguen en disco pero salen de collage.json.
"""
import json, os
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage as ni

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'public', 'collage', 'recortes')
COLLAGE = os.path.join(RAIZ, 'src', 'data', 'collage.json')
LADO = 1000
BORDE = 8
MARGEN = BORDE * 2


def papel(a):
    """Borde blanco irregular, como una figura recortada a mano (igual que en recortes.py)."""
    rng = np.random.default_rng(3)
    h, w = a.shape
    ruido = np.asarray(Image.fromarray((rng.random((h // 18 + 2, w // 18 + 2)) * 255).astype('uint8')).resize((w, h), Image.BICUBIC), float) / 255
    distancia = ni.distance_transform_edt(a < .5)
    return np.clip((BORDE * (.55 + ruido) - distancia) / 1.5, 0, 1)


def preparar(ruta):
    im = Image.open(ruta).convert('RGBA')
    im.thumbnail((LADO, LADO))
    im = ImageOps.expand(im, MARGEN, fill=(0, 0, 0, 0))  # lugar para el borde de papel
    a = np.asarray(im.getchannel('A'), float) / 255
    gris = np.asarray(ImageOps.autocontrast(ImageOps.grayscale(im.convert('RGB')), cutoff=(1, .3), mask=im.getchannel('A').point(lambda v: 255 if v > 128 else 0)), float)
    fondo = papel(a)
    v = gris * a + 248 * (1 - a)
    ys, xs = np.where(np.maximum(a, fondo) > .02)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return np.dstack([v, v, v * .97, np.maximum(a, fondo) * 255]).clip(0, 255).astype('uint8')[y0:y1, x0:x1]


lista = json.load(open(os.path.join(RAIZ, 'datos', 'recortes-manuales.json'), encoding='utf-8'))
figuras = []
for r in lista['recortes']:
    rgba = preparar(os.path.join(lista['origen'], f'p-{r["pieza"]}.webp'))
    Image.fromarray(rgba, 'RGBA').save(os.path.join(SALIDA, r['nombre'] + '.webp'), quality=80, method=4)
    figuras.append({'src': f'/collage/recortes/{r["nombre"]}.webp', 'tipo': r['tipo']})
    print(r['nombre'], rgba.shape[1], 'x', rgba.shape[0])

collage = json.load(open(COLLAGE, encoding='utf-8'))
collage['imagenes'] = [i for i in collage['imagenes'] if i['tipo'] not in ('cabeza', 'cuerpo')] + figuras
with open(COLLAGE, 'w', encoding='utf-8') as f:
    json.dump(collage, f, ensure_ascii=False, indent=0)
    f.write('\n')
print(len(figuras), 'figuras en collage.json;', len(lista['pendientes']), 'pendientes')
