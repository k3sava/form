#!/usr/bin/env python3
"""
Generate 3 demo poster outputs showing what FORM can produce.
Organic, non-machine aesthetics — natural materials, not digital processing.

Outputs:
  outputs/demo_1_murmuration.png  — "LESS. BETTER." — Instagram square 1080x1080
  outputs/demo_2_grain.png        — "BUILD DAILY"   — LinkedIn landscape 1200x628
  outputs/demo_3_ink.png          — "SHIP."         — Instagram portrait 1080x1350
"""

import math, random, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

random.seed(42)
np.random.seed(42)

OUT = os.path.join(os.path.dirname(__file__), 'outputs')
os.makedirs(OUT, exist_ok=True)

# ─────────────────────────────────────────────────────────
# TEXT → LUMINANCE FIELD
# ─────────────────────────────────────────────────────────
def text_to_lum(text, W, H, font_paths=None):
    img = Image.new('L', (W, H), 0)
    draw = ImageDraw.Draw(img)
    lines = [l.upper() for l in text.strip().split('\n')]

    candidates = [
        '/System/Library/Fonts/HelveticaNeue.ttc',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial Bold.ttf',
        '/System/Library/Fonts/SFNSDisplay.ttf',
        '/System/Library/Fonts/SFNS.ttf',
    ]
    if font_paths:
        candidates = font_paths + candidates

    sz = int(H * 0.6)
    font = None
    for path in candidates:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, sz)
                break
            except Exception:
                continue
    if font is None:
        font = ImageFont.load_default()

    # Binary search for best size
    for _ in range(20):
        test = Image.new('L', (W, H), 0)
        td = ImageDraw.Draw(test)
        widths = [td.textlength(l, font=font) if hasattr(td, 'textlength') else font.getlength(l) for l in lines]
        max_w = max(widths) if widths else W
        total_h = sz * 1.15 * len(lines)
        if max_w > W * 0.88 or total_h > H * 0.88:
            sz = int(sz * 0.88)
            try:
                font = ImageFont.truetype(font.path, sz)
            except Exception:
                break
        else:
            break

    lh = sz * 1.15
    total_h = lh * len(lines)
    for i, line in enumerate(lines):
        try:
            w_px = draw.textlength(line, font=font)
        except Exception:
            w_px = len(line) * sz * 0.6
        x = (W - w_px) / 2
        y = (H - total_h) / 2 + i * lh
        draw.text((x, y), line, fill=255, font=font)

    return np.array(img, dtype=np.float32) / 255.0


# ─────────────────────────────────────────────────────────
# SIMPLEX NOISE (2D)
# ─────────────────────────────────────────────────────────
class SimplexNoise:
    perm_data = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180]
    F2 = 0.5*(math.sqrt(3)-1)
    G2 = (3-math.sqrt(3))/6
    grad = [(1,1),(-1,1),(1,-1),(-1,-1),(1,0),(-1,0),(0,1),(0,-1)]

    def __init__(self):
        self.perm = [self.perm_data[i&255] for i in range(512)]

    def n2(self, xin, yin):
        F2,G2,perm,grad=self.F2,self.G2,self.perm,self.grad
        s=(xin+yin)*F2; i=math.floor(xin+s); j=math.floor(yin+s)
        t=(i+j)*G2; X0=i-t; Y0=j-t; x0=xin-X0; y0=yin-Y0
        i1,j1=(1,0) if x0>y0 else (0,1)
        x1=x0-i1+G2; y1=y0-j1+G2; x2=x0-1+2*G2; y2=y0-1+2*G2
        ii=i&255; jj=j&255
        g0=perm[ii+perm[jj]]&7; g1=perm[ii+i1+perm[jj+j1]]&7; g2=perm[ii+1+perm[jj+1]]&7
        n0=n1=n2=0.0
        t0=0.5-x0*x0-y0*y0
        if t0>0: t0*=t0; n0=t0*t0*(grad[g0][0]*x0+grad[g0][1]*y0)
        t1=0.5-x1*x1-y1*y1
        if t1>0: t1*=t1; n1=t1*t1*(grad[g1][0]*x1+grad[g1][1]*y1)
        t2=0.5-x2*x2-y2*y2
        if t2>0: t2*=t2; n2=t2*t2*(grad[g2][0]*x2+grad[g2][1]*y2)
        return 70*(n0+n1+n2)

    def fbm(self, x, y, octaves=4):
        v=0; a=1; f=1; mx=0
        for _ in range(octaves):
            v+=self.n2(x*f,y*f)*a; mx+=a; a*=0.5; f*=2.13
        return v/mx

