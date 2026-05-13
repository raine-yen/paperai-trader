# Setup guide — 10 minutes

You'll set up:
1. A free Supabase project (database + auth)
2. The app running locally
3. The app deployed to Vercel

No credit card needed for any step.

---

## Step 1 — Create a Supabase project (3 minutes)

1. Go to https://supabase.com and sign up (free)
2. Click **New Project**
3. Pick a name (e.g. `paper-trader`), generate a strong password, choose your region. Click **Create**.
4. Wait ~1 minute while it provisions.

### 1a. Apply the schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open [`supabase/schema.sql`](./supabase/schema.sql) in this repo, copy the whole file, paste it in.
4. Click **Run** (bottom right). You should see "Success. No rows returned."

### 1b. Disable email confirmation (so signup is instant for testing)

1. Go to **Authentication → Sign In / Up** in the sidebar
2. Under **Email**, toggle **Confirm email** to **OFF**
3. Save

> For your real club, you'll probably want this back on to verify school emails.

### 1c. Copy your keys

1. Go to **Project Settings → API**
2. You need three values:
   - **Project URL** (looks like `https://xyzabc.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
   - **service_role** key (also `eyJ...`, **keep secret**)

---

## Step 2 — Run locally (2 minutes)

```bash
# In the paper-trader/ folder
npm install
cp .env.local.example .env.local
```

Open `.env.local` and fill in the three Supabase values you copied:

```
NEXT_PUBLIC_SUPABASE_URL=https://xyzabc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   (anon public)
SUPABASE_SERVICE_ROLE_KEY=eyJ...        (service_role)
CRON_SECRET=anything-long-and-random
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then start the dev server:

```bash
npm run dev
```

Open **http://localhost:3000**. Sign up. You should land on the dashboard.

### Test it works

1. Go to **API Keys → Generate**. Save the secret.
2. Go to **Trade**. Buy 5 shares of AAPL. The order should fill instantly.
3. Back on **Dashboard** you should see the position.
4. **Leaderboard** should show you ranked.

### Manually trigger the tick (optional)

Visit `http://localhost:3000/api/cron/tick` in your browser. You should see
JSON like `{"ok":true,"filled":0,"symbolsRefreshed":1,"accountsUpdated":1}`.

This is what Vercel Cron will call automatically every minute in production.

---

## Step 3 — Deploy to Vercel (5 minutes)

### 3a. Push to GitHub

```bash
cd paper-trader
git init
git add .
git commit -m "initial paper trader"
gh repo create paper-trader --public --source=. --push
```

(Or create the repo manually at github.com and push.)

### 3b. Import to Vercel

1. Go to https://vercel.com and sign up with your GitHub
2. Click **Add New → Project**
3. Import your `paper-trader` repo
4. **Don't deploy yet** — click **Environment Variables** and add all five vars from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_APP_URL` (set to `https://YOUR-PROJECT.vercel.app` — you can update after)
5. Click **Deploy**

Wait ~2 minutes. Then click the deploy URL.

### 3c. Enable Cron

Vercel reads `vercel.json` and sets up the cron jobs automatically. Verify under
**Settings → Cron Jobs** that `/api/cron/tick` is running every minute.

---

## Step 4 — Share with your club

Send members to `https://YOUR-PROJECT.vercel.app`. They:
1. Sign up
2. Go to **API Keys**, generate a key, save the secret
3. Go to **Docs** for copy-paste Python code
4. Plug their keys into a bot, run it
5. Watch themselves climb the leaderboard

---

## Troubleshooting

- **"unauthorized" on /api/cron/tick** — make sure `CRON_SECRET` matches between Vercel env vars and what Vercel Cron sends. You can leave `CRON_SECRET` unset locally to allow unauthenticated dev calls.
- **Orders not filling** — Yahoo Finance may rate-limit. Check `/api/cron/tick` returns `symbolsRefreshed > 0`.
- **"unknown or untradable symbol"** — Yahoo couldn't find that ticker. Try a common one like `AAPL`.
- **Stale equity values on leaderboard** — equity updates each tick. Wait 1 minute or hit `/api/cron/tick` manually.

## Updating the schema later

If you change `supabase/schema.sql`, paste the changed section back into Supabase's SQL Editor and run it. The schema uses `if not exists` and `drop policy if exists` everywhere, so it's safe to re-run.
