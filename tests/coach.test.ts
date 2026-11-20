import assert from "node:assert/strict";
import test from "node:test";
import { createCoachHandler } from "../src/lib/coach-server.ts";
import { coachLesson } from "../src/lib/coaching.ts";

const base = {
  phase: "question",
  id: "api",
  answer: "Their app sends the city and reads back a temperature.",
};
function request(body: unknown) {
  return new Request("http://localhost/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
test("missing key, empty, unsure, oversized, and invalid diagram stay authored without a model call", async () => {
  let calls = 0;
  const handle = createCoachHandler(async () => {
    calls++;
    throw Error();
  });
  for (const [body, key] of [
    [base, undefined],
    [{ ...base, answer: "" }, "test"],
    [{ ...base, answer: "I don’t know" }, "test"],
    [{ ...base, answer: "x".repeat(3001) }, "test"],
    [{ ...base, diagram: "story" }, "test"],
    [{ ...base, extra: "x".repeat(41000) }, "test"],
  ] as const)
    assert.deepEqual(await (await handle(request(body), key)).json(), {
      fallback: true,
    });
  assert.equal(calls, 0);
});
test("provider timeout, throttling, and malformed output give authored fallback", async () => {
  for (const provider of [
    async () => {
      throw new DOMException("timeout", "TimeoutError");
    },
    async () => new Response(null, { status: 429 }),
    async () => Response.json({ choices: [] }),
  ])
    assert.deepEqual(
      await (await createCoachHandler(provider)(request(base), "test")).json(),
      { fallback: true },
    );
});
test("both turns use the activity rubric and only the submitted fields (simulated provider)", async () => {
  for (const feedback of [false, true]) {
    const expected = feedback
      ? {
          demonstrated: "You kept the message until reconnect.",
          improvement: "Say when delivery is acknowledged.",
        }
      : { question: "When can the queue remove the message?" };
    const handle = createCoachHandler(async (_, init) => {
      const payload = JSON.parse(String(init?.body));
      const input = JSON.parse(payload.messages[1].content);
      assert.deepEqual(input.rubric, coachLesson("offline-chat")?.rubric);
      assert.equal(input.diagram, "queue");
      assert.equal(input.reply, feedback ? "After acknowledgment." : undefined);
      assert.ok(!JSON.stringify(payload).includes("private library draft"));
      assert.equal(payload.store, false);
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(expected) },
          },
        ],
      });
    });
    assert.deepEqual(
      await (
        await handle(
          request({
            ...base,
            id: "offline-chat",
            phase: feedback ? "feedback" : "question",
            answer: "The queue persists the message.",
            question: "When remove it?",
            reply: "After acknowledgment.",
            diagram: "queue",
            story: "private library draft",
          }),
          "test",
        )
      ).json(),
      expected,
    );
  }
});
test("public budget stops calls even when clients change identity", async () => {
  let calls = 0;
  const handle = createCoachHandler(
    async () => {
      calls++;
      return new Response(null, { status: 429 });
    },
    () => 0,
  );
  for (let i = 0; i < 14; i++) await handle(request(base), "test");
  assert.equal(calls, 12);
});