noise = SimplexNoise()


# ═══════════════════════════════════════════════════════════
# DEMO 1 — MURMURATION — "LESS. BETTER." — 1080×1080
# Density-accumulator approach: particles attracted to text
# spend more time there → density heatmap reveals the text
# ═══════════════════════════════════════════════════════════
def demo_murmuration():
    W, H = 1080, 1080
    print("  [1/3] Rendering MURMURATION — LESS. BETTER. (square)…")
    lum = text_to_lum("LESS.\nBETTER.", W, H)

    # Downsample for physics (4x faster)
    sc = 4
    sw, sh = W // sc, H // sc
    lum_s = lum[::sc, ::sc]  # shape (sh, sw)

    N_PARTICLES = 3000
    rng = np.random.default_rng(7)
    xs = rng.random(N_PARTICLES) * sw
    ys = rng.random(N_PARTICLES) * sh
    vxs = np.zeros(N_PARTICLES)
    vys = np.zeros(N_PARTICLES)

    # Density accumulator at downsampled resolution, floated
    density = np.zeros((sh, sw), dtype=np.float32)

    print("    running boids physics…", end="", flush=True)
    STEPS = 600
    for step in range(STEPS):
        if step % 100 == 0:
            print(".", end="", flush=True)

        # Ramp converge strength: start at 0, peak at step 300, stay high
        t = step / STEPS
        converge = 0.35 * min(1.0, t * 3.0)
        noise_t = step * 0.004

        for i in range(N_PARTICLES):
            x, y = xs[i], ys[i]
            xi2 = max(0, min(sw-1, int(x)))
            yi2 = max(0, min(sh-1, int(y)))

            # Curl noise base flow
            sc2 = 0.006
            cvx = noise.n2(x*sc2, y*sc2 + noise_t) * 0.8
            cvy = noise.n2(x*sc2 + 80, y*sc2 + noise_t) * 0.8

            # Find brightest text pixel in neighborhood
            best = lum_s[yi2, xi2]
            tx, ty = float(xi2), float(yi2)
            r_search = 25
            for _ in range(6):
                nx2 = xi2 + int(rng.integers(-r_search, r_search+1))
                ny2 = yi2 + int(rng.integers(-r_search, r_search+1))
                nx2 = max(0, min(sw-1, nx2))
                ny2 = max(0, min(sh-1, ny2))
                v = lum_s[ny2, nx2]
                if v > best:
                    best = v; tx = float(nx2); ty = float(ny2)

            # Velocity update
            vxs[i] = vxs[i]*0.88 + (cvx + (tx - x)*converge) * 0.12
            vys[i] = vys[i]*0.88 + (cvy + (ty - y)*converge) * 0.12

            xs[i] = (x + vxs[i]) % sw
            ys[i] = (y + vys[i]) % sh

            # Accumulate density (weight by local luminance so text glows)
            fx, fy = int(xs[i]), int(ys[i])
            if 0 <= fx < sw and 0 <= fy < sh:
                l = lum_s[fy, fx]
                density[fy, fx] += 1.0 + l * 4.0  # text pixels accumulate faster

    print(" done")
    print("    compositing density field…")

    # Gaussian-blur density for smooth glow
    density_img = Image.fromarray((density / density.max() * 255).astype(np.uint8), 'L')
    density_img = density_img.resize((W, H), Image.BILINEAR)
    density_img = density_img.filter(ImageFilter.GaussianBlur(radius=4))
    density_np = np.array(density_img).astype(np.float32) / 255.0

    # Color: black bg → amber glow → warm white hot core
    # Map density 0→1 to RGB
    R = np.clip(density_np * 3.0, 0, 1)               # amber appears early
    G = np.clip(density_np * 2.0 - 0.2, 0, 1)         # green lags
    B = np.clip(density_np * 4.0 - 3.0, 0, 1)          # white-hot core only

    arr = np.stack([
        (R * 220).astype(np.uint8),
        (G * 168).astype(np.uint8),
        (B * 100).astype(np.uint8),
    ], axis=2)

    # Add sparse bright particles on top for "alive" feel
    xi_f = np.clip((xs * sc).astype(int), 0, W-1)
    yi_f = np.clip((ys * sc).astype(int), 0, H-1)
    l_vals = lum[yi_f, xi_f]
    for i in range(N_PARTICLES):
        x_f, y_f = xs[i]*sc, ys[i]*sc
        l = l_vals[i]
        if l > 0.15 and 1 <= x_f < W-1 and 1 <= y_f < H-1:
            xi3, yi3 = int(x_f), int(y_f)
            bright = min(255, int(180 + l * 75))
            arr[yi3, xi3] = [bright, int(bright*0.78), int(bright*0.38)]

    # Vignette
    yy, xx = np.mgrid[:H, :W]
    dist = np.sqrt(((xx/W - 0.5))**2 + ((yy/H - 0.5))**2)
    vig = np.clip(1 - dist * 1.5, 0, 1)[:, :, np.newaxis]
    arr = np.clip(arr.astype(np.float32) * vig, 0, 255).astype(np.uint8)

    # Add background base (pure black is too flat)
    base = np.full((H, W, 3), [10, 8, 6], dtype=np.uint8)
    mask = (arr.sum(axis=2) == 0)
    arr[mask] = base[mask]

    result = Image.fromarray(arr, 'RGB')
    path = os.path.join(OUT, 'demo_1_murmuration.png')
    result.save(path, quality=97)
    print(f"    ✓ saved: {path}")


