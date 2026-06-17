# Secondhand IG Seller

Mobile-first web app for a Vietnamese secondhand seller who lists items on Shopee, closes customers through Instagram DM, and sends manual VietQR payment links.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

If Supabase variables are empty, the app still works in local MVP mode and saves data in the current browser.

## Build For Vercel

```bash
npm run build
```

Vercel settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

## Push Code To GitHub

```bash
git init
git add .
git commit -m "Initial secondhand seller app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

If this repository already has a remote, use:

```bash
git remote -v
git add .
git commit -m "Prepare Vercel and Supabase deploy"
git push
```

## Deploy To Vercel

1. Open [Vercel](https://vercel.com/).
2. Create or log in to a free account.
3. Choose **Add New Project**.
4. Import the GitHub repository.
5. Confirm:
   - Build command: `npm run build`
   - Output directory: `dist`
6. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Deploy.

To redeploy, push a new commit to GitHub. Vercel will build again automatically. You can also open the project in Vercel and click **Redeploy**.

## Supabase Setup

1. Open [Supabase](https://supabase.com/).
2. Create a free project.
3. Open **SQL Editor**.
4. Copy the contents of `supabase_schema.sql`.
5. Run the SQL.
6. Open **Project Settings** → **API**.
7. Copy:
   - Project URL
   - `anon public` key
8. Add them locally in `.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

9. Restart the local dev server.
10. Add the same variables in Vercel under **Project Settings** → **Environment Variables**.
11. Redeploy the Vercel project.

When Supabase is configured, the app stores a JSON snapshot in the `seller_app_state` table using row `id = main`. If Supabase is not configured or is unreachable, the app continues using browser LocalStorage.

## Backup Before Migration

Open **Cài đặt** in the app:

- Use **Export JSON** to download a backup.
- Use **Import JSON** to restore a backup into the current browser.

This is useful before switching devices, clearing browser data, or connecting Supabase.

## Free Setup Limitations

- The current Supabase setup is a simple personal MVP snapshot table.
- The anon key is public in frontend apps. The included policies allow read/write access for the app, so do not store bank passwords, OTPs, PINs, or private banking session data.
- VietQR remains manual. There is no payment webhook and no automatic bank confirmation.
- The lock screen is client-side only and is not production authentication.
- Free Vercel and Supabase plans have usage limits.
