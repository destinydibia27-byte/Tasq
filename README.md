# Teamer

**Your remote team's digital office.**

Teamer is a role-aware team workspace that adapts to how different people on your team actually work. Designers get file drop zones. Developers get GitHub link fields. Researchers get document uploaders. Everyone gets a clear view of what's assigned, in progress, and needs review.

Think Linear — but built for the whole team, not just devs.

---

## What makes Teamer different

Every task tool treats everyone the same. Teamer doesn't.

When you assign a task, the submission interface changes based on the assignee's skill type:

| Role | Submission type |
|------|----------------|
| Developer | GitHub / PR link |
| Designer | File upload (Figma, PNG, PDF) |
| Researcher | Document upload (PDF, DOCX) |
| Marketer | Link or file |
| Writer | Article link or document |
| Product Manager | PRD / spec link or doc |
| Data Analyst | Dashboard link or report |

---

## Features

- Google OAuth — one-click sign in, no passwords
- Workspaces — create multiple orgs, switch between them
- Role profiles — each member sets their skill type
- Role-aware task submission — submission UI adapts to assignee skill
- Task lifecycle — Assigned → In Progress → Submitted → Approved (with rejection + feedback)
- Kanban board — four-column view with status + member filters
- File uploads — stored in Supabase Storage, tracked per task
- Task comments — threaded discussion per task
- Announcements — admin posts team-wide updates, can pin them
- Team directory — members, skills, roles, invite status
- Email invites — invite by email; non-users get onboarding link
- Invite acceptance — token-based accept page (like GitHub org invites)
- Admin roles — owners can share admin access so others can create tasks
- Realtime updates — tasks and notifications update live
- Notification bell — in-app with unread count
- Dark / light mode — system preference + manual toggle, persisted
- Mobile responsive — works on phone and laptop

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 + CSS variables |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL + RLS) |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Routing | React Router v6 |
| Icons | lucide-react |
| Dates | date-fns |
| Toasts | react-hot-toast |

---

## Project structure

```
src/
├── context/
│   ├── AuthContext.jsx       # Auth state, profile
│   ├── OrgContext.jsx        # Workspace + members
│   └── ThemeContext.jsx      # Dark/light mode
├── lib/
│   ├── supabase.js           # Client
│   └── utils.js              # Skills, status configs, helpers
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx
│   │   └── Sidebar.jsx
│   ├── ui/
│   │   ├── Avatar.jsx
│   │   ├── Modal.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── EmptyState.jsx
│   │   └── NotificationBell.jsx
│   ├── tasks/
│   │   ├── TaskCard.jsx
│   │   ├── TaskDetailModal.jsx
│   │   └── CreateTaskModal.jsx
│   └── org/
│       └── CreateOrgModal.jsx
└── pages/
    ├── LandingPage.jsx
    ├── DashboardPage.jsx
    ├── TasksPage.jsx
    ├── TeamPage.jsx
    ├── AnnouncementsPage.jsx
    ├── ProfilePage.jsx
    ├── SettingsPage.jsx
    ├── AuthCallbackPage.jsx
    └── InvitePage.jsx
```

---

## Setup

### 1. Supabase project

1. Create a project at supabase.com
2. Run `supabase_schema.sql` in the SQL editor
3. Enable Google OAuth: Authentication → Providers → Google
4. Add redirect URLs under Authentication → URL Configuration:
   - Local: `http://localhost:5173/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

### 2. Storage buckets

Create two buckets in Supabase Storage:
- `task-attachments` (private)
- `avatars` (public)

### 3. Environment variables

```bash
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# Both are in your Supabase project → Settings → API
```

### 4. Run

```bash
npm install
npm run dev
```

---

## Email invites (production)

The invite stores a token in the DB. To send actual emails, deploy a Supabase Edge Function using Resend (resend.com, free tier: 3k/month):

```typescript
// supabase/functions/send-invite/index.ts
import { Resend } from 'npm:resend'
const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

Deno.serve(async (req) => {
  const { email, token, orgName, inviterName } = await req.json()
  await resend.emails.send({
    from: 'Teamer <noreply@yourdomain.com>',
    to: email,
    subject: `${inviterName} invited you to ${orgName} on Teamer`,
    html: `<p>You've been invited to join <strong>${orgName}</strong>.</p>
           <a href="https://yourdomain.com/invite?token=${token}">Accept invitation</a>`
  })
  return new Response(JSON.stringify({ ok: true }))
})
```

Then uncomment the `supabase.functions.invoke` line in `src/context/OrgContext.jsx`.

---

## Deploy to Vercel

```bash
npm i -g vercel && vercel
```

Add env vars in Vercel project settings. Add `vercel.json` for SPA routing:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

---

## Roadmap

- Weekly digest email (Monday: here's your tasks)
- Time tracking per task
- Recurring weekly task templates
- React Native mobile apps
- AI workload balancing (auto-suggest assignees)
- Slack / Discord notification webhooks
- Export team activity report (PDF)
