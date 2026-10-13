export type FeedbackFields = {
  message: string;
  name: string;
  email: string;
  website: string;
};
export function normalizeFeedback(fields: FeedbackFields): FeedbackFields {
  return {
    message: fields.message.trim(),
    name: fields.name.trim(),
    email: fields.email.trim(),
    website: fields.website.trim(),
  };
}
export function feedbackIssue(
  fields: FeedbackFields,
): "message" | "name" | "email" | null {
  const value = normalizeFeedback(fields),
    length = Array.from(value.message).length;
  if (length < 10 || length > 5000) return "message";
  if (Array.from(value.name).length > 80) return "name";
  if (
    value.email &&
    (Array.from(value.email).length > 254 ||
      /[\r\n]/.test(fields.email) ||
      !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value.email))
  )
    return "email";
  return null;
}
