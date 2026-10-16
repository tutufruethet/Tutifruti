# Trilha do showreel: sintetizada do zero (numpy/scipy), sem samples.
# 128 BPM, 8 compassos = 15,0 s exatos. Lá menor.
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi, fftconvolve
import wave, sys

SR = 48000
BPM = 128
B = 60 / BPM            # 0.46875 s
BAR = 4 * B
DUR = 15.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

L = np.zeros(N); R = np.zeros(N)
side = np.ones(N)       # envelope de sidechain

def mtof(m): return 440 * 2 ** ((m - 69) / 12)

def put(buf, start, sig, gain=1.0):
    i = int(start * SR)
    if i >= N: return
    j = min(N, i + len(sig))
    buf[i:j] += sig[: j - i] * gain

def add(start, sig, gain=1.0, pan=0.0):
    put(L, start, sig, gain * np.sqrt(0.5 * (1 - pan)) * 1.414)
    put(R, start, sig, gain * np.sqrt(0.5 * (1 + pan)) * 1.414)

def tt(d): return np.arange(int(d * SR)) / SR

def vfilter(x, cut, kind='low', q=0.707, block=128):
    """Filtro biquad com cutoff variável no tempo (por blocos)."""
    cut = np.broadcast_to(cut, x.shape)
    y = np.zeros_like(x); zi = None
    for s in range(0, len(x), block):
        c = float(np.clip(cut[s], 20, SR * 0.45))
        sos = butter(2, c, btype=kind, fs=SR, output='sos')
        if zi is None: zi = sosfilt_zi(sos) * 0
        y[s:s + block], zi = sosfilt(sos, x[s:s + block], zi=zi)
    return y

def saw(f, t, phase=0.0):
    p = (f * t + phase) % 1.0
    return 2 * p - 1

def noise(n): return rng.uniform(-1, 1, n)

# ---------- instrumentos ----------
def kick(d=0.45, hard=1.0):
    t = tt(d)
    f = 45 + 140 * np.exp(-t * 38) * hard
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = noise(len(t)) * np.exp(-t * 400) * 0.35
    return np.tanh((body + click) * 1.6)

def clap():
    t = tt(0.35)
    n = noise(len(t))
    env = np.zeros_like(t)
    for o in (0, 0.011, 0.022):
        env += np.where(t >= o, np.exp(-(t - o) * 90), 0)
    env += np.exp(-t * 14) * 0.4
    s = butter(2, [900, 4200], btype='band', fs=SR, output='sos')
    return sosfilt(s, n * env) * 2.2

def hat(d=0.06, open_=False):
    t = tt(0.25 if open_ else d)
    s = butter(4, 7000, btype='high', fs=SR, output='sos')
    return sosfilt(s, noise(len(t))) * np.exp(-t * (14 if open_ else 70))

def snare(pitch=1.0):
    t = tt(0.18)
    tone = np.sin(2 * np.pi * 190 * pitch * t) * np.exp(-t * 30)
    s = butter(2, [1500 * pitch, 8000], btype='band', fs=SR, output='sos')
    nz = sosfilt(s, noise(len(t))) * np.exp(-t * 22)
    return tone * 0.5 + nz * 1.6

def pluck(m, d=0.22, bright=1.0):
    t = tt(d)
    f = mtof(m)
    x = saw(f, t) * 0.6 + saw(f * 1.006, t, 0.3) * 0.4
    x += np.sign(np.sin(2 * np.pi * f * 0.5 * t)) * 0.25
    cut = 300 + 5200 * bright * np.exp(-t * 18)
    y = vfilter(x, cut, q=1.2)
    return y * np.exp(-t * 9) * np.minimum(1, t * 400)

def bass(m, d):
    t = tt(d)
    f = mtof(m)
    x = saw(f, t) + saw(f * 1.01, t, .5) * 0.6 + np.sin(2 * np.pi * f * 0.5 * t) * 1.2
    cut = 180 + 900 * np.exp(-t * 10)
    y = vfilter(x, cut)
    env = np.minimum(1, t * 300) * np.minimum(1, (d - t) * 60)
    return np.tanh(y * env * 1.5)

