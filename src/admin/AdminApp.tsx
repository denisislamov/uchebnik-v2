import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import type { AdminSession } from "../../shared/site-api";
import { ApiError, apiRequest } from "../api/client";
import { Login, ResetPassword } from "./AuthForms";
import { AdminButton } from "./Controls";
import { Dashboard } from "./Dashboard";
import { Inbox } from "./Inbox";
import { adminRoute } from "./route";
import { s } from "./styles";
export function AdminApp() {
  const reset = adminRoute(window.location.pathname) === "reset";
  const [session, setSession] = useState<AdminSession | null>(null),
    [loading, setLoading] = useState(!reset),
    [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0),
    [tab, setTab] = useState<"stats" | "messages">("stats"),
    [pending, setPending] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const expired = useCallback(() => {
    setSession(null);
    setTab("stats");
    setError("");
  }, []);
  useEffect(() => {
    const original = document.title;
    document.title = "Владелец — Умная Полка";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = original;
      meta.remove();
    };
  }, []);
  useEffect(() => {
    if (reset) return;
    let active = true;
    setLoading(true);
    setError("");
    apiRequest<AdminSession>("/v1/auth/session")
      .then((result) => {
        if (active) setSession(result);
      })
      .catch((e) => {
        if (active && !(e instanceof ApiError && e.status === 401))
          setError("Не удалось проверить вход. Попробуйте ещё раз.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reset, attempt]);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(
      expired,
      Math.max(0, new Date(session.expiresAt).getTime() - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [session, expired]);
  async function logout() {
    if (!session || pending) return;
    setPending(true);
    setError("");
    try {
      await apiRequest("/v1/auth/logout", {
        method: "POST",
        csrfToken: session.csrfToken,
      });
      expired();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) expired();
      else setError("Не удалось выйти. Повторите попытку.");
    } finally {
      setPending(false);
    }
  }
  return (
    <ScrollView style={s.page} contentContainerStyle={s.container}>
      <Text style={s.label}>УМНАЯ ПОЛКА / ВЛАДЕЛЕЦ</Text>
      {!fontsLoaded && !fontError ? (
        <Text style={s.text}>Загружаем…</Text>
      ) : reset ? (
        <ResetPassword />
      ) : loading ? (
        <Text style={s.text}>Проверяем вход…</Text>
      ) : session ? (
        <>
          <View style={[s.row, s.spread]}>
            <Text accessibilityRole="header" style={s.title}>
              Ваш сайт в цифрах
            </Text>
            <AdminButton
              secondary
              disabled={pending}
              testID="admin-logout"
              onPress={logout}
            >
              {pending ? "Выходим…" : "Выйти"}
            </AdminButton>
          </View>
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          <View style={s.row}>
            <AdminButton
              secondary={tab !== "stats"}
              selected={tab === "stats"}
              onPress={() => setTab("stats")}
            >
              Статистика
            </AdminButton>
            <AdminButton
              secondary={tab !== "messages"}
              selected={tab === "messages"}
              testID="admin-messages-tab"
              onPress={() => setTab("messages")}
            >
              Сообщения
            </AdminButton>
          </View>
          {tab === "stats" ? (
            <Dashboard session={session} onExpired={expired} />
          ) : (
            <Inbox session={session} onExpired={expired} />
          )}
        </>
      ) : error ? (
        <View style={s.card}>
          <Text style={s.error} accessibilityRole="alert">
            {error}
          </Text>
          <AdminButton onPress={() => setAttempt((a) => a + 1)}>
            Повторить
          </AdminButton>
        </View>
      ) : (
        <Login onLogin={setSession} />
      )}
    </ScrollView>
  );
}
