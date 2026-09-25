# Pundit Bible Studio: setting up your own app

About 30–40 minutes, once. It's easiest on a computer; after that, everything is on your phone.

You'll create three free accounts:
- **Supabase**: your posts, photos and login.
- **GitHub**: hosts the app and runs the news checks.
- **Anthropic**: your Claude API key, which you pay for as you use it.

---

## Step 1: Supabase (database and login)

1. Go to **supabase.com** → Start your project → sign up.
2. **New project**. Name it `pundit-bible`, set a database password (save it somewhere), region **London (eu-west-2)**, Free plan. Wait about 2 minutes for it to build.
3. Copy your **project ref**. It's the code in the web address, e.g. `supabase.com/dashboard/project/abcdefghijklmnop` → `abcdefghijklmnop`.
4. Click your avatar (top right) → **Account preferences** → **Access Tokens** → **Generate new token**. Name it `github`, then copy the token (it starts `sbp_`).

## Step 2: Anthropic (Claude API key)

1. Go to **console.anthropic.com** → sign up.
2. Go to **Billing** → add a card and buy some credit (£10 is plenty to start).
3. Under **Limits**, set a **monthly spend limit of $14** (about £10). The app has its own £10 cap too, so this is just a backstop.
4. Go to **API keys** → **Create key** → name it `pundit-bible` → copy it (it starts `sk-ant-`).

## Step 3: GitHub (hosting and news checks)

1. Go to **github.com** → sign up.
2. Click **+** (top right) → **New repository**. Name it `pundit-bible-studio`, choose **Public** (needed for free hosting; your posts stay private behind your login), then **Create repository**.
3. On the new repository page, click **uploading an existing file**. Unzip `pundit-bible-studio.zip` on your computer, open the folder, select **everything inside it**, and drag it onto the page. Click **Commit changes**.
   - **Mac:** the `.github` folder is hidden. Press **Cmd + Shift + .** in Finder to show it before selecting everything.
   - Check afterwards that you can see a `.github` folder in the repository. Without it, nothing runs.
   - An "Actions" run may start and fail straight away. That's expected; it has no keys yet.

## Step 4: Put your keys into GitHub

In your repository: **Settings** → **Secrets and variables** → **Actions**.

On the **Secrets** tab, click **New repository secret** for each of these:

| Name | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | the `sbp_…` token from step 1 |
| `ANTHROPIC_API_KEY` | the `sk-ant-…` key from step 2 |
| `OWNER_EMAIL` | the email you'll sign in to the app with |
| `OWNER_PASSWORD` | the password you'll sign in with (12+ characters) |

On the **Variables** tab, click **New repository variable**:

| Name | Value |
|---|---|
| `SUPABASE_PROJECT_REF` | your project ref from step 1 |

## Step 5: Switch on hosting and run set-up

1. **Settings** → **Pages** → under *Build and deployment*, set **Source** to **GitHub Actions**.
2. Go to the **Actions** tab. If asked, click **I understand my workflows, go ahead and enable them**.
3. Click **1. Set up (run once)** → **Run workflow** → **Run workflow**. Wait for the green tick (about 1 minute). This:
   - creates your database and photo storage
   - creates your login and switches off public sign-ups
   - gives the app your Claude key
   - brings across the 13 posts, 15 fixtures and 5 breaking stories from the Claude version
4. Click **2. Deploy app** → **Run workflow**. Wait for the green tick (2–3 minutes). Click the run, and the link to your app is shown under *deploy*. It looks like `https://YOURNAME.github.io/pundit-bible-studio/`.

## Step 6: Put it on your iPhone

1. Open the link in **Safari**.
2. Sign in with the email and password from step 4.
3. Tap **Share** → **Add to Home Screen** → **Add**.

It now opens full-screen from your home screen with the Pundit Bible icon, like any other app. When you save an image or video, the share sheet opens: tap **Save Image** or **Save Video** and it goes straight into your Photos.

**Turn on phone alerts:** in the app, open **Settings** → **Turn on alerts on this device** → Allow. Then tap **Send a test**. On iPhone this only works when you open the Studio from the home screen icon, not from Safari.

## Step 7 (optional but recommended): the "Scan now" button

This lets the **Scan now** button (Breaking news) and **Research new posts now** (Posts) start a check instantly instead of waiting for the schedule.

1. On GitHub, open your avatar → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name it `scan-now`, set expiry to **1 year**, choose **Only select repositories** → `pundit-bible-studio`.
3. Under **Permissions** → **Repository permissions** → **Actions**, choose **Read and write**. Click **Generate token** and copy it.
4. Back in your repository → Settings → Secrets → **New repository secret**: name `SCAN_TOKEN`, value = that token.
5. **Actions** → **1. Set up (run once)** → **Run workflow** again. It's safe to re-run and won't duplicate anything.

