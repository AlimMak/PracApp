# PracticeApp working instructions

## Repository workflow

- Use `https://github.com/AlimMak/PracApp.git`. Reuse an existing checkout, including an equivalent SSH remote. Otherwise clone into a fresh `PracApp` folder. Preserve unrelated folders, remotes, and uncommitted edits.
- Before changing files, read this file and `PRODUCT.md`, inspect `git status`, fetch the remote, and safely bring the intended working branch up to date. Never silently stash, discard, or overwrite someone else's edits.
- Follow existing branch and pull request conventions. Use a feature branch and pull request if the target branch is protected. An empty remote starts on `main`; set its upstream on the first push.
- At each meaningful working checkpoint: run relevant checks, review the diff (including new files), stage only intended project files, make a descriptive commit, and push to GitHub.
- Keep credentials, real learner data, local practice state, and generated build/test output out of commits. Never commit `.env` secrets. Use synthetic examples in tests.
- Preserve shared history. Resolve divergence with a safe merge or agreed rebase of unshared work; never force-push shared branches.
- At milestone end, verify that the latest local commit is on the remote branch. Report its GitHub link, branch, and actual check results. If authentication blocks a push, keep the local commit and identify exactly what remains pending.

## Product and implementation

- Working title: **Interview Practice**. Read `PRODUCT.md` for scope and milestone order. Build only the requested milestone.
- Preserve the existing stack: Next.js App Router, TypeScript, React, and plain responsive CSS.
- Prioritize a narrow phone screen, readable text, one main task at a time, keyboard use, and reduced motion. Keep explanations short and concrete.
- Visitors begin immediately. Do not add a sign-in gate, timers, invented scores, or claims that authored self-review evaluates an answer.
- Preserve drafts and attempts when navigating and refreshing. Treat local browser storage as fallible and validate restored state.
- Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` for lesson changes. Browser tests use synthetic text, never a learner's real answers.
- Public website deployment is milestone 7. A local development server is appropriate now.
