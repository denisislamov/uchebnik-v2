import React, { useEffect, useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import type { FeedbackPage, FeedbackStatus } from "../../shared/site-api";
import { ApiError, apiRequest } from "../api/client";
import { AdminButton } from "./Controls";
import type { PrivateProps } from "./Dashboard";
import { s } from "./styles";
const labels = { new: "Новые", read: "Прочитанные", archived: "Архив" };
export function Inbox({ session, onExpired }: PrivateProps) {
  const [filter, setFilter] = useState<FeedbackStatus | "all">("new"),
    [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState<FeedbackPage | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const generation = useRef(0);
  const path = `/v1/admin/feedback${filter === "all" ? "" : `?status=${filter}`}`;
  useEffect(() => {
    const current = ++generation.current;
    setPage(null);
    setError("");
    setDeleting(null);
    setPending(true);
    apiRequest<FeedbackPage>(path)
      .then((data) => {
        if (generation.current === current) setPage(data);
      })
      .catch((e) => {
        if (generation.current === current) handleError(e);
      })
      .finally(() => {
        if (generation.current === current) setPending(false);
      });
    return () => {
      generation.current++;
    };
  }, [path, attempt, onExpired]);
  function handleError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) onExpired();
    else
      setError(
        "Не удалось загрузить или изменить сообщение. Повторите действие.",
      );
  }
  async function more() {
    if (pending || !page?.nextCursor) return;
    const current = generation.current;
    setPending(true);
    setError("");
    try {
      const data = await apiRequest<FeedbackPage>(
        `${path}${path.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(page.nextCursor)}`,
      );
      if (generation.current === current)
        setPage((previous) =>
          previous
            ? {
                items: [
                  ...previous.items,
                  ...data.items.filter(
                    (item) => !previous.items.some((p) => p.id === item.id),
                  ),
                ],
                nextCursor: data.nextCursor,
              }
            : data,
        );
    } catch (e) {
      if (generation.current === current) handleError(e);
    } finally {
      if (generation.current === current) setPending(false);
    }
  }
  async function change(id: string, status?: FeedbackStatus) {
    if (pending) return;
    const current = generation.current;
    setPending(true);
    setError("");
    try {
      await apiRequest(`/v1/admin/feedback/${id}`, {
        method: status ? "PATCH" : "DELETE",
        body: status ? { status } : undefined,
        csrfToken: session.csrfToken,
      });
      if (generation.current === current) {
        setDeleting(null);
        setAttempt((a) => a + 1);
      }
    } catch (e) {
      if (generation.current === current) handleError(e);
    } finally {
      if (generation.current === current) setPending(false);
    }
  }
  return (
    <View style={{ gap: 20 }} testID="feedback-inbox">
      <Text accessibilityRole="header" style={s.heading}>
        Обратная связь
      </Text>
      <View style={s.row}>
        {(["new", "read", "archived", "all"] as const).map((value) => (
          <AdminButton
            key={value}
            testID={`filter-${value}`}
            selected={filter === value}
            secondary={filter !== value}
            disabled={pending}
            onPress={() => setFilter(value)}
          >
            {value === "all" ? "Все" : labels[value]}
          </AdminButton>
        ))}
      </View>
      {!!error && (
        <View style={s.card}>
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
          <AdminButton
            disabled={pending}
            onPress={() => setAttempt((a) => a + 1)}
          >
            Повторить загрузку
          </AdminButton>
        </View>
      )}
      {!page && pending && <Text style={s.muted}>Загружаем сообщения…</Text>}
      {page && !page.items.length && (
        <Text style={s.text} testID="inbox-empty">
          В этом разделе пока нет сообщений.
        </Text>
      )}
      {page?.items.map((message) => (
        <View key={message.id} style={s.card}>
          <View style={[s.row, s.spread]}>
            <Text style={s.heading}>{message.name || "Без имени"}</Text>
            <Text style={s.muted}>{labels[message.status]}</Text>
          </View>
          <Text style={s.muted}>
            {new Date(message.createdAt).toLocaleString("ru-RU", {
              timeZone: "Asia/Makassar",
            })}{" "}
            · UTC+8
          </Text>
          <Text selectable style={s.text}>
            {message.message}
          </Text>
          {message.email &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email) && (
              <AdminButton
                secondary
                onPress={() => {
                  void Linking.openURL(
                    `mailto:${encodeURIComponent(message.email!)}`,
                  ).catch(() =>
                    setError("Не удалось открыть почтовую программу."),
                  );
                }}
              >{`Ответить: ${message.email}`}</AdminButton>
            )}
          <View style={s.row}>
            {message.status === "new" && (
              <AdminButton
                secondary
                testID="message-read"
                disabled={pending}
                onPress={() => change(message.id, "read")}
              >
                Отметить прочитанным
              </AdminButton>
            )}
            {message.status !== "archived" ? (
              <AdminButton
                secondary
                testID="message-archive"
                disabled={pending}
                onPress={() => change(message.id, "archived")}
              >
                В архив
              </AdminButton>
            ) : (
              <AdminButton
                secondary
                testID="message-restore"
                disabled={pending}
                onPress={() => change(message.id, "new")}
              >
                Вернуть в новые
              </AdminButton>
            )}
            <AdminButton
              secondary
              testID="message-delete"
              disabled={pending}
              onPress={() => setDeleting(message.id)}
            >
              Удалить
            </AdminButton>
          </View>
          {deleting === message.id && (
            <View style={s.divider}>
              <Text accessibilityRole="alert" style={s.text}>
                Удалить сообщение навсегда? Восстановить его будет нельзя.
              </Text>
              <View style={s.row}>
                <AdminButton
                  danger
                  testID="message-delete-confirm"
                  disabled={pending}
                  onPress={() => change(message.id)}
                >
                  Да, удалить
                </AdminButton>
                <AdminButton
                  secondary
                  disabled={pending}
                  onPress={() => setDeleting(null)}
                >
                  Отмена
                </AdminButton>
              </View>
            </View>
          )}
        </View>
      ))}
      {page?.nextCursor && (
        <AdminButton disabled={pending} onPress={more}>
          {pending ? "Загружаем…" : "Ещё 25 сообщений"}
        </AdminButton>
      )}
    </View>
  );
}