def pad(notes, d, cut=1400, att=0.3):
    t = tt(d)
    x = np.zeros_like(t)
    for m in notes:
        for k, det in enumerate((-0.12, -0.05, 0, 0.05, 0.12)):
            x += saw(mtof(m) * 2 ** (det / 12), t, k * 0.21)
    x /= len(notes) * 4
    y = vfilter(x, cut)
    env = np.minimum(1, t / att) * np.minimum(1, (d - t) / 0.25)
    return y * env

def riser(d, f0=300, f1=9000, gain=1.0):
    t = tt(d)
    k = t / d
    cut = f0 * (f1 / f0) ** (k ** 1.6)
    y = vfilter(noise(len(t)), cut, kind='low') + 0.5 * vfilter(noise(len(t)), cut * 0.9, kind='high')
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (k * 2)) / SR) * 0.25
    return (y + tone) * (k ** 2) * gain

def whoosh(d=0.47):
    t = tt(d); k = t / d
    cut = 400 * (12000 / 400) ** k
    return vfilter(noise(len(t)), cut, kind='band' if False else 'low') * np.sin(np.pi * k) ** 2 * 0.9

def boom():
    t = tt(2.2)
    f = 32 + 60 * np.exp(-t * 6)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)

def crash():
    t = tt(2.0)
    s = butter(2, 3000, btype='high', fs=SR, output='sos')
    return sosfilt(s, noise(len(t))) * np.exp(-t * 2.2)

def tick():
    t = tt(0.02)
    return np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 300)

def duck(start, depth=0.75, rel=7.0):
    i = int(start * SR)
    if i >= N: return
    t = tt(B)
    env = 1 - depth * np.exp(-t * rel)
    j = min(N, i + len(t))
    side[i:j] = np.minimum(side[i:j], env[: j - i])

# ---------- arranjo ----------
CH = {  # (baixo, notas do pad)
    'Am': (45, [57, 60, 64, 69]),
    'F':  (41, [53, 57, 60, 65]),
    'C':  (48, [55, 60, 64, 67]),
    'G':  (43, [55, 59, 62, 67]),
}
prog = ['Am', 'Am', 'F', 'C', 'G', 'Am', 'F', 'Am']
bar0 = lambda b: b * BAR

drums = np.zeros((2, N))
music_bus = []  # (start, sig, gain, pan) passa pelo sidechain

def mus(start, sig, gain=1.0, pan=0.0): music_bus.append((start, sig, gain, pan))

# Compasso 1: intro — pad filtrado, ticks de contador, riser
mus(0, pad(CH['Am'][1], BAR, cut=700, att=0.8), 0.9)
for i in range(16):
    add(i * B / 4, tick(), 0.12 + 0.1 * i / 16, pan=(-0.4 if i % 2 else 0.4))
add(0, riser(BAR, 200, 7000), 0.5)
for i, k in enumerate(np.linspace(0, 1, 8)):
    add(BAR - B + i * B / 8, snare(1 + k * 0.6), 0.15 + 0.35 * k)