# ═══════════════════════════════════════════════════════════
# DEMO 2 — GRAIN — "BUILD DAILY" — 1200×628
# ═══════════════════════════════════════════════════════════
def demo_grain():
    W, H = 1200, 628
    print("  [2/3] Rendering GRAIN — BUILD DAILY (landscape)…")
    lum = text_to_lum("BUILD\nDAILY", W, H)

    # Box-blur for halation
    def box_blur(arr, radius):
        from scipy.ndimage import uniform_filter
        return uniform_filter(arr, size=radius*2+1, mode='reflect')

    try:
        halo = box_blur(lum, radius=max(2, W//25))
        halo = box_blur(halo, radius=max(2, W//50))  # double pass for smoother
    except ImportError:
        # Fallback: PIL blur
        pil_l = Image.fromarray((lum*255).astype(np.uint8), 'L')
        pil_l = pil_l.filter(ImageFilter.GaussianBlur(radius=W//25))
        halo = np.array(pil_l).astype(np.float32) / 255.0

    # Film grain — silver-halide aesthetic: varies with local brightness
    print("    generating grain…")
    grain_seed = np.random.default_rng(13)
    # Base grain: uniform noise
    g = grain_seed.standard_normal((H, W)).astype(np.float32)
    # Silver halide: grain is coarser in shadows, finer in highlights
    grain_amplitude = 0.12 * (1 - lum * 0.6)  # [0.048..0.12]
    grain = g * grain_amplitude

    # Composition
    v = np.clip(lum + grain + halo * 0.55, 0, 1)

    # Color: warm sepia — Kodak Portra-like
    R = np.clip(v * 228 + 12, 0, 255).astype(np.uint8)
    G = np.clip(v * 215 + 8, 0, 255).astype(np.uint8)
    B = np.clip(v * 190 + 5, 0, 255).astype(np.uint8)

    arr = np.stack([R, G, B], axis=2)

    # Slight vignette
    yy, xx = np.mgrid[:H, :W]
    dist = np.sqrt(((xx/W - 0.5)*1.2)**2 + ((yy/H - 0.5)*1.5)**2)
    vig = np.clip(1 - dist * 0.9, 0, 1)[:, :, np.newaxis]
    arr = np.clip(arr.astype(np.float32) * vig, 0, 255).astype(np.uint8)

    # Letterbox bars (adds editorial quality)
    bar_h = H // 14
    arr[:bar_h, :] = [8, 7, 6]
    arr[-bar_h:, :] = [8, 7, 6]

    result = Image.fromarray(arr, 'RGB')
    path = os.path.join(OUT, 'demo_2_grain.png')
    result.save(path, quality=97)
    print(f"    ✓ saved: {path}")


# ═══════════════════════════════════════════════════════════
# DEMO 3 — TIDAL — "SHIP." — 1080×1350
# Multi-frequency sine wave interference creates water surface.
# Text visible through animated ripples — deep navy palette.
# ═══════════════════════════════════════════════════════════
def demo_tidal():
    W, H = 1080, 1350
    print("  [3/3] Rendering TIDAL — SHIP. (portrait)…")
    lum = text_to_lum("SHIP.", W, H)

    print("    computing wave field…")
    # Pick a beautiful mid-animation phase (t=8s of 30s loop)
    T = 8.0 * 0.7  # time * speed param

    # Wave params — 4 interfering waves for complex caustic pattern
    waves = [
        (22.0, 0.018, 0.012, T),            # primary
        (11.0, 0.027, -0.010, T*1.3+1.0),  # secondary
        (7.0,  0.034, 0.022, -T*0.7+2.1),  # tertiary
        (5.0,  0.041, -0.030, T*1.1+3.4),  # high freq chop
    ]

    yy, xx = np.mgrid[:H, :W]
    yy = yy.astype(np.float32)
    xx = xx.astype(np.float32)

    # Total wave displacement
    wave_total = np.zeros((H, W), dtype=np.float32)
    for amp, fx, fy, phase in waves:
        wave_total += amp * np.sin(fx * xx + fy * yy + phase)

    # Caustic: bright interference nodes from wave superposition
    caustic = np.sin(wave_total * 0.28) * 0.5 + 0.5  # 0..1

    # Sample text with wave displacement (refraction)
    sx = np.clip(xx + wave_total, 0, W-1).astype(np.float32)
    sy = np.clip(yy + wave_total * 0.5, 0, H-1).astype(np.float32)

    # Bilinear sample of lum at displaced coordinates
    sx0 = np.clip(sx.astype(int), 0, W-2)
    sy0 = np.clip(sy.astype(int), 0, H-2)
    fx2 = sx - sx0
    fy2 = sy - sy0
    l = (lum[sy0,   sx0]   * (1-fx2) * (1-fy2) +
         lum[sy0,   sx0+1] * fx2     * (1-fy2) +
         lum[sy0+1, sx0]   * (1-fx2) * fy2     +
         lum[sy0+1, sx0+1] * fx2     * fy2)

    # Depth factor: text is "below" the surface, faintly visible
    depth = 0.04 + caustic * 0.14   # ambient water light
    text_v = l * (0.55 + caustic * 0.45)  # text through water

    # Color palette: deep Prussian blue → teal → pale cyan highlight
    R = np.clip(4  + depth*38 + text_v*165, 0, 255).astype(np.uint8)
    G = np.clip(8  + depth*58 + text_v*185, 0, 255).astype(np.uint8)
    B_ch = np.clip(20 + depth*80 + text_v*215, 0, 255).astype(np.uint8)

    arr = np.stack([R, G, B_ch], axis=2)

    # Caustic highlight layer — bright white sparkles at wave peaks
    highlights = (caustic > 0.82).astype(np.float32) * caustic
    highlights = highlights[:,:,np.newaxis] * np.array([50, 60, 70])
    arr = np.clip(arr.astype(np.float32) + highlights, 0, 255).astype(np.uint8)

    # Vignette — the ocean darkens at the edges
    dist = np.sqrt(((xx/W - 0.5)*1.1)**2 + ((yy/H - 0.5)*0.9)**2)
    vig = np.clip(1 - dist * 0.85, 0, 1)[:,:,np.newaxis]
    arr = np.clip(arr.astype(np.float32) * vig, 0, 255).astype(np.uint8)

    result = Image.fromarray(arr, 'RGB')
    path = os.path.join(OUT, 'demo_3_tidal.png')
    result.save(path, quality=97)
    print(f"    ✓ saved: {path}")


# ═══════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════
if __name__ == '__main__':
    print("\n╔═══════════════════════════════════════╗")
    print("║  FORM — Demo Render                   ║")
    print("╚═══════════════════════════════════════╝\n")
    demo_murmuration()
    print()
    demo_grain()
    print()
    demo_tidal()
    print(f"\n✓ All 3 demos saved to: {OUT}/\n")
