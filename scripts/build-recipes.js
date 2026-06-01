// scripts/build-recipes.js
// Read content/recipes/*.mdx → render each into /recipes/<slug>/index.html
// Also: copy public/recipes/*.jpg → /recipes/*.jpg, build /recipes/index.html

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content/recipes');
const IMAGES_SRC = path.join(ROOT, 'public/recipes');
const OUTPUT_DIR = path.join(ROOT, 'recipes');

marked.setOptions({ gfm: true, breaks: false });

// ── utilities ─────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

function fmtTime(m) {
  if (!m) return '—';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}

// Split markdown body by ## headings into named sections
function splitSections(body) {
  const result = { intro: '' };
  const re = /^##\s+(.+?)\s*$/gm;
  const matches = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    matches.push({
      heading: m[1].trim().toLowerCase(),
      headingEnd: m.index + m[0].length,
      start: m.index,
    });
  }
  if (matches.length === 0) {
    result.intro = body.trim();
    return result;
  }
  result.intro = body.slice(0, matches[0].start).trim();
  matches.forEach((sec, i) => {
    const next = matches[i + 1];
    const endIdx = next ? next.start : body.length;
    result[sec.heading] = body.slice(sec.headingEnd, endIdx).trim();
  });
  return result;
}

// Parse method body into structured steps
// Method content: ### 01. Title. body... ### 02. Title. body...
function parseMethodSteps(methodMd) {
  const steps = [];
  const re = /^###\s+(\d+)\.\s+(.+?)\n([\s\S]*?)(?=\n###\s+\d+\.|$)/gm;
  let m;
  while ((m = re.exec(methodMd)) !== null) {
    steps.push({
      number: m[1],
      title: m[2].trim().replace(/\.$/, ''),
      body: m[3].trim(),
    });
  }
  return steps;
}

// Process ingredients section markdown. The MDX uses bullet lists, possibly with
// subsection h3-h4 like "**Brine:**" or `### Brine`. We just add an `ingredient`
// class to each <li> for the JS to scale + check.
function renderIngredients(md) {
  const html = marked.parse(md);
  return html.replace(/<li>/g, '<li class="ingredient">');
}

// ── templates ─────────────────────────────────────────────────

const FONTS_LINK = `<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />`;

const PRECONNECT = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />`;

const GA_TAG = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-2PPHGWESW3"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-2PPHGWESW3');
</script>`;

function topNav(activeRecipes = false) {
  return `<header class="topnav">
  <div class="topnav-left">
    <a href="/" class="brandmark" style="color:var(--ink);text-decoration:none;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="display:block;">
        <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="1" />
        <path d="M6 15 Q 12 4 18 15" stroke="currentColor" stroke-width="1.2" fill="none" />
        <path d="M9 15 L9 18 M12 15 L12 18 M15 15 L15 18" stroke="currentColor" stroke-width="1" />
      </svg>
      <span class="word">
        <span class="name">Airfried</span>
        <span class="tag">Three hundred recipes</span>
      </span>
    </a>
    <nav class="h-nav" style="gap:28px;">
      <a href="/">Discover</a>
      <a href="/recipes/"${activeRecipes ? ' class="active"' : ''}>Recipes</a>
      <a href="#">Collections</a>
      <a href="#">Plan</a>
      <a href="#">Saved</a>
    </nav>
  </div>
  <div class="topnav-right">
    <a href="/recipes/" class="h-btn h-btn-rust" style="padding:9px 16px;">Browse all recipes →</a>
  </div>
</header>`;
}

function recipeDetailHtml(data, sections) {
  const folioBreadcrumb = ['Recipes', data.category, capitalize(data.method)]
    .filter(Boolean)
    .join(' / ');

  // Title — if frontmatter has title_emphasis, italicise that phrase
  let titleHtml = escapeHtml(data.title);
  if (data.title_emphasis) {
    const emph = escapeHtml(data.title_emphasis);
    titleHtml = titleHtml.replace(emph, `<em>${emph}</em>`);
  }

  const introHtml = sections.intro ? marked.parse(sections.intro) : '';
  const ingredientsHtml = sections.ingredients ? renderIngredients(sections.ingredients) : '';
  const methodSteps = sections.method ? parseMethodSteps(sections.method) : [];
  const notesHtml = sections.notes ? marked.parse(sections.notes) : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(data.title)} — Airfried</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="${escapeHtml(data.description || data.title)}" />
${PRECONNECT}
${FONTS_LINK}
<link rel="stylesheet" href="/brand.css" />
${GA_TAG}
</head>
<body class="h-paper">
<div class="page">
${topNav(true)}

