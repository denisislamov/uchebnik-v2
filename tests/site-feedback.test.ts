import { test } from "node:test";
import assert from "node:assert/strict";
import { feedbackIssue } from "../shared/feedback-validation.ts";
import { createFeedbackSubmission } from "../src/feedback/submission.ts";
import type { FeedbackInput } from "../shared/site-api.ts";
const fields = {
  message: "Полезный учебник, спасибо!",
  name: "",
  email: "",
  website: "",
};
test("feedback validation counts Unicode characters and accepts optional fields", () => {
  assert.equal(feedbackIssue({ ...fields, message: "a".repeat(9) }), "message");
  assert.equal(feedbackIssue({ ...fields, message: "🙂".repeat(5000) }), null);
  assert.equal(
    feedbackIssue({ ...fields, message: "x".repeat(5001) }),
    "message",
  );
  assert.equal(feedbackIssue({ ...fields, name: "a".repeat(81) }), "name");
  assert.equal(feedbackIssue({ ...fields, email: "not-an-email" }), "email");
  assert.equal(feedbackIssue(fields), null);
});
test("failed delivery reuses its id while edits and new messages get new ids", async () => {
  const attempts: FeedbackInput[] = [];
  let seq = 0,
    fail = true;
  const controller = createFeedbackSubmission(
    async (input) => {
      attempts.push(input);
      if (fail) throw new Error("lost response");
    },
    () => String(++seq),
  );
  await assert.rejects(controller.submit(fields));
  await assert.rejects(controller.submit(fields));
  assert.equal(attempts[0].id, attempts[1].id);
  fail = false;
  await controller.submit({ ...fields, message: "Изменённый текст сообщения" });
  assert.notEqual(attempts[1].id, attempts[2].id);
  await controller.submit({ ...fields, message: "Изменённый текст сообщения" });
  assert.notEqual(attempts[2].id, attempts[3].id);
});
