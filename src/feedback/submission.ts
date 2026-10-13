import {
  feedbackIssue,
  normalizeFeedback,
  type FeedbackFields,
} from "../../shared/feedback-validation.ts";
import type { FeedbackInput } from "../../shared/site-api.ts";
export function createFeedbackSubmission(
  send: (input: FeedbackInput) => Promise<void>,
  uuid: () => string,
) {
  let pending: { fingerprint: string; id: string } | undefined;
  return {
    async submit(fields: FeedbackFields): Promise<void> {
      const issue = feedbackIssue(fields);
      if (issue) throw new Error(issue);
      const clean = normalizeFeedback(fields),
        fingerprint = JSON.stringify(clean);
      if (pending?.fingerprint !== fingerprint)
        pending = { fingerprint, id: uuid() };
      await send({
        id: pending.id,
        message: clean.message,
        ...(clean.name ? { name: clean.name } : {}),
        ...(clean.email ? { email: clean.email } : {}),
        website: clean.website,
      });
      pending = undefined;
    },
  };
}
