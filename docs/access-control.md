# StructLab access-control model

Authorization is enforced in `server/index.js` for every write and every private read. UI visibility is not treated as authorization.

## Student

- Read published courses and approved-company job listings.
- Enroll in courses and update only their own learning progress.
- Save jobs, apply once per job, and read only their own applications.
- Update only their own profile and upload only avatar or PDF resume files.
- Share their candidate profile with companies only when profile visibility allows it.
- Cannot create courses, publish jobs, inspect another student, approve a company, or access audit data.

## Company

- Belongs to a company through `company_members`; membership does not grant access to another company.
- `owner` and `recruiter` can create and update that company's jobs and move applications through the hiring pipeline.
- `training_manager` is reserved for training assignment operations.
- `viewer` has read-only company workspace access.
- Candidate access is limited to students who applied to one of the company's jobs and allowed company visibility.
- Can upload company logos and verification documents; cannot upload course assets.
- A company must be admin-approved before publishing a job.

## Admin

- Manage user roles and suspension status, except locking or demoting the current admin account.
- Approve or reject company profiles.
- Create, edit, publish, archive, and attach assets to courses.
- Review moderation cases, platform settings, files, and audit events.
- Admin actions are written to `audit_logs` with actor, entity, action, timestamp, and metadata.

## Identity and verification

- Sites/ChatGPT authentication supplies a stable user subject and verified e-mail to the Worker.
- The application never accepts a role, user id, or e-mail from the browser as proof of identity.
- The first user created while the Site is owner-only becomes the bootstrap admin. Every later new user starts as student and can complete student or company onboarding; no user can self-select admin.
- Sign-in, callback, sign-out, and e-mail verification are dispatch-owned routes. StructLab does not store passwords or verification codes.

## File access

- File bytes are stored in R2; ownership and searchable metadata are stored in D1.
- File kind, MIME type, maximum size, owner, company, and access scope are validated server-side.
- Students can read their own files. Company members can read their company's files and resumes attached to applications for their jobs. Admins can inspect platform files.
- Cross-site write requests are rejected and all API responses containing private data use `Cache-Control: no-store`.
