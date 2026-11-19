# Interview Practice

A mobile-first website for new-grad software engineers who have practiced coding problems but need to understand and calmly explain fundamentals, such as APIs and semantic HTML, in their own words. It should reveal gaps and build understanding through short practice, not memorized scripts.

Use it for a short morning session on a phone, or a longer session on Windows or Mac. The eventual default session mixes CS fundamentals, beginner visual system design, and behavioral/STAR practice. Visitors start immediately; optional accounts later sync progress and save private stories. Specialized career paths, a native iOS app, and a live AI interviewer are future ideas.

## Milestones, in order

1. **One playable API lesson (complete).** Untimed quick check, optional fixed Austin weather web API example, transfer question, one authored follow-up, worked answer and self-review, retry/attempt comparison, local resume. Next.js, TypeScript, plain CSS. No live API, AI grading, or deployment.
2. **Visual system design (complete).** Deliver a chat message to an offline recipient. Tap to place components, undo, run the design, explain it, and offer a watch-and-explain alternative.
3. **Behavioral practice.** Teach STAR with a fictional student project; guide and save the learner's own stories. Shared typed/spoken answer input with editable transcription and typing fallback.
4. **Mixed sessions and curriculum.** Add direct entry, resume, revisit weak concepts, semantic HTML, HTTP, indexes, threads, debugging, tests, a cache challenge, and more behavioral prompts.
5. **Accounts and sync.** Optional sign-in, guest import, cross-device drafts/progress/stories, per-user isolation, conflict handling, sign-out and deletion. Default to Supabase if no provider exists.
6. **Answer-aware AI coaching.** Server-side follow-up and grounded feedback, bounded usage, privacy, explicit AI labels, immediate authored fallback, and a repeatable evaluation set.
7. **Test and publish.** Verify phone/desktop and complete flows, build, push, deploy the verified revision, check production, document setup/architecture/demo, and draft factual resume bullets.

## Current handoff

Milestone 1 is implemented. TypeScript, five progress-state tests, the production build, and 18 browser checks passed (desktop Chromium, phone Chromium, and phone WebKit emulation). Both entry paths, local resume, two-attempt comparison, keyboard use, reduced motion, and 320px layouts were verified. Physical phone feel still needs the learner’s check.

Milestone 2 is implemented at `/offline-chat`. The root route still opens the API lesson and links to the chat activity. Both chat paths share the same simulation, and chat progress stays in the browser.

Next is milestone 3 when requested. Preserve both existing activities and **self-review** labeling. Never commit real learner answers. Deployment belongs to milestone 7.
