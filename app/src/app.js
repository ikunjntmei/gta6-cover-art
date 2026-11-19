// Vice City Cover Studio — the page wiring.
// State lives in one object; every change re-renders the preview canvas.
// Photos never leave the machine: uploads are read with object URLs and the
// app makes no network request at all.

import { drawCover, panelRects, GRADES, LAYOUTS, SIZES } from './render.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const statusEl = $('status');

// One panel per layout slot: which photo it shows, and its crop (zoom/pan).
function freshPanels(layout) {
  const n = LAYOUTS[layout].panels;
  return Array.from({ length: n }, (_, i) => ({ photo: i % 2, zoom: 1, x: 0, y: 0 }));
}

const state = {
  photos: [],          // { img, name } — index 0 boulevard, 1 pier once loaded
  panels: freshPanels('grid'),
  layout: 'grid',
  grade: 'sunset',
  size: 'square',
  title: 'Boulevard Queen',
  subtitle: 'Vice City Nights',
  titlePos: 'bottom',
  frame: true,
  grain: true,
  badge: true,
  selected: 0,         // the panel the sliders and tray act on
};

function render() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state);
  $('zoom').value = state.panels[state.selected]?.zoom ?? 1;
  $('panx').value = state.panels[state.selected]?.x ?? 0;
  $('pany').value = state.panels[state.selected]?.y ?? 0;
  document.querySelectorAll('#panels .thumb').forEach((el, i) => {
    el.classList.toggle('active', i === state.selected);
  });
  document.querySelectorAll('#tray .thumb').forEach((el, i) => {
    el.classList.toggle('assigned', state.panels[state.selected]?.photo === i);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(url, name) {
  const img = await loadImage(url);
  state.photos.push({ img, name });
  const i = state.photos.length - 1;
  const tray = $('tray');
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'thumb';
  el.title = name;
  const thumb = document.createElement('canvas');
  thumb.width = 96; thumb.height = 96;
  const c = thumb.getContext('2d');
  const s = Math.max(96 / img.naturalWidth, 96 / img.naturalHeight);
  c.drawImage(img, (96 - img.naturalWidth * s) / 2, (96 - img.naturalHeight * s) / 2,
    img.naturalWidth * s, img.naturalHeight * s);
  el.appendChild(thumb);
  el.addEventListener('click', () => {
    state.panels[state.selected].photo = i;
    render();
  });
  tray.appendChild(el);
  return i;
}

async function loadSamples() {
  if (state.photos.length) return;
  await addPhoto('samples/boulevard.jpg', 'Boulevard sample');
  await addPhoto('samples/pier.jpg', 'Pier sample');
  render();
}

// Panel thumbnails under the preview: click one to select it, then the
// sliders crop that panel, and a tray photo assigns to it.
function buildPanelBar() {
  const bar = $('panels');
  bar.innerHTML = '';
  state.panels.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => { state.selected = i; render(); });
    bar.appendChild(b);
  });
}

