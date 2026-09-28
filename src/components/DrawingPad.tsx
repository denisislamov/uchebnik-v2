import { useGestureCoach } from "./GestureCoach";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Svg, { Line, Path, Circle } from "react-native-svg";
import type { Stroke, Point, TracePlan } from "../content/types";
import {
  traceProgress,
  matchesTrace,
  isClosedTrace,
  drawingColor,
  DRAWING_COLORS,
} from "../lib/tracing";
import { traceDirections, traceArrowGeometry } from "../lib/traceDirections";
import { colors as c, fonts as f } from "../theme";
import { Button, RetryNote } from "./Controls";
import { padCellSize, targetSpanCells } from "../lib/padLayout";
import { finePointer, useTaskSize } from "./taskSize";
import { Rows } from "./HandDrawn";
import { useAside, useHasAside } from "./Aside";
import { CELL, wholeCells } from "../lib/grid";
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
  const [containerWidth, setContainerWidth] = useState(360),
    [draft, setDraft] = useState<Stroke | null>(null),
    [error, setError] = useState(""),
    [chosenColor, setChosenColor] = useState<string | null>(null),
    [drawingNow, setDrawingNow] = useState(false);
  const active = useRef<Stroke | null>(null);
  const columns = trace?.columns ?? 12,
    rows = trace?.rows ?? 8;
  // On a narrow screen the sheet grows past the container and scrolls sideways
  // instead of shrinking its cells below a fingertip; the widest target of the
  // plan still has to fit on screen.
  const widestTarget = trace
    ? Math.max(
        0,
        ...trace.stages.flat().map((t) => targetSpanCells(t.points, columns)),
      )
    : 0;
  const { compact, fit, measured } = useTaskSize();
  // On a laptop the sheet takes what is left of the window under it, keeping
  // room for the hint and «Дальше»; a phone scrolls and keeps fingertip cells.
  const windowHeight = useWindowDimensions().height;
  // The hint under the sheet has gone beside it: its rows are the sheet's.
  const besideSample = useHasAside(),
    below = besideSample ? 114 : 210;
  const sheetBox = useRef<View>(null),
    [sheetTop, setSheetTop] = useState<number | null>(null);
  const width =
      padCellSize(
        containerWidth,
        columns,
        widestTarget,
        fit && sheetTop !== null
          ? {
              // Under the sheet: the rest of its last row, an empty row,
              // the hint, an empty row, «Дальше» and the line under it.
              // Whole rows, so the sheet fills them and none is wasted.
              height: wholeCells(windowHeight - sheetTop - below + measured),
              rows,
              // Smaller cells only for a mouse or trackpad, never for a finger.
              minCell: finePointer() ? 28 : 44,
            }
          : undefined,
      ) * columns,
    scrollable = width > containerWidth + 0.5;
  const height = (width * rows) / columns,
    color = chosenColor ?? target?.color ?? "#111111";
  const scrollRef = useRef<ScrollView>(null);
  const targetCenter = target
    ? target.points.reduce((s, p) => s + p.x, 0) / target.points.length
    : null;
  useEffect(() => {
    if (!scrollable || targetCenter === null) return;
    scrollRef.current?.scrollTo({
      x: Math.max(
        0,
        Math.min(
          width - containerWidth,
          targetCenter * width - containerWidth / 2,
        ),
      ),
      // A short glide, not a jump: the child sees where the next line is.
      animated: true,
    });
  }, [scrollable, targetCenter, width, containerWidth]);
  const closed = target ? isClosedTrace(target, { columns, rows }) : false;
  const fieldRef = useRef<View>(null);
  // The same glide up or down: a sheet taller than the window brings the next
  // line into view instead of leaving it under the fold or above the screen.
  const targetTop = target ? Math.min(...target.points.map((p) => p.y)) : null,
    targetBottom = target ? Math.max(...target.points.map((p) => p.y)) : null;
  useEffect(() => {
    if (Platform.OS !== "web" || targetTop === null || targetBottom === null)
      return;
    // After the sideways glide and after the lesson resets its scroll on a new step.
    const timer = setTimeout(() => {
      const field = fieldRef.current as unknown as HTMLElement | null;
      const pane = field && verticalScrollPane(field);
      if (!field || !pane) return;
      const box = field.getBoundingClientRect(),
        view = pane.getBoundingClientRect();
      // Room for the stroke's start dot and a finger around the line.
      const pad = Math.max(56, (height / rows) * 1.2);
      const top = box.top + targetTop * height - pad,
        bottom = box.top + targetBottom * height + pad;
      const shift =
        top < view.top
          ? top - view.top
          : bottom > view.bottom
            ? // Never push the line's start above the screen to show its end.
              Math.min(bottom - view.bottom, top - view.top)
            : 0;
      if (Math.abs(shift) > 1)
        pane.scrollBy({ top: shift, behavior: "smooth" });
    }, 250);
    return () => clearTimeout(timer);
  }, [
    targetTop,
    targetBottom,
    height,
    rows,
    // Every new line, even one on the same row as the last.
    progress?.stage,
    progress?.index,
  ]);
  useGestureCoach(target?.dot ? "dot" : "trace", [
    {
      ref: fieldRef,
      surface: trace
        ? {
            kind: "trace",
            columns,
            rows,
            targets: trace.stages[progress?.stage ?? 0],
          }
        : undefined,
      motion: target
        ? {
            kind: target.dot ? "tap" : "trace",
            points: target.points,
            color: target.color,
          }
        : undefined,
      text: target?.dot
        ? "Поставь палец в маленький кружок и сразу подними. Получится точка."
        : closed
          ? "Обведи фигуру пальцем по пунктиру. Начни в любом месте и вернись к началу."
          : target?.bidirectional
            ? "Веди палец по пунктиру. Две синие стрелки показывают: можно начать с любого конца."
            : target
              ? "Начни с яркой точки. Не отрывая палец, веди по пунктиру туда, куда смотрят синие стрелки. Стрелки показывают направление движения."
              : progress?.done
                ? "Все линии уже обведены. Можно перейти дальше или отменить штрих и попробовать ещё раз."
                : "Рисуй пальцем на этом листе. Чтобы закончить линию, подними палец.",
    },
  ]);
  const arrows = target
    ? traceDirections(target, { columns, rows }, trace!.stages[progress!.stage])
    : [];
  const cellSize = width / columns;
  const directionColor = "#1565c0";
  const setDrawing = (v: boolean) => {
    setDrawingNow(v);
    onDrawing(v);
  };
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
    setDrawing(false);
    if (!stroke) return;
    if (!target || matchesTrace(stroke, target, trace)) {
      onChange([...(progress?.accepted ?? strokes), stroke]);
      setDraft(null);
      setError("");
      setChosenColor(null);
    } else {
      setError(
        drawingColor(stroke.color) !== drawingColor(target.color)
          ? "Выбери цвет, как у пунктира."
          : target.dot
            ? "Поставь маленькую точку в кружке."
            : closed
              ? "Обведи весь контур и вернись к месту начала."
              : target.bidirectional
                ? "Проведи всю линию по пунктиру. Можно начать с любого конца."
                : "Попробуй ещё раз: начни с яркой точки и веди по пунктиру туда, куда смотрят синие стрелки.",
      );
    }
  }
  const visible = progress
    ? progress.accepted.slice(
        progress.start,
        progress.start + trace!.stages[progress.stage].length,
      )
    : strokes;
  // What is written in a row stands on the lower line of its two.
  const name = progress && (
    // Two rows are kept on a phone even for a short name: the sheet below
    // must not move when the next line has a longer one.
    // Under a sample nothing moves the sheet, and the name may wrap.
    <View
      style={[
        s.nameRow,
        !besideSample && { height: compact ? CELL * 2 : CELL },
      ]}
    >
      <Text
        accessibilityLiveRegion="polite"
        numberOfLines={besideSample ? undefined : compact ? 2 : 1}
        style={s.name}
      >
        {progress.done
          ? "Все элементы получились!"
          : `${target?.label} · ${progress.completed + 1} из ${progress.total}`}
      </Text>
      {trace!.stages.length > 1 && !progress.done && (
        <Text style={s.sheetCount}>
          лист {progress.stage + 1} из {trace!.stages.length}
        </Text>
      )}
    </View>
  );
  const guideBelow = (
    <>
      {/* Everything that changes from line to line sits under the sheet:
            above it, a hint growing by a line pushed the sheet under the finger. */}
      {target && (
        <View
          testID="drawing-direction-hint"
          style={{
            marginTop: CELL,
            padding: CELL / 2,
            borderRadius: 4,
            backgroundColor: "#e8eef9",
          }}
        >
          <Text
            style={{
              fontFamily: f.bold,
              color: directionColor,
              fontSize: 15,
              lineHeight: CELL,
            }}
          >
            {target.dot
              ? "Коснись кружка, чтобы поставить точку. Вести пальцем не нужно."
              : closed
                ? "Начни в любом месте контура. Обведи фигуру целиком и вернись к началу. Можно вести в любую сторону."
                : target.bidirectional
                  ? /ствол/i.test(target.label)
                    ? "Веди ствол по пунктиру вверх или вниз."
                    : "Начни с любого конца. Веди по пунктиру."
                  : "Начни с яркой точки. Веди по пунктиру туда, куда смотрят синие стрелки."}
          </Text>
        </View>
      )}
      {error !== "" && (
        <View style={{ marginTop: CELL }}>
          <RetryNote>{error}</RetryNote>
        </View>
      )}
    </>
  );
  // Beside a sample on a laptop the name and the hint go under the sample,
  // and the sheet takes their rows.
  const aside = useAside(
    <>
      {name}
      {guideBelow}
    </>,
    [
      progress?.completed,
      progress?.stage,
      progress?.done,
      target?.label,
      closed,
      error,
    ].join("|"),
  );
  return (
    <View>
      {progress && strokes.length > progress.accepted.length && (
        <Text
          accessibilityRole="alert"
          style={{ fontFamily: f.regular, color: c.red, lineHeight: CELL }}
        >
          Образец обновлён. Этот рисунок нужно выполнить заново; остальные
          ответы сохранены.
        </Text>
      )}
      {/* What to draw, then the pencils with the button that takes a
          stroke back, then the sheet. The count «1 из 23» says how far along
          the child is; a bar for the same only drew a stray line. */}
      {!aside && name}
      <View style={s.tools}>
        {DRAWING_COLORS.map((v, i) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={`Цвет: ${["чёрный", "красный", "синий"][i]}`}
            accessibilityState={{ selected: color === v }}
            onPress={() => setChosenColor(v)}
            // Two cells for the finger, the pencil's dot a little inside them.
            style={s.pencil}
          >
            <View
              style={[
                s.pencilDot,
                {
                  backgroundColor: v,
                  borderColor: color === v ? "#2b4ba8" : c.card,
                },
              ]}
            />
          </Pressable>
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
      <Rows>
        <View
          ref={sheetBox}
          onLayout={(e) => {
            setContainerWidth(e.nativeEvent.layout.width);
            sheetBox.current?.measureInWindow((_x, y) =>
              setSheetTop((old) =>
                old !== null && Math.abs(old - y) < 4 ? old : y,
              ),
            );
          }}
          style={{ width: "100%" }}
        >
          <ScrollView
            ref={scrollRef}
            horizontal
            scrollEnabled={scrollable && !drawingNow}
            showsHorizontalScrollIndicator={scrollable}
            canCancelContentTouches={false}
            contentContainerStyle={{
              width: Math.max(width, containerWidth),
              justifyContent: "center",
            }}
            style={{ width: "100%" }}
          >
            <View
              ref={fieldRef}
              accessibilityLabel="Поле для рисования"
              style={[
                {
                  width,
                  height,
                  borderWidth: 1,
                  borderColor: "#94b8b5",
                  borderRadius: 4,
                  overflow: "hidden",
                  backgroundColor: "#fffef9",
                },
                Platform.OS === "web"
                  ? ({ touchAction: "none" } as any)
                  : undefined,
              ]}
              onStartShouldSetResponder={() =>
                (progress?.completed ?? strokes.length) < 100 && !progress?.done
              }
              onMoveShouldSetResponder={() =>
                (progress?.completed ?? strokes.length) < 100 && !progress?.done
              }
              onResponderGrant={(e) => {
                setDrawing(true);
                // Keep feedback in place while drawing: removing it can clamp the
                // parent scroll position and move the notebook under the finger.
                const p = coords(e);
                active.current = {
                  color,
                  points: [p, { x: Math.min(1, p.x + 0.001), y: p.y }],
                  cellPx: cellSize,
                };
                setDraft(active.current);
              }}
              onResponderMove={(e) => {
                if (!active.current || active.current.points.length >= 1000)
                  return;
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
                setDrawing(false);
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
                      stroke="#b9c8de"
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
                      stroke="#b9c8de"
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
                  {target && !target.dot && !closed && (
                    <>
                      <Circle
                        cx={target.points.at(-1)!.x * width}
                        cy={target.points.at(-1)!.y * height}
                        r={4}
                        fill={target.bidirectional ? target.color : c.paper}
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
                      stroke={
                        error && !active.current && i === visible.length
                          ? c.retry
                          : drawingColor(s.color)
                      }
                      strokeWidth={3}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {(!closed && !active.current ? arrows : []).map(
                    (arrow, i) => {
                      const { tip, tail, left, right } = traceArrowGeometry(
                        arrow,
                        cellSize,
                      );
                      const path = `M ${tail.x} ${tail.y} L ${tip.x} ${tip.y} M ${left.x} ${left.y} L ${tip.x} ${tip.y} L ${right.x} ${right.y}`;
                      return (
                        <Path
                          key={`direction-${i}`}
                          testID="drawing-direction-arrow"
                          d={path}
                          stroke={directionColor}
                          strokeWidth={1.5}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      );
                    },
                  )}
                </Svg>
              </View>
            </View>
          </ScrollView>
        </View>
      </Rows>
      {!aside && guideBelow}
    </View>
  );
}
/** The nearest ancestor that scrolls vertically: the lesson's scroll pane. */
function verticalScrollPane(node: HTMLElement): HTMLElement | null {
  for (let el = node.parentElement; el; el = el.parentElement)
    if (
      el.scrollHeight > el.clientHeight + 1 &&
      /auto|scroll/.test(getComputedStyle(el).overflowY)
    )
      return el;
  return null;
}
const s = StyleSheet.create({
  // A row for the name of the line (two on a phone, where it may wrap).
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: CELL,
  },
  name: {
    flex: 1,
    fontFamily: f.bold,
    color: c.pen,
    fontSize: 17,
    lineHeight: CELL,
  },
  sheetCount: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 13,
    lineHeight: CELL,
  },
  // The pencils and the button: two cells, half a cell of air above and
  // below, so neither the name above nor the sheet below touches them.
  tools: {
    flexDirection: "row",
    alignItems: "center",
    height: CELL * 3,
    paddingVertical: CELL / 2,
  },
  pencil: {
    width: CELL * 2,
    height: CELL * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pencilDot: { width: 44, height: 44, borderRadius: 22, borderWidth: 4 },
});
