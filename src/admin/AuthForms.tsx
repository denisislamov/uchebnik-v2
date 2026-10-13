import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import type { AdminSession } from "../../shared/site-api";
import { ApiError, apiRequest } from "../api/client";
import { AdminButton, AdminField } from "./Controls";
import { s } from "./styles";

export function goToLogin() {
  window.history.pushState(null, "", "/admin");
  window.dispatchEvent(new PopStateEvent("popstate"));
}
function errorMessage(error: unknown, login = false) {
  if (error instanceof ApiError && error.status === 429)
    return "Слишком много попыток. Попробуйте позже.";
  if (login && error instanceof ApiError && error.status === 401)
    return "Неверный логин или пароль.";
  return "Не удалось связаться с сервером. Попробуйте ещё раз.";
}
export function Login({
  onLogin,
}: {
  onLogin: (session: AdminSession) => void;
}) {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [email, setEmail] = useState("");
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function submit() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      if (mode === "login") {
        const session = await apiRequest<AdminSession>("/v1/auth/login", {
          method: "POST",
          body: { username, password },
        });
        if (active.current) {
          setPassword("");
          onLogin(session);
        }
      } else {
        await apiRequest("/v1/auth/forgot", {
          method: "POST",
          body: { email },
        });
        if (active.current) setSent(true);
      }
    } catch (e) {
      if (active.current) setError(errorMessage(e, mode === "login"));
    } finally {
      if (active.current) setPending(false);
    }
  }
  return (
    <View style={[s.auth, s.card]} testID="admin-login">
      <Text accessibilityRole="header" style={s.title}>
        {mode === "login" ? "Вход владельца" : "Восстановление доступа"}
      </Text>
      <Text style={s.muted}>
        {mode === "login"
          ? "Статистика и обратная связь «Умной Полки»."
          : "Введите почту владельца. Если она совпадает, мы отправим ссылку для нового пароля."}
      </Text>
      {sent ? (
        <Text accessibilityLiveRegion="polite" style={s.text}>
          Если адрес совпадает с почтой владельца, письмо скоро придёт.
          Проверьте также папку «Спам». Ссылка действует 30 минут.
        </Text>
      ) : (
        <>
          {mode === "login" ? (
            <>
              <AdminField
                label="Логин"
                value={username}
                onChangeText={setUsername}
                autoComplete="username"
                testID="admin-username"
                editable={!pending}
              />
              <AdminField
                label="Пароль"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                testID="admin-password"
                editable={!pending}
                onSubmitEditing={submit}
              />
            </>
          ) : (
            <AdminField
              label="Электронная почта"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              editable={!pending}
              testID="admin-recovery-email"
            />
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          <AdminButton
            onPress={submit}
            disabled={
              pending || (mode === "login" ? !username || !password : !email)
            }
            testID={
              mode === "login" ? "admin-login-submit" : "admin-forgot-submit"
            }
          >
            {pending
              ? "Подождите…"
              : mode === "login"
                ? "Войти"
                : "Отправить ссылку"}
          </AdminButton>
        </>
      )}
      <AdminButton
        secondary
        disabled={pending}
        onPress={() => {
          setMode(mode === "login" ? "forgot" : "login");
          setError("");
          setSent(false);
          setPassword("");
        }}
        testID="admin-forgot-toggle"
      >
        {mode === "login" ? "Забыли пароль?" : "Вернуться ко входу"}
      </AdminButton>
    </View>
  );
}
export function ResetPassword() {
  const token = useRef(""),
    extracted = useRef(false);
  const [ready, setReady] = useState(false),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    if (!extracted.current) {
      extracted.current = true;
      token.current =
        new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
      window.history.replaceState(null, "", window.location.pathname);
      setReady(true);
    }
    return () => {
      active.current = false;
    };
  }, []);
  async function submit() {
    if (pending) return;
    if (
      [...password].length < 16 ||
      new TextEncoder().encode(password).length > 256
    ) {
      setError("Используйте не менее 16 символов (до 256 байт).");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    setError("");
    setPending(true);
    try {
      await apiRequest("/v1/auth/reset", {
        method: "POST",
        body: { token: token.current, password },
      });
      token.current = "";
      if (active.current) goToLogin();
    } catch (e) {
      if (active.current)
        setError(
          e instanceof ApiError && e.status === 400
            ? "Ссылка недействительна или устарела. Запросите новое письмо."
            : errorMessage(e),
        );
    } finally {
      if (active.current) setPending(false);
    }
  }
  return (
    <View style={[s.auth, s.card]} testID="admin-reset">
      <Text accessibilityRole="header" style={s.title}>
        Новый пароль
      </Text>
      {ready && token.current ? (
        <>
          <Text style={s.muted}>
            Не менее 16 символов. После смены пароля потребуется войти снова на
            всех устройствах.
          </Text>
          <AdminField
            label="Новый пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            testID="admin-new-password"
            editable={!pending}
          />
          <AdminField
            label="Повторите пароль"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            testID="admin-confirm-password"
            editable={!pending}
            onSubmitEditing={submit}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          <AdminButton
            testID="admin-reset-submit"
            onPress={submit}
            disabled={pending}
          >
            {pending ? "Сохраняем…" : "Сохранить пароль"}
          </AdminButton>
        </>
      ) : (
        <Text style={s.text}>
          В ссылке нет кода восстановления. Вернитесь ко входу и запросите новое
          письмо.
        </Text>
      )}
      <AdminButton secondary onPress={goToLogin} disabled={pending}>
        Вернуться ко входу
      </AdminButton>
    </View>
  );
}