---

## Step 8: Live football data and Higgsfield

### Live football data (scores, fixtures, tables, goal alerts)
1. Go to **football-data.org** → **Register** → your API token arrives by email.
2. GitHub → Settings → Secrets → **New repository secret**: name `FOOTBALL_DATA_KEY`, value = the token.
3. Actions → **1. Set up** → Run workflow.

Within a few minutes, **Match Centre** and **Tables & fixtures** fill up by themselves.
- **The free plan** covers the Premier League, Championship, Champions League, World Cup and Euros, but its scores are **delayed**.
- **For real-time scores and instant goal alerts,** upgrade to **"Free w/ Livescores" (€12 a month)** on football-data.org. The same token keeps working; nothing changes in the app.
- **Scorer names aren't included** on either plan, so the GOAL card asks you to type the scorer. The score and minute are filled in for you.

### Higgsfield (Kling videos and AI backgrounds)
1. Go to **open.higgsfield.ai** → sign up → **Billing** → add at least $5. This is separate from any Higgsfield subscription credits.
2. **API keys** → **Create key**. It shows a **Key ID** and a **Key secret**, and the secret is shown only once.
3. GitHub → Settings → Secrets → **New repository secret**: name `HIGGSFIELD_KEY`, value = `KEYID:KEYSECRET` (the two joined with a colon, no spaces).
4. Actions → **1. Set up** → Run workflow.

After that, each post gets a **Make video with Higgsfield** button (in step 5) and an **AI background** option (under Generate).
- **Cost:** about 15p for a 5-second video, 30p for 10 seconds, and under 1p for a background. You're not charged when Higgsfield blocks a video.
- **Monthly cap:** £5 by default. To change it, add a Variable `HF_BUDGET_GBP` (e.g. `10`), then re-run **1. Set up** and **2. Deploy app**.
- **AI label:** when you post a Higgsfield video, switch on the platform's "AI-generated" label (TikTok, Instagram and YouTube all ask for it).

## Step 9: OpusClip (your clips, ranked and planned)

You need an OpusClip plan with the API (Pro, Max or Business). Do the one-off `setup.yml` change at the start of step 10 first.

1. On **clip.opus.pro**, open your dashboard. In the bottom-left corner, open the **API key** option, create a key and copy it.
2. Still on OpusClip, open **Social accounts** and connect Facebook, Instagram, TikTok and YouTube. The Studio posts through these connections.
3. GitHub → Settings → Secrets → **New repository secret**: name `OPUSCLIP_KEY`, value = the key.
4. Actions → **1. Set up** → Run workflow, then **2. Deploy app** → Run workflow.

In the app, open **Clips**:
- **Paste a YouTube link** and tap **Make clips**. OpusClip cuts it, as it does on the website, using the same credits (about 1 per minute of video; the API needs at least 10 per video).
- When the clips are done (usually 10–30 minutes) you get an alert. By then Claude has read what’s said in each one and scored every clip out of 100 for likely views. Each clip also gets a title and captions for Facebook, Instagram, TikTok and YouTube (with the right hashtags for each).
- The best clips go into the **posting plan**: 3 a day by default (12:00, 17:30, 20:30), with the strongest one each day in the evening slot. Clips tied to a big game go the day before it. The rest wait in reserve.
- **Schedule the next 3 days** sends them to OpusClip, which posts each one at its time. Or open any clip to edit its captions, move it, post it now, or save the video to your phone.
- Made clips on the OpusClip website? Paste the project link under **Bring them in**.
- The plan settings (times, days ahead, which accounts, brand template) are at the bottom of the Clips page.

**Costs:** ranking a video's clips costs about 3–5p of Claude. OpusClip may charge 1 credit per post it publishes for you.

## Step 10: Earnings (YouTube and Facebook, in pounds)

First, a one-off change on GitHub so new keys never need the workflow file edited again. Open `.github/workflows/setup.yml`, click the pencil, replace everything with the contents of `setup.yml.txt` (in the zip), then **Commit changes**.

You'll need your Supabase project ref (step 1) for this web address, used twice below:
`https://YOURREF.supabase.co/functions/v1/earnings`

