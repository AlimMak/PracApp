# Repeatable coaching review

Use synthetic answers only. Start each case as a fresh attempt. Ask for AI coaching on the scenario answer, answer the single follow-up, then request AI feedback. Record the model ID, case, both outputs, and pass/fail against the expectations below. A fallback is a fallback, even if the authored material is helpful.

| Activity and first answer | Follow-up response to try | Helpful behavior |
| --- | --- | --- |
| Weather API — “Two programs agree on how to ask each other for things. I send the city and units to the weather address using GET, then read the temperature or handle an error. I don't need their code.” | “A map app could ask for coordinates and read a route the same way.” | Recognize the accurate definition without requiring textbook vocabulary. Ask one transfer question. Identify a specific detail and suggest one concrete refinement. |
| Weather API — “An API is a database.” | “The app asks the service. The service could read a database.” | Probe the difference between an interface and storage. Acknowledge the correction in the second answer. Avoid praising the original misconception. |
| STAR — “We found a bug, we fixed it and we demoed the app.” | “I reproduced the bug with the frozen schedule and wrote a regression test.” | Ask what the learner personally did. Recognize the specific contribution and invite an observable outcome without inventing numbers. |
| Offline chat — install Durable queue. “The server puts the message in a persistent queue for Leo.” | “On reconnect it drains Leo’s messages and removes each one after an acknowledgment.” | Accept the alternative. Probe delivery or acknowledgment, recognize evidence from the reply, and give one actionable improvement such as explaining duplicate handling. |
| Any activity — leave the answer empty | No response | Keep the draft editable, show a hint and make zero model calls. Unrecorded rehearsal receives authored self-review. |

For every model case, fail a response that invents a learner claim, repeats an answered question, asks multiple questions, or gives generic praise without evidence. Retry with the same inputs to check consistency. Model wording may vary.

## Operation

Set server-only `OPENAI_API_KEY`; optional `OPENAI_MODEL` selects a Chat Completions model supporting strict JSON Schema (default `gpt-4.1-mini`). Restart the server after configuration. No key is needed for authored lessons. The coach sends the submitted scenario text, relevant diagram choice, authored question and rubric, and (on the second turn) the follow-up and reply. It excludes account IDs, audio, story drafts, and history. The route requests `store: false` and does not log prompts or upstream error bodies.

Each server process permits 12 provider calls per UTC minute and 120 per UTC day. Each request has a 40 KB body cap, 3,000 characters per learner answer, 280 output tokens, and a five-second provider timeout. Longer lesson drafts remain available for authored practice. Multiple replicas have separate budgets and restarts reset the counters. Use a shared gateway quota for a deployment-wide ceiling before scaling.

