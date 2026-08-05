# StructLab backend foundation

## Runtime

- Cloudflare-compatible Worker entry: `server/index.js`
- Structured persistence: D1 binding `DB`
- Object storage: R2 binding `UPLOADS`
- Canonical migration: `drizzle/0001_structlab_core.sql`
- Schema map: `db/schema.ts`

## Product data

The initial schema includes users, student profiles, companies and members, courses/modules/lessons, enrollments and progress, jobs, saved jobs, applications, certificates, file metadata, moderation cases, audit logs, and platform settings.

## API groups

- `/api/auth/*`: verified identity session and onboarding
- `/api/profile`: role-aware profile update
- `/api/student/*`: courses, enrollments, progress, jobs, saved jobs, applications
- `/api/company/*`: company-owned jobs, applications, and candidate access
- `/api/admin/*`: statistics, users, companies, courses, moderation, settings, audit
- `/api/files/*`: validated upload and ownership-checked download

## Operational requirements

The production Site must keep D1 and R2 bindings enabled. The Site should remain owner-only for the first visit so the owner becomes bootstrap admin. Before public launch, confirm the access policy, legal text, support address, retention policy, and abuse-response process.

The current host uses platform e-mail verification. If a separate branded OTP e-mail service is required later, it needs a verified sending domain, provider credentials, delivery monitoring, retry limits, abuse controls, and recovery flows; it must not replace server-side authorization.
