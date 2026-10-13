import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { LibraryLocale } from "../localization/library";
import { feedbackCopy } from "../localization/feedback";
import { libraryColors as c, libraryFonts as f } from "./libraryTheme";
import { apiRequest, ApiError } from "../api/client";
import { createFeedbackSubmission } from "../feedback/submission";
import { feedbackIssue } from "../../shared/feedback-validation";

export function FeedbackForm({
  locale,
  onClose,
}: {
  locale: LibraryLocale;
  onClose: () => void;
}): React.JSX.Element {
  const t = feedbackCopy[locale];
  const [message, setMessage] = useState(""),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false),
    [success, setSuccess] = useState(false),
    [error, setError] = useState("");
  const messageRef = useRef<TextInput>(null);
  const controller = useRef<ReturnType<typeof createFeedbackSubmission> | null>(
    null,
  );
  if (!controller.current)
    controller.current = createFeedbackSubmission(
      (input) =>
        apiRequest<void>("/v1/feedback", { method: "POST", body: input }),
      () => globalThis.crypto.randomUUID(),
    );
  const submit = async () => {
    if (pending) return;
    const fields = { message, name, email, website },
      issue = feedbackIssue(fields);
    if (issue) {
      setError(t[`${issue}Error`]);
      return;
    }
    setError("");
    setPending(true);
    try {
      await controller.current!.submit(fields);
      setMessage("");
      setName("");
      setEmail("");
      setWebsite("");
      setSuccess(true);
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.code === "rate_limited"
          ? t.rateError
          : t.sendError,
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      accessibilityLabel={t.title}
      onRequestClose={onClose}
      onShow={() => messageRef.current?.focus()}
    >
      <KeyboardAvoidingView
        style={s.shade}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View testID="feedback-dialog" style={s.panel}>
          <View style={s.heading}>
            <Text accessibilityRole="header" style={s.title}>
              {t.title}
            </Text>
            <Pressable
              testID="feedback-close"
              accessibilityRole="button"
              accessibilityLabel={t.close}
              onPress={onClose}
              style={s.close}
            >
              <Text style={s.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.body}
          >
            {success ? (
              <Text
                testID="feedback-success"
                accessibilityRole="alert"
                style={s.success}
              >
                {t.success}
              </Text>
            ) : (
              <>
                <Text style={s.hint}>{t.hint}</Text>
                <Text style={s.label}>{t.message}</Text>
                <TextInput
                  ref={messageRef}
                  testID="feedback-message"
                  accessibilityLabel={t.message}
                  multiline
                  maxLength={10000}
                  value={message}
                  onChangeText={setMessage}
                  editable={!pending}
                  style={[s.input, s.message]}
                />
                <Text style={s.counter}>
                  {Array.from(message).length} / 5000
                </Text>
                <Text style={s.label}>{t.name}</Text>
                <TextInput
                  testID="feedback-name"
                  accessibilityLabel={t.name}
                  autoComplete="name"
                  value={name}
                  onChangeText={setName}
                  editable={!pending}
                  style={s.input}
                />
                <Text style={s.label}>{t.email}</Text>
                <TextInput
                  testID="feedback-email"
                  accessibilityLabel={t.email}
                  autoComplete="email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  editable={!pending}
                  style={s.input}
                />
                <View aria-hidden style={s.trap} pointerEvents="none">
                  <TextInput
                    accessible={false}
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChangeText={setWebsite}
                  />
                </View>
                {!!error && (
                  <Text
                    testID="feedback-error"
                    accessibilityRole="alert"
                    style={s.error}
                  >
                    {error}
                  </Text>
                )}
                <Pressable
                  testID="feedback-submit"
                  accessibilityRole="button"
                  disabled={pending}
                  accessibilityState={{ disabled: pending, busy: pending }}
                  onPress={() => {
                    void submit();
                  }}
                  style={[s.submit, pending && { opacity: 0.6 }]}
                >
                  <Text style={s.submitText}>
                    {pending ? t.sending : t.submit}
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  shade: {
    flex: 1,
    backgroundColor: "rgba(35,29,58,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  panel: {
    width: "100%",
    maxWidth: 580,
    maxHeight: "90%",
    backgroundColor: c.card,
    borderRadius: 20,
    overflow: "hidden",
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 24,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  title: { fontFamily: f.heading, fontSize: 23, color: c.ink, flex: 1 },
  close: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 30, color: c.muted },
  body: { padding: 24, gap: 10 },
  hint: {
    fontFamily: f.regular,
    fontSize: 14,
    lineHeight: 21,
    color: c.muted,
    marginBottom: 6,
  },
  label: { fontFamily: f.bold, fontSize: 14, color: c.ink, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: c.lip,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 44,
    fontFamily: f.regular,
    fontSize: 16,
    color: c.ink,
    backgroundColor: c.paper,
  },
  message: { minHeight: 130, textAlignVertical: "top" },
  counter: { fontSize: 12, color: c.muted, textAlign: "right" },
  trap: {
    position: "absolute",
    left: -10000,
    width: 1,
    height: 1,
    overflow: "hidden",
  },
  error: {
    fontFamily: f.regular,
    fontSize: 14,
    lineHeight: 21,
    color: "#a52e3c",
  },
  success: {
    fontFamily: f.bold,
    fontSize: 18,
    lineHeight: 28,
    color: c.penDark,
    paddingVertical: 20,
  },
  submit: {
    backgroundColor: c.pen,
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  submitText: { fontFamily: f.bold, color: c.white, fontSize: 16 },
});
