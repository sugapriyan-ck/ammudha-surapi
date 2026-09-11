# Ammudha Surapi 🌾

**Good food shouldn't go to waste.**

A hyper-local food rescue platform connecting food businesses with surplus edible food
to nearby community organizations (NGOs, shelters, community kitchens, food banks) that
rescue and redistribute it to people in need.

Tracks the full lifecycle of a rescue: **Listed → Claimed → Picked Up → Distribution Completed**,
with urgency-based matching, public rescue transparency, self-reported distribution proof,
and shareable impact cards.

## Tech Stack

| Layer         | Technology                    |
| ------------- | ----------------------------- |
| Frontend      | Next.js (App Router) + React  |
| Styling       | Tailwind CSS v4               |
| Database      | Supabase (Postgres)           |
| Auth          | Supabase Auth                 |
| File Storage  | Supabase Storage              |
| Realtime      | Supabase Realtime             |
| Deployment    | Vercel (recommended)          |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql). This creates all tables, Row Level
   Security policies, the `distribution-proofs` storage bucket, and the distance helper.
3. If your account email confirmation is on (default), users must confirm their email
   before logging in. You can disable it under
   **Authentication → Sign In / Up → Email → Confirm email**.
4. **Google sign-in (optional):** Under **Authentication → Providers**, enable **Google**
   and add your Google OAuth Client ID and Client Secret (create them in the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)).
   Set the callback URL shown there to:
   `https://<your-domain>/auth/callback`.
5. **Password reset emails (optional):** Under
   **Authentication → Email Templates → Reset Password**, set the site URL so the
   recovery link routes to `/reset-password`.

### 3. Configure environment variables

Rename `.env.example` to `.env.local` and fill in your project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Find both under **Project Settings → API**.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key Features

- **Two roles**: Food Donor and Food Rescuer, with role-based dashboards and navigation.
- **Email + Google auth**: Email/password signup & login, Google sign-in, email-confirmation
  handling, password reset flow, and post-OAuth onboarding for role selection.
- **Global route protection**: A Supabase-aware `proxy.ts` refreshes sessions and guards
  all protected routes (donor, rescuer, impact, notifications, profile).
- **Fast listing**: Donors publish surplus food with category, quantity, dietary type,
  pickup deadline, and location in under 60 seconds.
- **Rescue Score**: Deterministic 0–100 ranking per listing — urgency (40%), distance (30%),
  quantity compatibility (15%), food-type match (15%) — with human-readable match reasons.
- **Urgency tiers**: 🟢 Low / 🟡 At Risk / 🔴 Critical with live countdowns.
- **Hyper-local matching**: Geolocation-based distance display and near-real-time discovery.
- **Full lifecycle tracking**: Timeline per rescue with status transitions.
- **Public transparency**: "Rescued by [Organization Name]" — personal contact info never shown.
- **Distribution proof**: Photo upload (Supabase Storage), people served, location, and note.
  Labeled **"submitted"**, *not* "verified" (per honesty-in-labeling requirement).
- **Impact dashboards**: Global, donor-level, and rescuer-level metrics.
- **Rescue Card**: Downloadable/shareable image via the native Web Share API.
- **In-app notifications**: Claim/pickup/completion events with a realtime unread bell.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                # Landing page (hero, live stats, how-it-works)
│   ├── signup/ · login/        # Auth with role selection + Google OAuth
│   ├── forgot-password/        # Request a password reset link
│   ├── reset-password/         # Set a new password from the recovery link
│   ├── onboarding/             # Pick role + profile after Google sign-in
│   ├── auth/callback/          # OAuth code exchange + profile creation
│   ├── donor/
│   │   ├── dashboard/          # Donor dashboard + impact summary
│   │   └── listings/           # Create listing & My Listings (timeline)
│   ├── rescuer/
│   │   ├── dashboard/          # Discovery feed sorted by Rescue Score
│   │   ├── my-rescues/         # Rescuer's claims history
│   │   └── rescue/[id]/        # Rescue detail + proof submission + Rescue Card
│   ├── impact/                 # Global impact dashboard
│   ├── notifications/          # In-app notifications
│   └── profile/                # Organization profile & location
├── components/                 # Nav, cards, timeline, proof form, rescue card, UI kit
├── proxy.ts                    # Route protection + session refresh (Next.js 16 proxy)
└── lib/
    ├── actions.ts              # Server actions (auth, listings, claims, proofs)
    ├── data.ts                 # Server data fetchers
    ├── rescue-score.ts         # Deterministic scoring + urgency + distance helpers
    ├── supabase/               # Browser & server Supabase clients
    └── types.ts                # Shared TypeScript types
```

## Rescue Score Formula

```
Score = urgency × 0.4 + distance × 0.3 + quantity-fit × 0.15 + food-type-fit × 0.15
```

Thresholds (e.g., 30 min = Critical) and weights are configurable constants in
`src/lib/rescue-score.ts`.

## Notes

- Distribution proof is **self-reported**. The UI consistently labels it "submitted" to avoid
  implying verification. Verification (donor confirmation, geolocation metadata, timestamps,
  trusted-org status) is a Phase 2 concern.
- Realtime requires Supabase Realtime to be enabled on the relevant tables, which the schema
  does by default for `food_listings` and `notifications`.