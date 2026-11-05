#!/usr/bin/env node
// Renders the README figures from drawing.json + model.js with the teardown skill's runtime
// (tools/teardown), inked and tinted exactly as its viewer does, labels on, cropped to the drawing.
//
//   node docs/figures/render.cjs            → docs/figures/<id>.svg and <id>.png (2× for retina)
//   node docs/figures/render.cjs --assembled  also writes <id>-assembled.svg/.png

const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), {execFileSync} = require('node:child_process');
const here = __dirname, tools = path.resolve(here, '../../tools/teardown');
const {RUNTIME, load} = require(path.join(tools, 'scripts/config.cjs'));
const SHEET = require(path.join(tools, 'assets/sheet.js'));

const {config, modelScripts} = load(path.join(here, 'drawing.json'));
const context = {console, structuredClone};
context.self = context;
vm.createContext(context);
for (const file of [...RUNTIME, ...modelScripts]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});

// --- The viewer's ink: OKLab at a fixed lightness, the largest chroma that stays in sRGB. -------
const GRAPHITE = '#202020', INK = {lightness: 0.52, maxChroma: 0.2};
function linearRgb(hue, chroma) {
  const angle = (hue * Math.PI) / 180, a = chroma * Math.cos(angle), b = chroma * Math.sin(angle);
  const l = (INK.lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (INK.lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (INK.lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
function inkFromHue(hue) {
  let low = 0, high = INK.maxChroma;
  for (let i = 0; i < 20; i++) {
    const c = (low + high) / 2;
    if (linearRgb(hue, c).every((x) => x >= -1e-4 && x <= 1 + 1e-4)) low = c;
    else high = c;
  }
  return '#' + linearRgb(hue, low).map((x) => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  }).join('');
}
const tint = (hex) => '#' + [1, 3, 5].map((i) => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * 0.18).toString(16).padStart(2, '0')).join('');

const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function style(markup, drawing) {
  const hues = drawing.colors?.hues ?? {}, filled = new Set(drawing.colors?.fills ?? []);
  const ink = (id) => (id in hues ? inkFromHue(hues[id]) : GRAPHITE);
  // Fills: a tint for filled parts, paper where an unfilled part covers a filled one.
  markup = markup.replace(/<path data-fill="([^"]*)" data-covers="([^"]*)" fill="none"/g, (_, id, covers) => {
    const paint = filled.has(id) ? tint(ink(id)) : covers.split(' ').some((c) => filled.has(c)) ? '#fff' : 'none';
    return `<path data-fill="${id}" data-covers="${covers}" fill="${paint}" stroke="${paint}" stroke-width=".1" stroke-linejoin="round"`;
  });
  // Each part's linework takes its hue.
  const rules = Object.keys(hues).map((id) => `[data-item="${id}"] [data-line-role]{stroke:${ink(id)}}`).join('');
  return {markup, rules};
}

/** Paper-space bounds of everything drawn, with a rough width for the capitalized labels. */
function bounds(markup) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => ((x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y)));
  for (const [, d] of markup.matchAll(/ d="([^"]*)"/g)) {
    const n = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
    for (let i = 0; i + 1 < n.length; i += 2) add(n[i], n[i + 1]);
  }
  for (const [, x, y, size, anchor, text] of markup.matchAll(/<text[^>]* x="([^"]*)" y="([^"]*)" font-size="([^"]*)" text-anchor="([^"]*)">([^<]*)</g)) {
    const w = text.length * Number(size) * 0.64;
    add(anchor === 'end' ? Number(x) - w : Number(x) + w, Number(y));
    add(Number(x), Number(y) - Number(size));
  }
  return [x0, y0, x1, y1];
}

function sheet(drawing, explosion) {
  const model = context.DrawingModels[drawing.id];
  const params = Object.fromEntries(drawing.parameters.map((p) => [p.key, p.default]));
  const {markup: raw} = model(params, {explosion, fitExplosion: explosion, isolated: null, fill: true, annotate: true});
  const {markup, rules} = style(raw, drawing);
  const [x0, y0, x1, y1] = bounds(markup), pad = 6;
  const box = [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].map((v) => +v.toFixed(2));
  const css = `[data-line-role]{fill:none;stroke:${GRAPHITE};stroke-linejoin:round}${SHEET.css('technical')}${rules}`
    + `[data-annotations] [data-line-role]{stroke:${GRAPHITE}}[data-ink-fill]{fill:${GRAPHITE}}`
    + `text{font-family:Inter,"Helvetica Neue",Helvetica,Arial,sans-serif;font-weight:500;letter-spacing:.05em}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" width="${box[2] * 4}" height="${box[3] * 4}" role="img" aria-labelledby="t d">`
    + `<title id="t">${esc(drawing.title)}</title><desc id="d">${esc(drawing.description)}</desc>`
    + `<style>${css}</style><rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="#fff"/>${markup}</svg>`;
}

const assembled = process.argv.includes('--assembled');
for (const drawing of config.drawings) {
  const jobs = [[drawing.id, 1], ...(assembled ? [[`${drawing.id}-assembled`, 0]] : [])];
  for (const [name, explosion] of jobs) {
    const file = path.join(here, `${name}.svg`);
    fs.writeFileSync(file, sheet(drawing, explosion));
    const png = file.replace(/\.svg$/, '.png');
    execFileSync('rsvg-convert', ['-z', '2', '-o', png, file]);
    // Flat tints and fine lines quantize with no visible loss: about a fifth of the size.
    try {
      execFileSync('pngquant', ['--quality', '85-98', '--speed', '1', '--force', '--output', png, png]);
    } catch {}
    console.log(`${name}: ${(fs.statSync(file).size / 1024).toFixed(0)} KB svg`);
  }
}
