import React from "react";
import { View, Text } from "react-native";
import { colors as c, fonts as f } from "../theme";
import { exampleGroups, exampleSelected } from "../lib/teachingExample";
import {
  compositionLayout,
  partPalette,
  type PartColor,
} from "../lib/compositionLayout";
export type ExampleData = {
  kind: string;
  values: number[];
  expression?: string;
  active?: number;
  label?: string;
  labels?: string[];
  colors?: [PartColor, PartColor];
  token?: "square" | "circle" | "stick";
  pattern?: [number, number][];
};
/** A worked example is separate from the task, so watching never fills its answer. */
export function CoachExample({ example }: { example: ExampleData }) {
  const { kind, values, active } = example;
  const items =
    example.labels ??
    (example.expression ? example.expression.split(/\s+/) : values.map(String));
  const counting = ["count", "groups", "compare"].includes(kind);
  const groups = exampleGroups(kind, values, example.expression);
  const pattern = example.pattern
    ? compositionLayout(
        220,
        values.reduce((a, b) => a + b, 0),
        example.pattern,
      )
    : undefined;
  return (
    <View
      testID="coach-example"
      style={{ backgroundColor: c.wash, borderRadius: 6, padding: 10, gap: 8 }}
    >
      <Text style={{ fontFamily: f.bold, color: c.pen, fontSize: 13 }}>
        {example.label && example.label !== "Пример" ? example.label : "Пример"}
      </Text>
      {kind === "compositionRow" && example.colors && (
        <View
          testID="coach-composition-row"
          style={
            pattern
              ? { width: 220, height: 106, alignSelf: "center" }
              : { flexDirection: "row", justifyContent: "center" }
          }
        >
          {values.flatMap((count, group) =>
            Array.from({ length: count }, (_, index) => (
              <View
                key={`${group}:${index}`}
                style={{
                  ...(pattern
                    ? {
                        position: "absolute",
                        left:
                          pattern.center(index + (group ? values[0] : 0)).x -
                          pattern.cell / 2,
                        top:
                          pattern.center(index + (group ? values[0] : 0)).y -
                          pattern.cell / 2,
                      }
                    : {}),
                  width: pattern?.cell ?? 22,
                  height: pattern?.cell ?? 26,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width:
                      example.token === "stick" ? 5 : (pattern?.cell ?? 22),
                    height:
                      example.token === "stick" ? 26 : (pattern?.cell ?? 22),
                    borderRadius: example.token === "circle" ? 11 : 0,
                    backgroundColor: partPalette[example.colors![group]].fill,
                    borderWidth: 1,
                    borderColor: "#1f2433",
                  }}
                />
              </View>
            )),
          )}
        </View>
      )}
      {counting && (
        <View
          style={{ flexDirection: "row", gap: 12, justifyContent: "center" }}
        >
          {groups.map((group, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                maxWidth: 140,
                gap: 5,
                padding: 5,
                borderWidth: 2,
                borderColor:
                  kind !== "count" && active === i ? "#d49717" : "transparent",
                borderRadius: 4,
              }}
            >
              {Array.from({ length: Math.min(12, group.count) }, (_, j) => {
                const selected = exampleSelected(kind, i, j, active),
                  removed = j >= group.count - group.removed;
                return (
                  <View
                    key={j}
                    testID={
                      selected && kind === "count"
                        ? "coach-example-counted"
                        : undefined
                    }
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      backgroundColor: removed
                        ? "#d9e2ef"
                        : i === 1
                          ? "#cc4536"
                          : "#2563a6",
                      borderWidth: selected ? 3 : 0,
                      borderColor: "#f9c448",
                      marginBottom:
                        kind === "count" && active !== undefined ? 20 : 0,
                    }}
                  >
                    {removed && (
                      <Text
                        style={{
                          position: "absolute",
                          left: 2,
                          top: -5,
                          fontSize: 25,
                          color: "#c33",
                        }}
                      >
                        ×
                      </Text>
                    )}
                    {selected && kind === "count" && (
                      <Text
                        style={{
                          position: "absolute",
                          left: -2,
                          top: 17,
                          fontSize: 20,
                        }}
                      >
                        ☝
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
      {kind === "ruler" && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            borderTopWidth: 2,
            borderColor: c.pen,
          }}
        >
          {Array.from(
            { length: Math.min(12, Math.max(...values)) + 1 },
            (_, i) => (
              <View
                key={i}
                style={{
                  alignItems: "center",
                  borderTopWidth: i === active ? 5 : 1,
                  borderColor: i === active ? "#d49717" : c.pen,
                }}
              >
                <Text
                  style={{ fontFamily: f.bold, color: c.ink, paddingTop: 6 }}
                >
                  {i}
                </Text>
              </View>
            ),
          )}
        </View>
      )}
      {kind === "placeValue" && (
        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 16 }}
        >
          {["Десятки", "Единицы"].map((label, i) => (
            <View key={i} style={{ alignItems: "center", gap: 5 }}>
              <Text style={{ fontFamily: f.bold, color: c.pen }}>{label}</Text>
              <View style={{ flexDirection: "row", gap: 3 }}>
                {Array.from({ length: values[i] ?? 0 }, (_, j) => (
                  <View
                    key={j}
                    style={{
                      width: i === 0 ? 12 : 10,
                      height: i === 0 ? 40 : 10,
                      borderRadius: 3,
                      backgroundColor: i === 0 ? "#bb8052" : "#2563a6",
                      borderWidth: i === 0 ? 1 : 0,
                      borderColor: "#714b2a",
                    }}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 4,
        }}
      >
        {items.map((label, i) => (
          <View
            key={i}
            testID={
              !counting && exampleSelected(kind, i, 0, active)
                ? "coach-example-active"
                : undefined
            }
            style={{
              padding: 5,
              minWidth: 26,
              borderWidth: 2,
              borderColor:
                !counting && exampleSelected(kind, i, 0, active)
                  ? "#d49717"
                  : "transparent",
              borderRadius: 4,
              backgroundColor:
                !counting && exampleSelected(kind, i, 0, active)
                  ? "#fff0bd"
                  : undefined,
            }}
          >
            <Text
              style={{
                fontFamily: f.bold,
                fontSize: 20,
                color: c.ink,
                textAlign: "center",
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