<article class="recipe">
  <section class="recipe-hero">
    <div class="h-folio">${escapeHtml(folioBreadcrumb)}</div>
    <div class="recipe-hero-grid">
      <div class="recipe-hero-text">
        <div class="h-eyebrow">◆&nbsp;&nbsp;${escapeHtml(capitalize(data.method) || 'Recipe')}&nbsp;&nbsp;·&nbsp;&nbsp;serves ${escapeHtml(String(data.servings || 4))}</div>
        <h1 class="recipe-title">${titleHtml}</h1>
        ${data.description ? `<p class="recipe-lede">${escapeHtml(data.description)}</p>` : ''}
        <div class="metric-strip">
          <div class="metric"><div class="h-section-label">Active</div><div class="metric-val">${fmtTime(data.active_minutes)}</div></div>
          <div class="metric"><div class="h-section-label">Total</div><div class="metric-val">${fmtTime(data.total_minutes)}</div></div>
          <div class="metric"><div class="h-section-label">Yield</div><div class="metric-val">${escapeHtml(String(data.servings || 4))} servings</div></div>
          <div class="metric"><div class="h-section-label">Difficulty</div><div class="metric-val">${escapeHtml(data.difficulty || 'Easy')}</div></div>
        </div>
      </div>
      ${data.hero_image ? `<div class="photo recipe-hero-photo" style="background-image:url('${escapeHtml(data.hero_image)}');"></div>` : ''}
    </div>
  </section>

  ${introHtml ? `<section class="recipe-intro">${introHtml}</section>` : ''}

  <section class="recipe-body">
    <aside class="recipe-ingredients">
      <div class="h-rule-double" style="margin-bottom:18px;"></div>
      <div class="recipe-section-title">
        <h2>Ingredients</h2>
        <span class="h-folio">i.</span>
      </div>
      <div class="servings-control" data-base="${escapeHtml(String(data.servings || 4))}">
        <button class="servings-btn" data-action="dec" aria-label="Decrease servings">−</button>
        <span class="servings-val"><span class="servings-num">${escapeHtml(String(data.servings || 4))}</span> <span style="color:var(--ink-3);">serv.</span></span>
        <button class="servings-btn" data-action="inc" aria-label="Increase servings">+</button>
      </div>
      <div class="ingredients-list">${ingredientsHtml}</div>
    </aside>

    <div class="recipe-method">
      <div class="h-rule-double" style="margin-bottom:18px;"></div>
      <div class="recipe-section-title">
        <h2>Method</h2>
        <span class="h-folio">ii.</span>
      </div>
      <ol class="method-steps">
        ${methodSteps.map(step => `<li class="method-step">
          <div class="method-num">${escapeHtml(step.number)}</div>
          <div class="method-body">
            <h3 class="method-title">${escapeHtml(step.title)}</h3>
            <div class="method-text">${marked.parse(step.body)}</div>
          </div>
        </li>`).join('')}
      </ol>
      ${notesHtml ? `<aside class="recipe-note">
        <div class="h-section-label">From the kitchen</div>
        ${notesHtml}
      </aside>` : ''}
    </div>
  </section>

  <footer class="recipe-footer">
    <a href="/recipes/" class="h-btn">← Back to all recipes</a>
  </footer>
</article>

</div>
<script src="/recipe.js" defer></script>
</body>
</html>`;
}

function indexPageHtml(recipes) {
  // Sort by category, then title
  const sorted = [...recipes].sort((a, b) => {
    const c = (a.category || '').localeCompare(b.category || '');
    if (c) return c;
    return (a.title || '').localeCompare(b.title || '');
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>All recipes — Airfried</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="All Airfried recipes — every one tested in a basket." />
${PRECONNECT}
${FONTS_LINK}
<link rel="stylesheet" href="/brand.css" />
${GA_TAG}
</head>
<body class="h-paper">
<div class="page">
${topNav(true)}

<section class="recipes-masthead">
  <div class="h-folio" style="margin-bottom:14px;">Recipes</div>
  <h1 class="recipes-title">All <em>recipes</em>.</h1>
  <p class="recipes-lede">Every one tested in a basket, none needing more than a tablespoon of oil. We're starting with ${recipes.length} — three hundred soon.</p>
</section>

<section class="recipes-grid section-pad">
  <div class="bands" style="grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);">
    ${sorted.map(r => `<a href="/recipes/${escapeHtml(r.slug)}/" class="band" style="text-decoration:none;color:inherit;">
      <div class="h-section-label">${escapeHtml(r.category || 'Recipe')} · ${escapeHtml(fmtTime(r.total_minutes))}</div>
      ${r.hero_image ? `<div class="photo" style="background-image:url('${escapeHtml(r.hero_image)}');height:200px;"></div>` : ''}
      <h3>${escapeHtml(r.title)}</h3>
      <span class="h-folio" style="color:var(--ink);margin-top:auto;">Read →</span>
    </a>`).join('')}
  </div>
</section>

</div>
</body>
</html>`;
}

// ── main ──────────────────────────────────────────────────────

function main() {
  console.log('Building Airfried recipes...');

  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Copy images
  if (fs.existsSync(IMAGES_SRC)) {
    const imgs = fs.readdirSync(IMAGES_SRC).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    imgs.forEach(file => {
      fs.copyFileSync(path.join(IMAGES_SRC, file), path.join(OUTPUT_DIR, file));
    });
    console.log(`  ✓ Copied ${imgs.length} images → recipes/`);
  }

  // Read all recipe MDX
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mdx'));
  const recipes = [];

  files.forEach(file => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const { data, content } = matter(raw);

    if (!data.slug || !data.title) {
      console.warn(`  ✗ Skipping ${file}: missing slug or title`);
      return;
    }

    const sections = splitSections(content);
    const html = recipeDetailHtml(data, sections);
    const outDir = path.join(OUTPUT_DIR, data.slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    recipes.push({ ...data });
    console.log(`  ✓ /recipes/${data.slug}/`);
  });

  // Index page
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexPageHtml(recipes));
  console.log(`  ✓ /recipes/ (index, ${recipes.length} recipes)`);

  // sitemap.xml — written to project root so Vercel serves it at /sitemap.xml
  const SITE = 'https://airfried300.com';
  const urls = [
    { loc: `${SITE}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${SITE}/recipes`, priority: '0.9', changefreq: 'weekly' },
    ...recipes.map(r => ({
      loc: `${SITE}/recipes/${r.slug}`,
      priority: '0.7',
      changefreq: 'monthly',
    })),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(__dirname, '..', 'sitemap.xml'), sitemap);
  console.log(`  ✓ /sitemap.xml (${urls.length} URLs)`);

  console.log(`\nDone. Built ${recipes.length} recipes.`);
}

main();
