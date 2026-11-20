# Interview Practice

A mobile-first website for new-grad software engineers who have practiced coding problems but need to understand and calmly explain fundamentals, such as APIs and semantic HTML, in their own words. It should reveal gaps and build understanding through short practice, not memorized scripts.

Use it for a short morning session on a phone, or a longer session on Windows or Mac. The eventual default session mixes CS fundamentals, beginner visual system design, and behavioral/STAR practice. Visitors start immediately; optional accounts later sync progress and save private stories. Specialized career paths, a native iOS app, and a live AI interviewer are future ideas.

## Milestones, in order

1. **One playable API lesson (complete).** Untimed quick check, optional fixed Austin weather web API example, transfer question, one authored follow-up, worked answer and self-review, retry/attempt comparison, local resume. Next.js, TypeScript, plain CSS. No live API, AI grading, or deployment.
2. **Visual system design (complete).** Deliver a chat message to an offline recipient. Tap to place components, undo, run the design, explain it, and offer a watch-and-explain alternative.
3. **Behavioral practice (complete).** Teach STAR with a fictional student project and guide learners through saving their own stories. Shared answer input supports typing and editable browser dictation.
4. **Mixed sessions and curriculum (complete).** Start a three-activity session, resume drafts, bring back topics marked Still practicing, and find the next topic in a guided path. The catalog includes six new CS lessons, a cache simulator, and three behavioral prompts.
5. **Accounts and sync (implemented).** Optional Supabase sign-in, guest import, cross-device progress and drafts, per-user access, explicit conflict resolution, sign-out and story deletion.
6. **Answer-aware AI coaching.** Server-side follow-up and grounded feedback, bounded usage, privacy, explicit AI labels, immediate authored fallback, and a repeatable evaluation set.
7. **Test and publish.** Verify phone/desktop and complete flows, build, push, deploy the verified revision, check production, document setup/architecture/demo, and draft factual resume bullets.

## Current handoff

Milestone 1 is implemented. TypeScript, five progress-state tests, the production build, and 18 browser checks passed (desktop Chromium, phone Chromium, and phone WebKit emulation). Both entry paths, local resume, two-attempt comparison, keyboard use, reduced motion, and 320px layouts were verified. Physical phone feel still needs the learner’s check.

Milestone 2 is implemented at `/offline-chat`. The root route still opens the API lesson and links to the chat activity. Both chat paths share the same simulation, and chat progress stays in the browser.

Milestone 3 is implemented at `/star`. Learners can save and edit their stories in the browser, then rehearse with optional cues and self-review. All three activities use the same answer input. Dictation depends on browser support and permission. STAR also supports rehearsal aloud without recording.

Milestone 4 adds **Start practice** at the existing API entry, a catalog and progress at `/practice`, and mixed sessions at `/practice/session`. Session drafts and direct attempts have separate browser keys. Progress comes from the learner’s self-review.

Milestone 5 adds optional accounts at `/account`. Configure a Supabase project and apply the migration to enable hosted sync. Guest practice starts immediately and remains in browser storage. Signed-in drafts stay in memory until the account sync confirms the write.

Next is milestone 6 when requested. Preserve the direct activity links and **self-review** labeling. Never commit real learner answers. Deployment belongs to milestone 7.
