# StructLab

StructLab is a React/Vite construction education and hiring platform with a Cloudflare-compatible server layer.

The application now includes verified identity, role-based authorization, D1 persistence, R2 file storage, student/company/admin workspaces, course and job workflows, moderation, and audit logging. See `docs/access-control.md` and `docs/backend.md` for the security and data model.

## Local frontend

```powershell
npm.cmd install
npm.cmd run dev
```

The local Vite frontend does not emulate hosted identity, D1, or R2. Full authenticated API behavior is available on the deployed Sites environment.

## Validation

```powershell
npm.cmd run build
node --check server/index.js
```

The pre-React source is retained in `reference/index.static.html`. Run `npm run extract:legacy` only when that reference file is intentionally updated; it regenerates the page fragments, stylesheet, and compatibility runtime.
