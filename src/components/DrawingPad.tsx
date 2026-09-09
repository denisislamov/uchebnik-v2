import React, { useRef, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import Svg, { Line, Path, Circle } from "react-native-svg";
import type { Stroke, Point, TracePlan } from "../content/types";
import { traceProgress, matchesTrace } from "../lib/tracing";
import { traceDirections } from "../lib/traceDirections";
import { colors as c, fonts as f } from "../theme";
import { Button, ProgressBar } from "./Controls";
export function DrawingPad({
  strokes,
  onChange,
  trace,
  onDrawing,
}: {
  strokes: Stroke[];
  onChange: (v: Stroke[]) => void;
  trace?: TracePlan;
  onDrawing: (v: boolean) => void;
}) {
  const progress = trace ? traceProgress(trace, strokes) : null;
  const target =
    progress && !progress.done
      ? trace!.stages[progress.stage][progress.index]
      : undefined;
  const [width, setWidth] = useState(360),
    [draft, setDraft] = useState<Stroke | null>(null),
    [error, setError] = useState(""),
    [chosenColor, setChosenColor] = useState<string | null>(null);
  const active = useRef<Stroke | null>(null);
  const columns = trace?.columns ?? 12,
    rows = trace?.rows ?? 8;
  const height = (width * rows) / columns,
    color = chosenColor ?? target?.color ?? "#232d2b";
  const arrows = target ? traceDirections(target, { columns, rows }) : [];
  const cellSize = width / columns;
  const arrowSize = Math.max(5, Math.min(11, cellSize * 0.28));
  const directionColor = "#2563a6";
  const coords = (e: any): Point => ({
    x: Math.max(0, Math.min(1, e.nativeEvent.locationX / width)),
    y: Math.max(0, Math.min(1, e.nativeEvent.locationY / height)),
  });
  const d = (points: Point[]) =>
    points
      .map((p, i) => `${i ? "L" : "M"} ${p.x * width} ${p.y * height}`)
      .join(" ");
  function finish() {
    const stroke = active.current;
    active.current = null;
    onDrawing(false);
    if (!stroke) return;
    if (!target || matchesTrace(stroke, target, trace)) {
      onChange([...(progress?.accepted ?? strokes), stroke]);
      setDraft(null);
      setError("");
      setChosenColor(null);
    } else {
      setError(
        stroke.color !== target.color
          ? "Выбери цвет, как у пунктира."
          : target.dot
            ? "Поставь маленькую точку в кружке."
            : "Попробуй ещё раз: начни с яркой точки и веди по пунктиру в сторону синих стрелок.",
      );
    }
  }
  const visible = progress
    ? progress.accepted.slice(
        progress.start,
        progress.start + trace!.stages[progress.stage].length,
      )
    : strokes;
  return (
    <View style={{ gap: 12 }}>
      {progress && (
        <View style={{ gap: 8 }}>
          <Text
            accessibilityLiveRegion="polite"
            style={{ fontFamily: f.bold, color: c.green, fontSize: 17 }}
          >
            {progress.done
              ? "Все элементы получились!"
              : `${target?.label} · ${progress.completed + 1} из ${progress.total}`}
          </Text>
          <ProgressBar value={progress.completed / progress.total} />
          <Text style={{ fontFamily: f.regular, color: c.muted, fontSize: 13 }}>
            Лист {progress.stage + 1} из {trace!.stages.length} · начинай с
            яркой точки
          </Text>
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {["#23594e", "#ce6548", "#232d2b"].map((v, i) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={`Цвет: ${["зелёный", "красный", "чёрный"][i]}`}
            accessibilityState={{ selected: color === v }}
            onPress={() => setChosenColor(v)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: v,
              borderWidth: 4,
              borderColor: color === v ? "#b7cfb5" : c.card,
            }}
          />
        ))}
        <View style={{ flex: 1 }} />
        <Button
          small
          secondary
          disabled={!strokes.length}
          onPress={() => {
            onChange(strokes.slice(0, -1));
            setError("");
            setDraft(null);
            setChosenColor(null);
          }}
        >
          Отменить штрих
        </Button>
      </View>
      {target && (
        <View
          testID="drawing-direction-hint"
          style={{ padding: 12, borderRadius: 10, backgroundColor: "#edf4fc" }}
        >
          <Text
            style={{
              fontFamily: f.bold,
              color: directionColor,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {target.dot
              ? "Коснись кружка, чтобы поставить точку. Вести пальцем не нужно."
              : "Синие стрелки показывают, куда вести палец. Начни с яркой точки и двигайся по пунктиру в сторону стрелок. Сами стрелки обводить не нужно."}
          </Text>
        </View>
      )}
      <View
        accessibilityLabel="Поле для рисования"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[
          {
            height,
            borderWidth: 1,
            borderColor: "#94b8b5",
            borderRadius: 10,
            overflow: "hidden",
            backgroundColor: "#fffef9",
          },
          Platform.OS === "web" ? ({ touchAction: "none" } as any) : undefined,
        ]}
        onStartShouldSetResponder={() =>
          (progress?.completed ?? strokes.length) < 100 && !progress?.done
        }
        onMoveShouldSetResponder={() =>
          (progress?.completed ?? strokes.length) < 100 && !progress?.done
        }
        onResponderGrant={(e) => {
          onDrawing(true);
          setError("");
          const p = coords(e);
          active.current = {
            color,
            points: [p, { x: Math.min(1, p.x + 0.001), y: p.y }],
          };
          setDraft(active.current);
        }}
        onResponderMove={(e) => {
          if (!active.current || active.current.points.length >= 1000) return;
          active.current = {
            ...active.current,
            points: [...active.current.points, coords(e)],
          };
          setDraft(active.current);
        }}
        onResponderRelease={finish}
        onResponderTerminate={() => {
          active.current = null;
          setDraft(null);
          onDrawing(false);
        }}
        onResponderTerminationRequest={() => false}
      >
        <View pointerEvents="none">
          <Svg width={width} height={height}>
            {Array.from({ length: columns + 1 }, (_, i) => (
              <Line
                key={`v${i}`}
                x1={(i * width) / columns}
                y1={0}
                x2={(i * width) / columns}
                y2={height}
                stroke="#8abfbe"
                strokeWidth={i % 4 === 0 ? 1.3 : 0.65}
              />
            ))}
            {Array.from({ length: rows + 1 }, (_, i) => (
              <Line
                key={`h${i}`}
                x1={0}
                y1={(i * height) / rows}
                x2={width}
                y2={(i * height) / rows}
                stroke="#8abfbe"
                strokeWidth={i % 4 === 0 ? 1.3 : 0.65}
              />
            ))}
            {trace &&
              progress &&
              trace.stages[progress.stage].map((t, i) =>
                i < progress.index ? null : t.dot ? (
                  <Circle
                    key={i}
                    cx={t.points[0].x * width}
                    cy={t.points[0].y * height}
                    r={i === progress.index ? 6 : 4}
                    stroke={t.color}
                    fill="none"
                    strokeDasharray="2 2"
                    opacity={i === progress.index ? 1 : 0.3}
                  />
                ) : (
                  <Path
                    key={i}
                    d={d(t.points)}
                    stroke={t.color}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    opacity={i === progress.index ? 0.65 : 0.2}
                    fill="none"
                  />
                ),
              )}
            {target && !target.dot && (
              <>
                <Circle
                  cx={target.points.at(-1)!.x * width}
                  cy={target.points.at(-1)!.y * height}
                  r={4}
                  fill={c.paper}
                  stroke={target.color}
                />
                <Circle
                  cx={target.points[0].x * width}
                  cy={target.points[0].y * height}
                  r={5}
                  fill={target.color}
                />
              </>
            )}
            {[...visible, ...(draft ? [draft] : [])].map((s, i) => (
              <Path
                key={i}
                d={d(s.points)}
                stroke={error && i === visible.length ? c.orange : s.color}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {arrows.map(({ point, direction }, i) => {
              const x = point.x * cellSize,
                y = point.y * cellSize;
              const backX = x - direction.x * arrowSize;
              const backY = y - direction.y * arrowSize;
              const wingX = -direction.y * arrowSize * 0.65;
              const wingY = direction.x * arrowSize * 0.65;
              const path = `M ${backX + wingX} ${backY + wingY} L ${x} ${y} L ${backX - wingX} ${backY - wingY}`;
              return (
                <React.Fragment key={`direction-${i}`}>
                  <Path
                    d={path}
                    stroke="#fffef9"
                    strokeWidth={4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    testID="drawing-direction-arrow"
                    d={path}
                    stroke={directionColor}
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      </View>
      {error !== "" && (
        <Text
          accessibilityRole="alert"
          style={{
            fontFamily: f.bold,
            color: c.orange,
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          {error}
        </Text>
      )}
      <Text style={{ fontFamily: f.regular, color: c.muted, fontSize: 13 }}>
        Клетки одинаковые по ширине и высоте. Пунктир подсказывает путь.
      </Text>
    </View>
  );
}
