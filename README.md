# Interview Practice

Mobile-first, untimed interview practice for new-grad software engineers. The API lesson opens at `/`. The offline chat design exercise opens at `/offline-chat` and is linked from the API lesson.

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

To try offline chat, open `/offline-chat`, tap **Send**, then **Make Leo offline**. Select **Message store**, tap **Server attachment point**, and press **Run example**. Once the message is saved, tap **Reconnect Leo** to see it arrive. Try **Live relay** on a retry to see where delivery stops, or choose **Watch and explain instead** for a guided run.

## Checks

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

Browser checks run against the production server and cover both entry paths, weather request/response steps, replay, keyboard controls, reduced motion, refresh recovery, two saved attempts, blocked storage, and 320px layouts. Projects include desktop Chromium, mobile Chromium, and mobile WebKit. Emulation is not a physical iPhone test. On a Linux CI runner, install browser system dependencies with `npx playwright install --with-deps chromium webkit`.

## Architecture and privacy

- Next.js App Router, TypeScript, React, and plain responsive CSS. No UI framework, remote fonts, backend, authentication, analytics, microphone, or AI calls.
- `src/components/api-lesson.tsx` owns the lesson UI and weather playback. The diagram uses HTML, CSS and inline SVG, with a vertical layout on narrow phones.
- `src/lib/lesson.ts` defines progress, validates restored state, preserves two practice attempts, and contains the fixed sample weather data and authored captions.
- `src/lib/chat-design.ts` simulates sending, retention, and reconnecting for both chat paths. Chat progress and answers use the separate browser key `interview-practice:offline-chat:v1`. The activity sends no real messages.
- Local storage key: `interview-practice:api:v1`. Drafts, step, playback position, attempt text, and self-review checks stay in this browser. Refresh resumes paused. Accounts and cross-device sync arrive later.
- If storage is blocked or full, the lesson remains usable and displays a warning that work lasts only for this open tab. Clearing browser site data removes saved practice. The app does not send answers to a service.
- The weather endpoint is illustrative. `GET /weather?city=Austin&units=F` always demonstrates a sample `200 OK` response with 78 °F and Sunny. No real request or location permission is used.
- Feedback is **self-review**, never automated grading. The follow-up and worked answer are authored. Both attempts remain available to compare; a session has one optional retry.

Read `PRODUCT.md` for the seven milestones and `AGENTS.md` for the GitHub working/checkpoint workflow.
