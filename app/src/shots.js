// Fixed scenes for screenshots: ?shot=cover shows the finished cover alone,
// ?shot=editor the full studio with a photo loaded, ?shot=story a portrait
// cover, ?shot=wide a widescreen one. window.__shotReady is set once the
// scene has painted, so a screenshot tool knows when to shoot.

const SCENES = {
  cover: { layout: 'grid', grade: 'sunset', size: 'square', title: 'Boulevard Queen', subtitle: 'Vice City Nights', hideControls: true },
  editor: { layout: 'grid', grade: 'sunset', size: 'square', title: 'Boulevard Queen', subtitle: 'Vice City Nights', hideControls: false },
  story: { layout: 'trio', grade: 'neon', size: 'story', title: 'Neon Shore', subtitle: 'After Dark in Vice City', hideControls: true },
  wide: { layout: 'hero', grade: 'gold', size: 'wide', title: 'Golden Hour', subtitle: 'Palm Trees & Chrome', hideControls: true, panels: [{ photo: 0, zoom: 1, x: 0, y: 0.55 }] },
};

const PANEL_COUNT = { hero: 1, duo: 2, trio: 3, grid: 4, strip: 3 };

export async function runShot(query, state, helpers) {
  const scene = SCENES[query.get('shot')] || SCENES.cover;
  state.layout = scene.layout;
  state.grade = scene.grade;
  state.size = scene.size;
  state.title = scene.title;
  state.subtitle = scene.subtitle;
  state.panels = Array.from({ length: PANEL_COUNT[scene.layout] },
    (_, i) => ({ photo: i % 2, zoom: 1, x: 0, y: 0 }));
  if (scene.panels) scene.panels.forEach((p, i) => { state.panels[i] = { ...state.panels[i], ...p }; });
  state.selected = 0;
  document.getElementById('layout').value = scene.layout;
  document.getElementById('grade').value = scene.grade;
  document.getElementById('size').value = scene.size;
  document.getElementById('title').value = scene.title;
  document.getElementById('subtitle').value = scene.subtitle;
  // Rebuild the panel selector to match this scene's layout.
  const bar = document.getElementById('panels');
  bar.innerHTML = '';
  state.panels.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => { state.selected = i; helpers.render(); });
    bar.appendChild(b);
  });
  if (scene.hideControls) document.body.classList.add('shot-cover');
  // Load the display fonts before the first paint, or the title draws in a fallback.
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px "Bebas Neue"'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch { /* fonts are optional */ }
  await helpers.loadSamples();
  helpers.render();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
