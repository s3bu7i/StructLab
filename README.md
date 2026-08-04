# StructLab

StructLab is a React frontend for a construction education, certification, and hiring platform. The original visual language is preserved while the landing page, student dashboard, company dashboard, admin panel, and shared overlays are separated into React-owned page surfaces.

## Development

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

The pre-React source is retained in `reference/index.static.html`. Run `npm run extract:legacy` only when that reference file is intentionally updated; it regenerates the page fragments, stylesheet, and compatibility runtime.
