// Concept drawings for the README, built with the teardown skill's geometry helpers.
// Each idea is one part made of thin plates, exploded along world z so every layer lifts off the
// one below it. Nothing here has physical dimensions: sizes are invented and only proportion matters.

self.DrawingModels ??= {};

const CAMERA = {azimuth: -118, elevation: 22, roll: 0};

/** A plate with its top face at `z + t`, optionally carrying ruled "text" lines on that face. */
function plate(G, p, [x0, y0, x1, y1], z, t, {radius = 2, rules = 0, inset = 6, ruleRole = 'detail'} = {}) {
  G.box(p, [x0, y0, z], [x1, y1, z + t], {radius});
  const top = z + t + 0.05;
  for (let i = 0; i < rules; i++) {
    const y = y1 - inset - i * ((y1 - y0 - 2 * inset) / Math.max(1, rules - 1));
    // Alternate line lengths so the rules read as text, not as a grille.
    const end = x1 - inset - (i % 3 === 2 ? (x1 - x0) * 0.35 : i % 3 === 1 ? (x1 - x0) * 0.12 : 0);
    G.line(p, [x0 + inset, y, top], [end, y, top], ruleRole);
  }
}

const part = (G, id, name, dz) => {
  const p = G.part(id, name);
  p.explosion = [0, 0, dz];
  return p;
};

// ---------------------------------------------------------------------------------------------
// 1. Anatomy of a research agent: model, brief, skills, tools.

self.DrawingModels.agent = (params, options) => {
  const G = TechnicalGeometry;
  const gap = params.gap;
  const parts = [];

  const model = part(G, 'model', 'Model', 0);
  plate(G, model, [-60, -40, 60, 40], 0, 8, {radius: 5});
  // A die on the base, so the model layer reads as the engine underneath.
  G.box(model, [-18, -14, 8], [18, 14, 10], {radius: 1});
  parts.push(model);

  const brief = part(G, 'brief', 'Brief · AGENTS.md', gap);
  plate(G, brief, [-55, -36, 55, 36], 11, 1.6, {rules: 9, inset: 7});
  parts.push(brief);

  const skills = [
    ['research-company', 'Skill · research-company', [-52, 2, -2, 32]],
    ['x-history', 'Skill · x-history', [2, 2, 52, 32]],
    ['hacker-news', 'Skill · hacker-news', [-52, -32, -2, -2]],
    ['youtube-transcripts', 'Skill · youtube-transcripts', [2, -32, 52, -2]],
  ];
  for (const [id, name, rect] of skills) {
    const card = part(G, `skill-${id}`, name, gap * 2);
    plate(G, card, rect, 14, 1.4, {rules: 4, inset: 5, radius: 1.5});
    parts.push(card);
  }

  const tools = [
    ['hl', './hl CLI · the gate', [-56, 14, -8, 40], 7],
    ['sc', 'ScrapeCreators · paid', [8, 14, 56, 40], 5],
    ['ctx', 'Context.dev · metered', [-56, -40, -8, -14], 5],
    ['free', 'Free APIs · HN, Bluesky, Wayback, yt-dlp', [8, -40, 56, -14], 4],
  ];
  for (const [id, name, [x0, y0, x1, y1], h] of tools) {
    const t = part(G, `tool-${id}`, name, gap * 3);
    G.box(t, [x0, y0, 17], [x1, y1, 17 + h], {radius: 2});
    // A port on each tool's front face: where it reaches out to the web.
    G.box(t, [x0 + 8, y0 - 0.8, 17 + h * 0.3], [x0 + 20, y0, 17 + h * 0.7], {radius: 0.3});
    parts.push(t);
  }

  return TechnicalProjection.render(parts, {...options, camera: CAMERA});
};

// ---------------------------------------------------------------------------------------------
// 2. From the web to the website: sources, raw cache, the gate, the archive, snapshot, site.