# Compassos 2–7
arp_shape = [0, 1, 2, 3, 2, 1, 3, 2, 0, 2, 1, 3, 3, 2, 1, 0]
for b in range(1, 7):
    s = bar0(b)
    name = prog[b]
    root, notes = CH[name]
    breakdown = (b == 4)
    build = (b == 6)
    # pad
    mus(s, pad(notes, BAR, cut=900 if breakdown else 1800), 0.55)
    # bateria
    for q in range(4):
        t0 = s + q * B
        if not breakdown or q == 0:
            add(t0, kick(), 1.0); duck(t0)
        if q in (1, 3) and not breakdown:
            add(t0, clap(), 0.55, pan=0.05)
        add(t0 + B / 2, hat(open_=(q % 2 == 1 and not build)), 0.22, pan=0.25)
        if build or b in (2, 3, 5):
            for e in (1, 3):
                add(t0 + e * B / 4, hat(), 0.12, pan=-0.3)
    # baixo: colcheias em contratempo
    if not breakdown:
        for e in range(8):
            if e % 2 == 1 or e == 0:
                mus(s + e * B / 2, bass(root - 12 + (12 if e == 7 else 0), B / 2 * 0.9), 0.55)
    else:
        mus(s, bass(root - 12, BAR * 0.9), 0.4)
    # arpejo em semicolcheias, com eco estéreo
    for e in range(16):
        m = notes[arp_shape[e]] + 12
        br = 0.35 + 0.65 * (e / 16 if b == 1 else 1)
        if breakdown: br = 0.25 + 0.75 * e / 16
        p = pluck(m, 0.25, br)
        g = 0.32
        mus(s + e * B / 4, p, g, pan=-0.2)
        mus(s + e * B / 4 + B * 0.75, p, g * 0.35, pan=0.7)
        mus(s + e * B / 4 + B * 1.5, p, g * 0.15, pan=-0.7)

# whooshes nas viradas de cena
for b in (2, 3, 4, 5):
    add(bar0(b) - B, whoosh(B), 0.35, pan=0)
# breakdown (compasso 5): riser de volta
add(bar0(4) + B, riser(3 * B, 500, 9000), 0.3)

# compasso 7: build — caixa acelerando + riser grande
s7 = bar0(6)
pos = []
for i in range(8): pos.append(s7 + i * B / 2)
for i in range(16): pos.append(s7 + 2 * B + i * B / 8)
for i, p in enumerate(pos):
    add(p, snare(1 + i / len(pos) * 0.8), 0.15 + 0.4 * i / len(pos))
add(s7, riser(BAR, 300, 12000), 0.65)

# compasso 8: impacto final + acorde sustentado
s8 = bar0(7)
add(s8, kick(0.6, 1.4), 1.2)
add(s8, boom(), 0.9)
add(s8, crash(), 0.35, pan=0.1)
add(s8, pad(CH['Am'][1] + [76], BAR, cut=2600, att=0.01), 0.8)
add(s8, bass(33, BAR * 0.95), 0.5)
for e, m in enumerate([81, 76, 72, 69, 64, 60]):
    p = pluck(m, 0.5, 0.9)
    add(s8 + B + e * B / 4, p, 0.22, pan=(-0.5 if e % 2 else 0.5))
add(DUR - B / 2, tick(), 0.4)

# aplica sidechain na música
mb = np.zeros((2, N))
for start, sig, g, pan in music_bus:
    i = int(start * SR)
    if i >= N: continue
    j = min(N, i + len(sig))
    mb[0, i:j] += sig[: j - i] * g * np.sqrt(1 - pan)
    mb[1, i:j] += sig[: j - i] * g * np.sqrt(1 + pan)
mb *= side
L += mb[0]; R += mb[1]

# reverb por convolução com IR sintetizada (ruído decaindo)
def ir(seed, d=1.8):
    r = np.random.default_rng(seed)
    t = tt(d)
    x = r.uniform(-1, 1, len(t)) * np.exp(-t * 3.2)
    s = butter(1, 5000, fs=SR, output='sos')
    return sosfilt(s, x) * 0.012
send = 0.28
wetL = fftconvolve(L * send, ir(1))[:N]
wetR = fftconvolve(R * send, ir(2))[:N]
L += wetL; R += wetR

# master: high-pass leve, saturação suave, fade final
hp = butter(2, 28, btype='high', fs=SR, output='sos')
L = sosfilt(hp, L); R = sosfilt(hp, R)
mx = np.stack([L, R])
mx = np.tanh(mx / np.max(np.abs(mx)) * 1.8)
fade = np.ones(N); fn = int(0.35 * SR); fade[-fn:] = np.linspace(1, 0, fn) ** 2
mx *= fade
mx = mx / np.max(np.abs(mx)) * 0.89
pcm = (mx.T * 32767).astype(np.int16)
out = sys.argv[1] if len(sys.argv) > 1 else 'music.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('ok', out)
