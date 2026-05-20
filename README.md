# Airfried

A recipe site. Static landing page for now; Next.js + MDX recipe pages coming on top.

## Structure

- `index.html` — home page (static, served at `/`)
- `brand.css` — design tokens + utilities (Hearth-derived editorial system)
- `content/recipes/*.mdx` — recipe content (frontmatter + editorial intro + ingredients + method + notes)
- `public/recipes/*.jpg` — recipe hero images
- `vercel.json` — static-site config (clean URLs, security headers)

## Local preview

```bash
npx serve . -l 8000
# open http://localhost:8000
```

## Deploy

Auto-deployed to Vercel on push to `main`.