function buildPickers() {
  const layoutEl = $('layout');
  Object.entries(LAYOUTS).forEach(([key, l]) => {
    const o = document.createElement('option');
    o.value = key; o.textContent = `${l.label} — ${l.hint}`;
    layoutEl.appendChild(o);
  });
  layoutEl.value = state.layout;
  const gradeEl = $('grade');
  Object.entries(GRADES).forEach(([key, g]) => {
    const o = document.createElement('option');
    o.value = key; o.textContent = g.label;
    gradeEl.appendChild(o);
  });
  gradeEl.value = state.grade;
  const sizeEl = $('size');
  Object.entries(SIZES).forEach(([key, s]) => {
    const o = document.createElement('option');
    o.value = key; o.textContent = s.label;
    sizeEl.appendChild(o);
  });
  sizeEl.value = state.size;
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function exportOne(key) {
  const size = SIZES[key];
  const off = document.createElement('canvas');
  off.width = size.w; off.height = size.h;
  drawCover(off, state);
  off.toBlob((blob) => {
    download(blob, `vice-city-cover-${size.w}x${size.h}.png`);
    statusEl.textContent = `Saved vice-city-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
}

// ---- events ---------------------------------------------------------------

$('layout').addEventListener('change', (e) => {
  state.layout = e.target.value;
  state.panels = freshPanels(state.layout);
  state.selected = 0;
  buildPanelBar();
  render();
});
$('grade').addEventListener('change', (e) => { state.grade = e.target.value; render(); });
$('size').addEventListener('change', (e) => { state.size = e.target.value; render(); });
$('title').addEventListener('input', (e) => { state.title = e.target.value; render(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
$('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; render(); });
$('frame').addEventListener('change', (e) => { state.frame = e.target.checked; render(); });
$('grain').addEventListener('change', (e) => { state.grain = e.target.checked; render(); });
$('badge').addEventListener('change', (e) => { state.badge = e.target.checked; render(); });
$('zoom').addEventListener('input', (e) => { state.panels[state.selected].zoom = Number(e.target.value); render(); });
$('panx').addEventListener('input', (e) => { state.panels[state.selected].x = Number(e.target.value); render(); });
$('pany').addEventListener('input', (e) => { state.panels[state.selected].y = Number(e.target.value); render(); });

$('shuffle').addEventListener('click', () => {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  state.panels = freshPanels(state.layout);
  state.selected = 0;
  $('layout').value = state.layout;
  $('grade').value = state.grade;
  buildPanelBar();
  render();
  statusEl.textContent = `Shuffled: ${LAYOUTS[state.layout].label} · ${GRADES[state.grade].label}`;
});

$('upload').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    await addPhoto(URL.createObjectURL(file), file.name);
  }
  render();
  statusEl.textContent = `${state.photos.length} photo(s) loaded`;
});

$('sampleBtn').addEventListener('click', async () => {
  await loadSamples();
  statusEl.textContent = 'Sample photos loaded — pick a layout and export';
});

$('exportOne').addEventListener('click', () => exportOne(state.size));
$('exportAll').addEventListener('click', () => {
  Object.keys(SIZES).forEach((key, i) => setTimeout(() => exportOne(key), i * 350));
  statusEl.textContent = 'Exporting all three sizes…';
});

// Drag on the preview pans the selected panel; the wheel zooms it. A click
// on a panel selects it, so cropping never needs the sliders.
let dragging = null;
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const fx = (clientX - r.left) / r.width;
  const fy = (clientY - r.top) / r.height;
  const rects = panelRects(state.layout, 1, 1, 0.008);
  return rects.findIndex((p) => fx >= p.x && fx <= p.x + p.w && fy >= p.y && fy <= p.y + p.h);
}
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  state.selected = i;
  dragging = { x: e.clientX, y: e.clientY, px: state.panels[i].x, py: state.panels[i].y };
  canvas.setPointerCapture(e.pointerId);
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  const p = state.panels[state.selected];
  p.x = Math.max(-1, Math.min(1, dragging.px + ((e.clientX - dragging.x) / r.width) * 2));
  p.y = Math.max(-1, Math.min(1, dragging.py + ((e.clientY - dragging.y) / r.height) * 2));
  render();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[state.selected];
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  render();
}, { passive: false });

// Drag a photo file straight onto the stage to add it.
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  for (const file of e.dataTransfer.files) {
    if (file.type.startsWith('image/')) await addPhoto(URL.createObjectURL(file), file.name);
  }
  render();
});

// ---- start ----------------------------------------------------------------

buildPickers();
buildPanelBar();
if (document.fonts?.ready) document.fonts.ready.then(() => render());
const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  document.body.classList.add('shot');
  runShot(query, state, { loadSamples, render, addPhoto });
} else {
  loadSamples().then(() => { statusEl.textContent = 'Samples loaded — or drop in your own photos'; });
}
render();
