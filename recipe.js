// recipe.js — interactivity for /recipes/<slug>/ pages
// Servings ± buttons (scales ingredient quantities)
// Ingredient checkbox toggle

(function () {
  'use strict';

  const FRAC = { '¼': 0.25, '½': 0.5, '⅓': 1/3, '⅔': 2/3, '¾': 0.75 };
  const FRAC_LOOKUP = [
    { v: 1/4, c: '¼' },
    { v: 1/3, c: '⅓' },
    { v: 1/2, c: '½' },
    { v: 2/3, c: '⅔' },
    { v: 3/4, c: '¾' },
  ];

  function fmt(v) {
    if (Math.abs(v - Math.round(v)) < 0.02) return String(Math.round(v));
    const whole = Math.floor(v);
    const frac = v - whole;
    const closest = FRAC_LOOKUP.reduce((best, cur) =>
      Math.abs(cur.v - frac) < Math.abs(best.v - frac) ? cur : best
    );
    if (Math.abs(closest.v - frac) < 0.06) {
      return whole > 0 ? whole + ' ' + closest.c : closest.c;
    }
    return v.toFixed(1).replace(/\.0$/, '');
  }

  // Parse leading quantity like "1½", "½", "1.5", "1/2", "2"
  // Returns { value: number, length: number } where length is chars consumed, or null
  function parseLeadingQty(text) {
    // Pattern: optional integer + optional fraction-char OR fraction-char alone
    const m = text.match(/^(\d+(?:\.\d+)?)?\s*([¼½⅓⅔¾])?/);
    if (!m || (!m[1] && !m[2])) return null;
    const num = m[1] ? parseFloat(m[1]) : 0;
    const fracVal = m[2] ? FRAC[m[2]] : 0;
    const total = num + fracVal;
    if (total === 0) return null;
    return { value: total, length: m[0].length };
  }

  // Initialise each servings-control on the page
  document.querySelectorAll('.servings-control').forEach(function (ctl) {
    const base = parseInt(ctl.dataset.base, 10) || 4;
    const numEl = ctl.querySelector('.servings-num');
    let current = base;

    const ingredients = document.querySelectorAll('.ingredient');
    // Capture original text once
    const originals = Array.from(ingredients).map(function (li) {
      return li.textContent;
    });

    function rescale() {
      const factor = current / base;
      ingredients.forEach(function (li, i) {
        const original = originals[i];
        const qty = parseLeadingQty(original);
        if (!qty) {
          // No leading quantity — leave as-is
          return;
        }
        const rest = original.slice(qty.length);
        const scaled = fmt(qty.value * factor);
        // Preserve "checked" state via class; just update text content
        li.textContent = scaled + rest;
      });
    }

    ctl.querySelectorAll('.servings-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const action = btn.dataset.action;
        if (action === 'inc' && current < 16) current++;
        else if (action === 'dec' && current > 1) current--;
        else return;
        numEl.textContent = current;
        rescale();
      });
    });
  });

  // Ingredient checkbox toggle
  document.querySelectorAll('.ingredient').forEach(function (li) {
    li.addEventListener('click', function () {
      li.classList.toggle('checked');
    });
  });
})();
