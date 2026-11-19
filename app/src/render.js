// Vice City Cover Studio — the cover engine.
// Draws a multi-panel poster onto any 2D canvas: each panel holds one photo
// (cover-fit, with its own zoom and pan), a colour grade washes over the
// whole poster, and a title block with big condensed lettering sits on top.
// Everything here is drawn from scratch — no borrowed artwork, no logos.

export const SIZES = {
  square: { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  story: { label: 'Story · 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

export const LAYOUTS = {
  hero: { label: 'Full bleed', panels: 1, hint: 'One photo, edge to edge' },
  duo: { label: 'Duo split', panels: 2, hint: 'Two photos side by side' },
  trio: { label: 'Hero + two', panels: 3, hint: 'One big photo, two stacked' },
  grid: { label: 'Four panel', panels: 4, hint: 'The classic poster grid' },
  strip: { label: 'Three strip', panels: 3, hint: 'Three tall panels' },
};

// A grade is a filter wash plus two overlay colours: one brushed in from the
// top of the poster, one rising from the bottom, like a sunset sky.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset', filter: 'saturate(1.35) contrast(1.08) brightness(1.02)',
    top: 'rgba(255, 176, 66, 0.16)', bottom: 'rgba(214, 51, 132, 0.34)',
    title: ['#ffe259', '#ff7e5f', '#e84393'], accent: '#ff7e5f',
  },
  neon: {
    label: 'Neon Nights', filter: 'saturate(1.5) contrast(1.12) brightness(0.98)',
    top: 'rgba(0, 229, 255, 0.20)', bottom: 'rgba(255, 0, 153, 0.36)',
    title: ['#7df9ff', '#ff5ce1', '#b967ff'], accent: '#00e5ff',
  },
  gold: {
    label: 'Palm Gold', filter: 'saturate(1.25) contrast(1.05) brightness(1.06)',
    top: 'rgba(255, 214, 120, 0.22)', bottom: 'rgba(176, 96, 0, 0.30)',
    title: ['#fff3b0', '#ffc300', '#ff7b00'], accent: '#ffc300',
  },
  noir: {
    label: 'Noir Vice', filter: 'saturate(0.25) contrast(1.28) brightness(0.96)',
    top: 'rgba(180, 200, 255, 0.10)', bottom: 'rgba(255, 45, 120, 0.30)',
    title: ['#ffffff', '#ffd6e8', '#ff2d78'], accent: '#ff2d78',
  },
  lagoon: {
    label: 'Lagoon Teal', filter: 'saturate(1.3) contrast(1.06) brightness(1.03)',
    top: 'rgba(64, 224, 208, 0.20)', bottom: 'rgba(0, 90, 140, 0.34)',
    title: ['#d0fff4', '#40e0d0', '#0090c8'], accent: '#40e0d0',
  },
};

// Panel rectangles for a layout, as fractions of the poster. The gap between
// panels is the poster's own dark background showing through.
export function panelRects(layout, W, H, gap) {
  const g = gap;
  const full = [{ x: 0, y: 0, w: 1, h: 1 }];
  switch (layout) {
    case 'duo':
      return [
        { x: 0, y: 0, w: 0.5 - g / 2 / W, h: 1 },
        { x: 0.5 + g / 2 / W, y: 0, w: 0.5 - g / 2 / W, h: 1 },
      ];
    case 'trio':
      return [
        { x: 0, y: 0, w: 0.62 - g / 2 / W, h: 1 },
        { x: 0.62 + g / 2 / W, y: 0, w: 0.38 - g / 2 / W, h: 0.5 - g / 2 / H },
        { x: 0.62 + g / 2 / W, y: 0.5 + g / 2 / H, w: 0.38 - g / 2 / W, h: 0.5 - g / 2 / H },
      ];
    case 'grid':
      return [
        { x: 0, y: 0, w: 0.5 - g / 2 / W, h: 0.5 - g / 2 / H },
        { x: 0.5 + g / 2 / W, y: 0, w: 0.5 - g / 2 / W, h: 0.5 - g / 2 / H },
        { x: 0, y: 0.5 + g / 2 / H, w: 0.5 - g / 2 / W, h: 0.5 - g / 2 / H },
        { x: 0.5 + g / 2 / W, y: 0.5 + g / 2 / H, w: 0.5 - g / 2 / W, h: 0.5 - g / 2 / H },
      ];
    case 'strip':
      return [0, 1, 2].map((i) => ({
        x: (i / 3) + (i === 0 ? 0 : g / 2 / W),
        y: 0,
        w: 1 / 3 - (i === 1 ? g / W : g / 2 / W),
        h: 1,
      }));
    case 'hero':
    default:
      return full;
  }
}

// A small deterministic noise tile, so grain looks the same on every export.
let noiseTile = null;
function grainTile() {
  if (noiseTile) return noiseTile;
  const t = document.createElement('canvas');
  t.width = 128; t.height = 128;
  const c = t.getContext('2d');
  const img = c.createImageData(128, 128);
  let seed = 20261119;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const v = seed % 256;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  noiseTile = t;
  return t;
}

// Draw one photo into one panel rect, cover-fit, zoomed and panned by the
// panel's own settings. x/y are -1..1 fractions of the spare room.
function drawPanel(ctx, img, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const scale = base * (panel.zoom || 1);
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const ox = (w - pw) / 2 + (panel.x || 0) * Math.max(0, (pw - w) / 2);
    const oy = (h - ph) / 2 + (panel.y || 0) * Math.max(0, (ph - h) / 2);
    ctx.filter = grade.filter;
    ctx.drawImage(img, x + ox, y + oy, pw, ph);
    ctx.filter = 'none';
  } else {
    // Empty panel: a sunset sky gradient so the poster never looks broken.
    const sky = ctx.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, '#3b1d5a'); sky.addColorStop(0.55, '#c2337f'); sky.addColorStop(1, '#ff8a3d');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `600 ${Math.round(h * 0.045)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Drop a photo here', x + w / 2, y + h / 2);
  }
  ctx.restore();
}

// Shrink a line of text until it fits the width, then paint it once.
function paintTitle(ctx, text, cx, baseline, maxWidth, size, font, fill, stroke) {
  let s = size;
  ctx.font = font(s);
  while (s > 14 && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = font(s);
  }
  try { ctx.letterSpacing = `${Math.max(1, Math.round(s * 0.04))}px`; } catch { /* older canvas */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, s * 0.09);
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, cx, baseline);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, cx, baseline);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  return s;
}

export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const gap = Math.round(Math.min(W, H) * 0.008);

  // Poster background: deep dusk purple, showing through the panel gaps.
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, W, H);

  const rects = panelRects(state.layout, W, H, gap);
  rects.forEach((r, i) => {
    const panel = state.panels[i] || { photo: 0, zoom: 1, x: 0, y: 0 };
    const img = state.photos[panel.photo]?.img || null;
    drawPanel(ctx, img, { x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H }, panel, grade);
  });

  // White poster frame between the panels, like a printed cover.
  if (state.frame) {
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, gap * 0.9);
    rects.forEach((r) => ctx.strokeRect(r.x * W + gap / 4, r.y * H + gap / 4, r.w * W - gap / 2, r.h * H - gap / 2));
  }

  // The grade wash: warm light from the top, hot colour rising from below.
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(0.55, 'rgba(0,0,0,0)');
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  // Vignette: darken the corners so the middle pops.
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,20,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Grain over everything, faint.
  if (state.grain) {
    const tile = grainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Title block: a dark band the lettering sits on, top or bottom.
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const atTop = state.titlePos === 'top';
  const bandH = H * (subtitle ? 0.21 : 0.16);
  const bandY = atTop ? 0 : H - bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  if (atTop) { band.addColorStop(0, 'rgba(12,2,24,0.88)'); band.addColorStop(1, 'rgba(12,2,24,0)'); }
  else { band.addColorStop(0, 'rgba(12,2,24,0)'); band.addColorStop(1, 'rgba(12,2,24,0.88)'); }
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, W, bandH);

  if (title) {
    const grad = ctx.createLinearGradient(0, bandY + bandH * 0.15, 0, bandY + bandH * 0.95);
    grad.addColorStop(0, grade.title[0]);
    grad.addColorStop(0.55, grade.title[1]);
    grad.addColorStop(1, grade.title[2]);
    const size = H * 0.092;
    const baseline = atTop ? bandY + bandH * (subtitle ? 0.52 : 0.68) : H - H * (subtitle ? 0.082 : 0.05);
    paintTitle(ctx, title, W / 2, baseline, W * 0.92, size,
      (s) => `${s}px Anton, 'Bebas Neue', 'Arial Narrow', sans-serif`, grad, 'rgba(10,2,18,0.9)');
  }
  if (subtitle) {
    const subSize = H * 0.042;
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = subSize * 0.9;
    ctx.fillStyle = '#ffffff';
    const subY = atTop ? bandY + bandH * 0.92 : H - H * 0.028;
    ctx.fillText(subtitle, W / 2, subY);
    ctx.shadowBlur = 0;
  }

  // Badge ribbon, opposite corner from the title band.
  if (state.badge) {
    const pad = Math.round(W * 0.022);
    const bh = Math.round(H * 0.038);
    const label = 'VICE CITY  ★  EST. 2026';
    ctx.font = `700 ${Math.round(bh * 0.42)}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
    try { ctx.letterSpacing = '2px'; } catch { /* older canvas */ }
    const bw = ctx.measureText(label).width + pad * 2;
    const bx = W - bw - pad;
    const by = atTop ? H - pad - bh : pad;
    ctx.fillStyle = 'rgba(12,2,24,0.72)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = Math.max(1.5, bh * 0.06);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }

  // Outer white border, like a printed poster sleeve.
  if (state.frame) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.round(Math.min(W, H) * 0.012);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  }
}
