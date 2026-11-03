# SwachhLens

**Snap it. Report it. Clean it.**

SwachhLens is a web app for reporting and cleaning up litter in your area. A citizen takes a photo of waste, the app uses AI to identify it, and volunteers pick it up. Every clean-up is verified with a before-and-after photo, and people earn points for helping.

## Features

- **Report waste with a photo.** Gemini AI detects the waste type (plastic, paper, glass, metal, organic, e-waste, textile, construction, mixed), estimates the weight and flags hazardous waste.
- **Location on a map.** Use the phone's GPS or drop a pin on an OpenStreetMap map. The address is filled in automatically.
- **Collect.** Volunteers see open spots on a map, claim one, and get directions.
- **AI-verified clean-ups.** The collector uploads an "after" photo from the same spot. The AI compares it with the original and confirms the waste is gone. The collector also has to be near the spot.
- **Points and leaderboard.** 10 points per report, and 20+ points per verified clean-up depending on the weight.
- **Admin dashboard.** Totals, a 7-day chart, waste-type breakdown, a hotspot map of the busiest areas, average time to clean, and options to reject or delete reports.
- **Feedback survey.** A built-in questionnaire using the System Usability Scale (SUS) plus four questions about the app, with age group, occupation and previous reporting method.
- **AI accuracy checker.** Admins confirm the real waste type in each photo. The app calculates accuracy, a confusion matrix, per-class precision, recall and F1, and an exact binomial test against an 80% target.
- **Survey results.** Mean SUS score, grade, Likert charts and one-sample t-tests for each hypothesis.
- **CSV export.** Download all reports and survey responses for analysis in Excel or SPSS.
- **Works even when the AI is down.** If Gemini is busy, reporters enter the waste type and weight themselves, and clean-ups go to the admin for approval. Manual reports are kept out of the AI accuracy figures.
- **Fair-play rules.** You can't collect your own report, the same photo can't be used twice, and there are daily report limits. Claims expire after 24 hours.

## Tech stack

| Part | Technology |
| --- | --- |
| Frontend and backend | Next.js 14 (App Router, Server Actions), React, TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL on Neon |
| AI | Google Gemini (image understanding) |
| Maps | Leaflet + OpenStreetMap, Nominatim for addresses |
| Auth | Email + password (bcrypt), signed JWT session cookie |
| Hosting | Vercel |

## Project structure

```
src/
  app/
    actions/        server actions (auth, reports, collect, admin)
    api/photo/      serves report photos
    api/export/     CSV downloads for admins
    admin/ collect/ feedback/ leaderboard/ login/ profile/ register/ report/ reports/[id]/
  components/       UI components (map, forms, charts)
  lib/              database, session, Gemini, geo, query, survey and statistics helpers
```

The database tables are created automatically the first time the app connects.

### Database tables

- `users`: name, email, password hash
- `reports`: photo, AI result, location, status (`pending` → `claimed` → `review` (only when AI is unavailable) → `collected` / `rejected`), `ai_checked` flag, collector, after photo
- `points_ledger`: every point earned or lost, with the reason
- `feedback`: one survey response per user (SUS items s1–s10, SUS score, four Likert items, demographics)

## Environment variables

Copy `.env.example` to `.env` (for local use), or add these in Vercel → Project → Settings → Environment Variables.

| Name | What it is |
| --- | --- |
| `DATABASE_URL` | Neon connection string |
| `GEMINI_API_KEY` | API key from Google AI Studio |
| `GEMINI_MODEL` | Optional, defaults to `gemini-3.8-flash` |
| `SESSION_SECRET` | Random string, 32+ characters |
| `ADMIN_EMAILS` | Emails that can open `/admin` (comma separated) |
| `COLLECT_MAX_DISTANCE_M` | Max distance in metres between collector and spot, `0` to disable |

## Running locally

Requires Node.js 18.18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploying on Vercel

1. Push this folder to a GitHub repository.
2. On vercel.com, click **Add New → Project** and import the repository.
3. Add the environment variables listed above.
4. Click **Deploy**.
