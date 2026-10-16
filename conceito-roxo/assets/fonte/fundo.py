import numpy as np, sys
from PIL import Image
W, H = 3840, 2160
y, x = np.mgrid[0:H, 0:W].astype(np.float32)
u, v = x / H, y / H                      # unidades em altura
cx = W / H / 2
def srgb2lin(c): c = np.array(c) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def lin2srgb(c): return np.where(c <= .0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - .055)
base = srgb2lin([10, 9, 12])
purple = srgb2lin([120, 30, 200]); deep = srgb2lin([60, 12, 110])
img = np.ones((H, W, 3), np.float32) * base
def glow(px, py, sx, sy, k, col):
    g = np.exp(-(((u - px) / sx) ** 2 + ((v - py) / sy) ** 2))
    return g[..., None] * k * col
# luz lateral suave
img += glow(-0.15, 0.62, 0.55, 0.65, 0.11, purple)
img += glow(W / H + 0.12, 0.38, 0.5, 0.6, 0.09, purple)
# formas curvas amplas: bordas iluminadas de volumes gigantes, desfocadas
def rim(ox, oy, R, w_in, w_out, k, col, ang_c, ang_w):
    dx, dy = u - ox, v - oy
    d = np.sqrt(dx ** 2 + dy ** 2) - R
    edge = np.where(d < 0, np.exp(d / w_in), np.exp(-(d / w_out) ** 2))
    ang = np.arctan2(dy, dx)
    da = (ang - ang_c + np.pi) % (2 * np.pi) - np.pi
    along = np.exp(-(da / ang_w) ** 2)
    return (edge * along)[..., None] * k * col
img += rim(-0.95, 0.70, 1.30, 0.22, 0.05, 0.16, purple, -0.25, 0.75)
img += rim(-0.95, 0.70, 1.05, 0.15, 0.04, 0.05, purple, -0.10, 0.6)
img += rim(W / H + 1.0, 0.30, 1.32, 0.24, 0.05, 0.13, purple, 2.95, 0.7)
img += rim(W / H + 1.0, 0.30, 1.10, 0.15, 0.04, 0.045, purple, 3.1, 0.6)
# centro limpo + vinheta
cen = np.exp(-(((u - cx) / 0.62) ** 2 + ((v - 0.5) / 0.42) ** 2))[..., None]
img = img * (1 - 0.35 * cen) + base * 0.35 * cen
vig = 1 - 0.35 * np.clip(((u - cx) / (cx * 1.1)) ** 2 + ((v - .5) / .75) ** 2, 0, 1)[..., None] ** 1.5
img *= vig
out = lin2srgb(img) * 255 + np.random.default_rng(1).uniform(-0.75, 0.75, (H, W, 3))  # dither contra banding
im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
im.save(sys.argv[1] + '/background-4k.png', optimize=True)
im.resize((2560, 1440), Image.LANCZOS).save(sys.argv[1] + '/background.jpg', quality=92)
im.resize((960, 540)).save(sys.argv[1] + '/bg_prev.jpg', quality=90)