### YouTube (Google Cloud, free)
1. Go to **console.cloud.google.com**, sign in with the Google account that owns the channel, and create a project called `Pundit Bible Studio`.
2. **APIs & Services → Library**: search for and **Enable** both **YouTube Analytics API** and **YouTube Data API v3**.
3. **Google Auth Platform → Get started**. App name `Pundit Bible Studio`, your email as support email, Audience **External**, your email as contact → **Create**.
4. **Audience → Publish app → Confirm** (status "In production"). Don't skip this: in "Testing", Google disconnects you every 7 days.
5. **Clients → Create client** → type **Web application** → under *Authorised redirect URIs* click **Add URI** and paste the web address above → **Create**. Copy the **Client ID** and **Client secret**.
6. GitHub → Settings → Secrets → add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Facebook (Meta for Developers, free)
1. Go to **developers.facebook.com** → **My Apps → Create app**. Name it `Pundit Bible Studio`. For the use case choose **Manage everything on your Page**, then finish creating it.
2. In the app: **Use cases → Manage everything on your Page → Customise**. Make sure **pages_show_list**, **pages_read_engagement** and **read_insights** are added.
3. **Facebook Login → Settings** (under Use cases or Products): paste the web address above into **Valid OAuth Redirect URIs** → **Save changes**.
4. **App settings → Basic**: copy the **App ID** and **App secret** (click Show).
5. GitHub → Settings → Secrets → add `META_APP_ID` and `META_APP_SECRET`.

Leave the app in **Development** mode. You're its admin, so it can read your own page without Meta's review.

### Switch it on
1. Actions → **1. Set up** → Run workflow, then **2. Deploy app** → Run workflow.
2. In the Studio, open **Earnings** → **Connect YouTube**. Choose the account that owns the channel; if it's a Brand Account, pick the channel. Google shows "Google hasn't verified this app": tap **Advanced → Go to Pundit Bible Studio**, then allow access. (It's your own app, so this is expected.)
3. **Connect Facebook**. When asked, tick the **Pundit Bible** page and allow access.

The last 90 days load straight away. After that the figures refresh by themselves at about 7am, 1pm and 7pm.
- **YouTube** is YouTube's estimated revenue, already in pounds. It runs 2–3 days behind, like YouTube Studio.
- **Facebook** is your Content Monetization earnings in US dollars, converted to pounds at each day's exchange rate (European Central Bank rates; weekends use Friday's). Meta sometimes adjusts recent days, and the Studio picks up those changes.

## When things run

| What | When (UK) |
|---|---|
| Morning news posts (6 new posts; fixtures refreshed on Mondays) | about 7am (6am after the clocks go back on 25 Oct) |
| Breaking news scan | every hour, about 7:15am to 11:15pm |
| Anything, right now | Scan now / Research new posts now, or Actions → pick the job → Run workflow |

GitHub can start scheduled jobs up to 15–20 minutes late at busy times. Use **Scan now** when speed matters.

## What it costs: capped at £10 a month

Supabase, GitHub hosting and the news-check runs are free. The only cost is Claude, and it's kept low like this:
- News comes from the **free BBC, Sky Sports, Guardian and ESPN feeds**, so there's no paid web searching (except one small fixtures search a week).
- The hourly scan **costs nothing when nothing new has broken**. When something has, a cheap Claude model decides whether it's big; only big stories get a post written.
- The better Claude model is used only for writing your 6 morning posts and for the app's buttons.

| | Roughly |
|---|---|
| Breaking news scans (hourly) | £3 a month |
| Morning posts | £2.50 a month |
| Weekly fixtures search | 30p a month |
| App buttons (hooks, captions, scripts, photo framing) | under 1p each, about £1 a month |
| **Expected total (Claude)** | **about £6–8 a month** |
| Live football data | £0 free (delayed) or about £10 a month (€12) for real-time scores |
| Higgsfield videos | only what you make, capped at £5 a month unless you change it |

**The £10 cap:** the app records every Claude call. At **£8.50** the automatic news checks pause, so the buttons keep working. At **£10** everything stops until the 1st of the month. You can see the running total at the top of the **Insights** tab.

To change the cap, go to Settings → Secrets and variables → Actions → Variables → add `MONTHLY_BUDGET_GBP` (e.g. `15`), then re-run **1. Set up** and **2. Deploy app**.

## If something goes wrong

- **A workflow has a red cross.** Click it, then the failed step. The message says which key is missing or wrong.
- **The app says "Almost there".** Run **2. Deploy app** again.
- **The Claude buttons say the key hasn't been added.** Check the `ANTHROPIC_API_KEY` secret, then re-run **1. Set up**.
- **Change your password.** Supabase → Authentication → Users → your email → "Send password recovery", or delete the user and re-run set-up with new `OWNER_…` secrets.
- **Supabase says the project is paused.** Free projects pause after a week with no use. The daily news checks keep it awake; if it does pause, press **Restore** in the Supabase dashboard.

Photos you'd already added in the Claude version stay there (Claude doesn't let apps export them), apart from Cantona's cut-out, which is included. For the other posts, add the photo again.
