import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type {
  AdminSession,
  Counts,
  DashboardData,
  Period,
} from "../../shared/site-api";
import { ApiError, apiRequest } from "../api/client";
import { AdminButton } from "./Controls";
import { s } from "./styles";
export type PrivateProps = { session: AdminSession; onExpired: () => void };
const metrics: [keyof Counts, string][] = [
  ["visitors", "Посетители"],
  ["visits", "Визиты"],
  ["bookOpens", "Открытия учебника"],
  ["boostyClicks", "Клики на Boosty"],
  ["boostyVisitors", "Посетители Boosty"],
  ["boostyConversion", "Переходы в Boosty, %"],
];
export function Dashboard({ onExpired }: PrivateProps) {
  const [period, setPeriod] = useState<Period>("7d"),
    [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    apiRequest<DashboardData>(`/v1/admin/analytics?period=${period}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) onExpired();
        else setError(true);
      });
    return () => {
      active = false;
    };
  }, [period, attempt, onExpired]);
  const max = data ? Math.max(1, ...data.days.map((day) => day.visits)) : 1;
  return (
    <View style={{ gap: 24 }} testID="admin-dashboard">
      <View style={[s.row, s.spread]}>
        <Text style={s.heading} accessibilityRole="header">
          Посещаемость
        </Text>
        <View style={s.row}>
          {(
            [
              ["today", "Сегодня"],
              ["7d", "7 дней"],
              ["30d", "30 дней"],
            ] as const
          ).map(([key, label]) => (
            <AdminButton
              key={key}
              testID={`period-${key}`}
              secondary={period !== key}
              selected={period === key}
              onPress={() => {
                setPeriod(key);
                setAttempt((a) => a + 1);
              }}
            >
              {label}
            </AdminButton>
          ))}
        </View>
      </View>
      <Text style={s.muted}>
        Дни считаются по времени Asia/Makassar (UTC+8), включая сегодняшний.
      </Text>
      {error ? (
        <View style={s.card} testID="admin-data-error">
          <Text accessibilityRole="alert" style={s.error}>
            Не удалось загрузить статистику. Это ошибка связи, а не отсутствие
            посещений.
          </Text>
          <AdminButton
            testID="admin-data-retry"
            onPress={() => setAttempt((a) => a + 1)}
          >
            Повторить
          </AdminButton>
        </View>
      ) : !data ? (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          Загружаем статистику…
        </Text>
      ) : (
        <>
          <View style={s.row}>
            {metrics.map(([key, label]) => (
              <View
                key={key}
                style={[s.card, s.metric]}
                testID={`metric-${key}`}
              >
                <Text style={s.muted}>{label}</Text>
                <Text style={s.number}>
                  {key === "boostyConversion"
                    ? data.totals[key] === null
                      ? "—"
                      : `${(data.totals[key]! * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`
                    : data.totals[key]?.toLocaleString("ru-RU")}
                </Text>
              </View>
            ))}
          </View>
          <View style={s.card}>
            <Text accessibilityRole="header" style={s.heading}>
              Визиты по дням
            </Text>
            <Text style={s.muted}>
              Дата · визиты · посетители · клики Boosty
            </Text>
            {data.days.map((day) => (
              <View key={day.date} style={{ gap: 6 }}>
                <Text style={s.text}>
                  {day.date} · {day.visits} · {day.visitors} ·{" "}
                  {day.boostyClicks}
                </Text>
                <View
                  accessible={false}
                  style={{
                    height: 8,
                    backgroundColor: "#efecfa",
                    borderRadius: 4,
                  }}
                >
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      width: `${(day.visits / max) * 100}%`,
                      backgroundColor: "#6351cf",
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
          <View style={s.card}>
            <Text accessibilityRole="header" style={s.heading}>
              Откуда приходят
            </Text>
            <Text style={s.muted}>
              Источник первого события визита. До 50 источников.
            </Text>
            {data.sources.length ? (
              data.sources.map((source) => (
                <View key={source.host} style={[s.row, s.spread]}>
                  <Text style={[s.text, { flexShrink: 1 }]}>
                    {source.host === "direct"
                      ? "Прямой вход / источник неизвестен"
                      : source.host}
                  </Text>
                  <Text style={s.label}>{source.visits}</Text>
                </View>
              ))
            ) : (
              <Text style={s.text}>Пока нет данных за этот период.</Text>
            )}
          </View>
          <Text style={s.muted}>
            Посетители — приблизительное число браузеров, а не людей. Новый
            визит начинается после 30 минут бездействия. Блокировщики, запрет
            отслеживания и очистка хранилища влияют на подсчёт. Клики Boosty не
            означают оплату; доля переходов — посетители, нажавшие Boosty, от
            всех определённых посетителей. Данные хранятся 90 дней. Ответы и
            успеваемость детей не собираются.
          </Text>
        </>
      )}
    </View>
  );
}
