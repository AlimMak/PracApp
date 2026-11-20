# Interview Practice

Mobile-first, untimed interview practice for new-grad software engineers. The API lesson opens at `/` and links to offline chat at `/offline-chat` and the behavioral lesson at `/star`.

Select **Start practice** to get one CS topic, one visual design, and one behavioral prompt. **Leave session** returns to the catalog at `/practice`. **Resume practice** reopens the same question and draft. Mark an item **Still practicing** to prioritize it in a future session.

## Run locally

Use Node.js 22.18 or newer (Node 24 LTS recommended).

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The development server binds to all interfaces. On a phone connected to the same trusted Wi-Fi, open `http://YOUR_COMPUTERS_LAN_IP:3000`. Your operating system may ask you to allow the server on your private network. Do not use `localhost` on the phone; that refers to the phone itself.

To check a production build:

```sh
npm run build
npm start
```

There is no public deployment yet. Publishing is milestone 7.

## Optional practice accounts

Guest practice works with the Supabase variables unset. To enable accounts:

1. Create or choose a Supabase project. Apply the versioned migration in `supabase/migrations` via the linked Supabase CLI (`npx supabase link --project-ref <project-ref>`, then `npx supabase db push`).
2. Enable email and password sign-in in Supabase Auth. Set the site URL for this app and allow its `/account` URL as an email confirmation redirect. For local development this is commonly `http://localhost:3000/account`.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the project URL and browser publishable key. Keep any service role or secret key out of browser config. Restart the dev server or rebuild for deployment.
4. Open **Practice account** at `/account`. Create or sign in to an account, then choose **Import guest practice** if you want to bring over this browser's progress. Use **Resume last activity** on a second browser after the first shows **Practice synced**.

For a local Supabase stack, start Docker and run `npx supabase start` from the repo, then use the local API URL and publishable key it reports. The checked-in local config permits disposable email sign-ups without confirmation. Hosted email delivery, the redirect URL, and provider settings belong to the Supabase project.

An import keeps the browser's guest copy and merges into the account using stable story and session identifiers. The same snapshot can be imported again safely. When both devices edit the same story or draft, review both versions and choose which to keep. Unrelated stories are preserved. Story deletion syncs from **My stories**. Sign-out shows the guest workspace again. Signed-in practice lives in memory while waiting to sync, so keep the tab open if there are unsynced changes.

To try offline chat, open `/offline-chat`, tap **Send**, then **Make Leo offline**. Select **Message store**, tap **Server attachment point**, and press **Run example**. Once the message is saved, tap **Reconnect Leo** to see it arrive. Try **Live relay** on a retry to see where delivery stops, or choose **Watch and explain instead** for a guided run.

To try STAR, open `/star`, explore the four parts of the fictional example, then select **Build my story**. Save a story and select **Practice this story** to answer an interview question with optional cues. Select **I rehearsed aloud** to continue without recording. To try dictation, use a browser that offers **Start dictation**, then stop and add the transcript to your answer before editing it.

## Checks

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
npm run test:accounts
```

Browser checks run against the production server in desktop Chromium, mobile Chromium, and mobile WebKit. They cover the API and chat simulations, STAR editing and rehearsal, draft recovery, blocked storage, and narrow layouts. Dictation tests simulate permission denial and transcript events so they run without real audio. On Linux CI, install browser system dependencies with `npx playwright install --with-deps chromium webkit`.

The account browser suite intercepts Supabase Auth and Data API calls with disposable identities. It covers repeat import, account data preservation, cross-browser resume, shared-browser sign-out and user switching, story deletion, and retry after a failed write. The unit suite runs the real migration in local PostgreSQL via PGlite and checks row-level access and revision conflicts using simulated Supabase identity claims. Hosted email confirmation and hosted end-to-end sync require a configured provider.

## Architecture and privacy

- Next.js App Router, TypeScript, React, and plain responsive CSS. The activities run in the browser.
- `src/components/api-lesson.tsx` owns the lesson UI and weather playback. The diagram uses HTML, CSS and inline SVG, with a vertical layout on narrow phones.
- `src/lib/lesson.ts` defines progress, validates restored state, preserves two practice attempts, and contains the fixed sample weather data and authored captions.
- `src/lib/curriculum.ts` contains authored quick checks, examples, transfer questions, follow-ups, and rubrics. HTML and cache activities also have interactive labs.
- `src/lib/practice-plan.ts` selects the next item in each track and stores learner ratings and the session position under `interview-practice:plan:v1`. Session drafts have their own keys, so direct study does not overwrite an in-progress session.
- `src/lib/chat-design.ts` simulates sending, retention, and reconnecting for both chat paths. Chat progress and answers use the separate browser key `interview-practice:offline-chat:v1`. The activity sends no real messages.
- `src/lib/star.ts` validates and restores stories, drafts, and rehearsal attempts from `interview-practice:star:v1`. Learners can delete a story and its rehearsals from **My stories**.
- `src/components/answer-input.tsx` uses browser speech recognition when available. The app starts it on request, keeps the transcript in a preview until the learner adds it, and saves only answer text. The browser may send microphone audio to its speech provider. Typing and unrecorded rehearsal remain available if transcription is blocked or unsupported.
- Local storage key: `interview-practice:api:v1`. Drafts, step, playback position, attempt text, and self-review checks stay in this browser. Refresh resumes paused. Accounts and cross-device sync arrive later.
- Guest data stays in browser storage. Signed-in drafts and stories sync to the user's private Supabase row. No private account drafts are persisted as guest data or cached as browser practice data. Clearing browser storage removes the guest copy.
- The weather endpoint is illustrative. `GET /weather?city=Austin&units=F` always demonstrates a sample `200 OK` response with 78 °F and Sunny. No real request or location permission is used.
- Feedback is **self-review**, never automated grading. The follow-up and worked answer are authored. Both attempts remain available to compare; a session has one optional retry.

Read `PRODUCT.md` for the seven milestones and `AGENTS.md` for the GitHub working/checkpoint workflow.