self.DrawingModels.pipeline = (params, options) => {
  const G = TechnicalGeometry;
  const gap = params.gap;
  const parts = [];

  const web = part(G, 'web', 'The web · tweets, videos, threads, archives', 0);
  plate(G, web, [-70, -45, 70, 45], 0, 3, {radius: 4});
  // One tile per primary source, scattered like a feed.
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 4; j++) {
      const x = -60 + i * 25 + (j % 2) * 6, y = -36 + j * 19;
      G.box(web, [x, y, 3], [x + 16, y + 11, 4.4], {radius: 1});
    }
  parts.push(web);

  const raw = part(G, 'raw', 'Raw cache · data/raw', gap);
  plate(G, raw, [-60, -38, 60, 38], 6, 1.6, {radius: 3});
  for (let k = 0; k < 3; k++) G.box(raw, [-44 + k * 30, -24 + k * 4, 7.6], [-20 + k * 30, 18 + k * 4, 8.4 + k * 0.4], {radius: 0.6});
  parts.push(raw);

  const gate = part(G, 'gate', 'The gate · ./hl refuses unsourced facts', gap * 2);
  const slot = [[-34, -6], [34, -6], [34, 6], [-34, 6]];
  G.extrude(gate, G.roundedRectangle(124, 80, 4), {depth: 5, holes: [slot]});
  G.transform(gate, {origin: [0, 0, 11]});
  gate.explosion = [0, 0, gap * 2];
  parts.push(gate);

  const collections = [
    ['sources', 'Sources', [-54, 4]],
    ['events', 'Events', [-16, 4]],
    ['quotes', 'Quotes', [22, 4]],
    ['entities', 'Entities', [-54, -30]],
    ['assets', 'Assets', [-16, -30]],
    ['pages', 'Pages', [22, -30]],
  ];
  for (const [id, name, [x, y]] of collections) {
    const c = part(G, `col-${id}`, `Archive · ${name}`, gap * 3);
    G.box(c, [x, y, 18], [x + 32, y + 26, 28], {radius: 2.5});
    // Index rings around each collection: it's a database, not a folder.
    for (const z of [21, 25]) G.line(c, [x, y - 0.05, z], [x + 32, y - 0.05, z], 'detail');
    parts.push(c);
  }

  const snap = part(G, 'snapshot', 'Snapshot · web/data/archive.json', gap * 4);
  plate(G, snap, [-56, -36, 56, 36], 30, 1, {radius: 2, rules: 6, inset: 8});
  parts.push(snap);

  const site = part(G, 'site', 'Website · Next.js', gap * 5);
  plate(G, site, [-62, -40, 62, 40], 32, 3, {radius: 4});
  G.box(site, [-56, -34, 35], [-26, 34, 36], {radius: 1});
  G.box(site, [-22, 6, 35], [56, 34, 36], {radius: 1});
  G.box(site, [-22, -34, 35], [56, 2, 36], {radius: 1});
  parts.push(site);

  return TechnicalProjection.render(parts, {...options, camera: CAMERA});
};

// ---------------------------------------------------------------------------------------------
// 3. Anatomy of a fact: the event cites a quote, from a source, captured raw, from the original.

