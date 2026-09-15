import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import type { PracticalState, PracticalStep } from "../content/types";
import { practicalShape, practicalTrace } from "../lib/practical";
import { drawingColor } from "../lib/tracing";
import { colors as c, fonts as f } from "../theme";

/** The child's saved work stays visible while they answer its questions. */
export function PracticalPreview({
  step,
  state,
}: {
  step: PracticalStep;
  state: PracticalState;
}) {
  const [availableWidth, setAvailableWidth] = useState(300);
  let content: React.ReactNode;
  if (step.mode === "draw") {
    const { columns, rows } = practicalTrace(step, state);
    const width = columns * 40,
      height = rows * 40;
    content = (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View
          style={{
            width: columns > 16 ? width : Math.min(width, availableWidth),
            aspectRatio: columns / rows,
          }}
        >
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
          >
            {Array.from({ length: Math.floor(columns) + 1 }, (_, i) => (
              <Line
                key={`v${i}`}
                x1={i * 40}
                x2={i * 40}
                y1={0}
                y2={height}
                stroke={c.line}
                strokeWidth={1}
              />
            ))}
            {Array.from({ length: Math.floor(rows) + 1 }, (_, i) => (
              <Line
                key={`h${i}`}
                x1={0}
                x2={width}
                y1={i * 40}
                y2={i * 40}
                stroke={c.line}
                strokeWidth={1}
              />
            ))}
            {(state.strokes ?? []).map((stroke, i) =>
              stroke.points.length === 1 ? (
                <Circle
                  key={i}
                  cx={stroke.points[0].x * width}
                  cy={stroke.points[0].y * height}
                  r={2}
                  fill={drawingColor(stroke.color)}
                />
              ) : (
                <Path
                  key={i}
                  d={stroke.points
                    .map(
                      (p, j) =>
                        `${j ? "L" : "M"} ${p.x * width} ${p.y * height}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={drawingColor(stroke.color)}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ),
            )}
          </Svg>
        </View>
      </ScrollView>
    );
  } else if (step.mode === "construct") {
    const { vertices } = practicalShape(step);
    content = (
      <View style={{ width: "100%", maxWidth: 360, aspectRatio: 1 }}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 320 320"
          preserveAspectRatio="none"
        >
          {[...new Set(state.edges ?? [])].map((edge) => {
            const [a, b] = edge.split("-").map(Number),
              p = vertices[a],
              q = vertices[b];
            return p && q ? (
              <Line
                key={edge}
                x1={p.x * 320}
                y1={p.y * 320}
                x2={q.x * 320}
                y2={q.y * 320}
                stroke="#bb8052"
                strokeWidth={6}
                strokeLinecap="round"
              />
            ) : null;
          })}
        </Svg>
      </View>
    );
  } else if (step.mode === "cards") {
    content = (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(state.counts ?? []).map((digit, i) => (
            <View
              key={i}
              style={{
                width: 44,
                height: 56,
                borderWidth: 1,
                borderColor: c.line,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: c.paper,
              }}
            >
              <Text style={{ fontFamily: f.bold, fontSize: 28, color: c.ink }}>
                {digit >= 0 ? digit : "□"}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  } else {
    const sideBySide =
      step.groupLabels?.[0] === "Слева" && step.groupLabels?.[1] === "Справа";
    content = (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ flexDirection: sideBySide ? "row" : "column", gap: 20 }}>
          {(state.counts ?? []).map((count, group) => {
            const value = step.groupValues?.[group] ?? step.tokenValue ?? 1;
            return (
              <View key={group} style={{ gap: 8 }}>
                <Text style={{ fontFamily: f.bold, color: c.ink }}>
                  {step.groupLabels?.[group] ??
                    `${/ряд/.test(step.instruction) ? "Ряд" : "Группа"} ${group + 1}`}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, minHeight: 44 }}>
                  {Array.from(
                    { length: Math.max(0, Math.floor(count)) },
                    (_, i) => (
                      <View
                        key={i}
                        testID="practical-preview-token"
                        style={{
                          width: 32,
                          height: 44,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <View
                          style={{
                            width: step.token === "stick" ? 8 : 28,
                            height: step.token === "stick" ? 40 : 28,
                            borderRadius:
                              step.token === "circle" || !step.token ? 16 : 3,
                            backgroundColor:
                              step.token === "stick" ? "#bb8052" : "#1565c0",
                          }}
                        />
                        {value > 1 && (
                          <Text
                            style={{
                              position: "absolute",
                              fontFamily: f.bold,
                              fontSize: 15,
                              color: c.ink,
                              backgroundColor: c.paper,
                              borderRadius: 4,
                              padding: 2,
                            }}
                          >
                            {value}
                          </Text>
                        )}
                      </View>
                    ),
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }
  return (
    <View
      testID={`practical-result-${step.id}`}
      onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}
      style={{ gap: 8 }}
    >
      <Text style={{ fontFamily: f.bold, color: c.ink }}>Твоя работа</Text>
      {content}
    </View>
  );
}