self.DrawingModels.fact = (params, options) => {
  const G = TechnicalGeometry;
  const gap = params.gap;
  const parts = [];

  const original = part(G, 'original', 'Original post · the URL', 0);
  plate(G, original, [-50, -34, 50, 34], 0, 2, {radius: 3, rules: 7, inset: 8});
  // An avatar disc: the person who said it.
  G.lathe(original, [[0, 0], [0, 5], [0.8, 5], [0.8, 0]], {axis: 'z', at: [-38, 24, 2]});
  parts.push(original);

  const raw = part(G, 'raw', 'Raw capture · cached JSON', gap);
  plate(G, raw, [-46, -30, 46, 30], 4, 1.4, {radius: 2, rules: 5, inset: 9, ruleRole: 'texture'});
  parts.push(raw);

  const source = part(G, 'source', 'Source · url, type, author, date', gap * 2);
  plate(G, source, [-42, -27, 42, 27], 7, 2, {radius: 2.5, rules: 4, inset: 8});
  parts.push(source);

  const quote = part(G, 'quote', 'Quote · the exact words', gap * 3);
  plate(G, quote, [-36, -6, 36, 6], 11, 1.4, {radius: 1.5, rules: 1, inset: 4});
  parts.push(quote);

  const event = part(G, 'event', 'Event · date, kind, title', gap * 4);
  plate(G, event, [-46, -30, 46, 30], 14, 3, {radius: 3, rules: 3, inset: 9});
  // The kind tag in the corner.
  G.box(event, [24, 18, 17], [40, 24, 17.8], {radius: 2});
  parts.push(event);

  // A second agent's source for the same event: re-adding the event merges it in.
  const second = part(G, 'second', 'Second source · merged on re-add', 0);
  plate(G, second, [-28, -18, 28, 18], 7, 2, {radius: 2, rules: 3, inset: 6});
  G.transform(second, {origin: [96, 10, 0]});
  second.explosion = [0, 0, gap * 2];
  parts.push(second);

  const trails = [{a: [68, 10, 9], b: [46, 0, 15.5], from: 'second', to: 'event'}];
  return TechnicalProjection.render(parts, {...options, camera: CAMERA, trails});
};

// ---------------------------------------------------------------------------------------------
// 4. Many agents, one archive: agents write through the same gate; spend and deletions are logged.

self.DrawingModels.swarm = (params, options) => {
  const G = TechnicalGeometry;
  const gap = params.gap;
  const parts = [];
  const xs = [-44, 0, 44];

  const archive = part(G, 'archive', 'Shared archive · DocumentDB', 0);
  plate(G, archive, [-70, -32, 70, 32], 0, 9, {radius: 4});
  for (const z of [3, 6]) G.line(archive, [-70 + 4, -32 - 0.05, z], [70 - 4, -32 - 0.05, z], 'detail');
  parts.push(archive);

  const ledger = part(G, 'ledger', 'Spend ledger · api_calls', 0);
  G.box(ledger, [-102, -11, 0], [-80, 11, 12], {radius: 2});
  ledger.explosion = [-gap * 0.5, 0, 0];
  parts.push(ledger);

  const deletions = part(G, 'deletions', 'Deletions · every removal with a reason', 0);
  G.box(deletions, [80, -11, 0], [102, 11, 8], {radius: 2});
  deletions.explosion = [gap * 0.5, 0, 0];
  parts.push(deletions);

  const gate = part(G, 'gate', 'The gate · ./hl', gap);
  const slots = xs.map((x) => [[x - 12, -4], [x + 12, -4], [x + 12, 4], [x - 12, 4]]);
  G.extrude(gate, G.roundedRectangle(150, 60, 4), {depth: 4, holes: slots});
  G.transform(gate, {origin: [0, 0, 12]});
  gate.explosion = [0, 0, gap];
  parts.push(gate);

  const agents = [
    ['a', 'Agent · x-history'],
    ['b', 'Agent · youtube-transcripts'],
    ['c', 'Agent · hacker-news'],
  ];
  agents.forEach(([id, name], i) => {
    const a = part(G, `agent-${id}`, name, gap * 2);
    const x = xs[i];
    G.box(a, [x - 15, -15, 18], [x + 15, 15, 34], {radius: 3});
    // The skill card the agent works from, lying on top.
    G.box(a, [x - 11, -10, 34], [x + 11, 10, 35], {radius: 1});
    for (let r = 0; r < 3; r++) G.line(a, [x - 8, 6 - r * 5, 35.05], [x + 8 - (r === 2 ? 6 : 0), 6 - r * 5, 35.05], 'detail');
    parts.push(a);
  });

  const trails = xs.map((x, i) => ({a: [x, 0, 18], b: [x, 0, 12], from: `agent-${agents[i][0]}`, to: 'gate'}));
  return TechnicalProjection.render(parts, {...options, camera: CAMERA, trails});
};
