import React from "react";
import { View, Image, Text } from "react-native";
import Svg, {
  Line,
  Path,
  Rect,
  Circle,
  Text as SvgText,
} from "react-native-svg";
import type { Point, TraceTarget } from "../content/types";
import { shapeDemoPoint } from "../lib/coachGeometry";
import { assets } from "../content/assets";
export type DemoSurface =
  | { kind: "image"; imageId: string }
  | { kind: "trace"; columns: number; rows: number; targets: TraceTarget[] }
  | { kind: "place"; token: "circle" | "stick" | "square"; slots?: Point[] }
  | {
      kind: "shape";
      vertices: Point[];
      edges: [number, number][];
      activeEdge?: number;
    }
  | { kind: "cards"; value?: number; targetIndex?: 0 | 1 }
  | { kind: "answer"; value: number }
  | {
      kind: "token";
      token: "circle" | "stick" | "square" | "card";
      value?: number;
    };
export function CoachSurface({
  surface,
  width,
  height,
}: {
  surface: DemoSurface;
  width: number;
  height: number;
}) {
  if (surface.kind === "image")
    return (
      <Image
        source={assets[surface.imageId].source}
        style={{ width, height }}
        resizeMode="stretch"
      />
    );
  const point = (p: Point) =>
    surface.kind === "shape"
      ? shapeDemoPoint(p, width, height)
      : { x: p.x * width, y: p.y * height };
  return (
    <View
      style={{ width, height, backgroundColor: "#fffdf8", borderRadius: 12 }}
    >
      <Svg width={width} height={height}>
        {surface.kind === "answer" &&
          Array.from({ length: 11 }, (_, value) => {
            const x = (((value % 6) + 0.5) * width) / 6,
              y = ((Math.floor(value / 6) + 0.5) * height) / 2;
            const size = Math.min(52, width / 6 - 6, height / 2 - 12);
            return (
              <React.Fragment key={value}>
                <Rect
                  x={x - size / 2}
                  y={y - size / 2}
                  width={size}
                  height={size}
                  rx={10}
                  fill="#fff"
                  stroke="#71938d"
                  strokeWidth={2}
                />
                <SvgText
                  x={x}
                  y={y + 9}
                  textAnchor="middle"
                  fontSize={26}
                  fontWeight="bold"
                  fill="#23594e"
                >
                  {value}
                </SvgText>
              </React.Fragment>
            );
          })}
        {surface.kind === "token" &&
          (surface.token === "circle" ? (
            <Circle cx={width / 2} cy={height / 2} r={18} fill="#1565c0" />
          ) : (
            <Rect
              x={width / 2 - (surface.token === "stick" ? 4 : 18)}
              y={height / 2 - 24}
              width={surface.token === "stick" ? 8 : 36}
              height={48}
              rx={4}
              fill={surface.token === "stick" ? "#bb8052" : "#1565c0"}
            />
          ))}
        {surface.kind === "token" && surface.value !== undefined && (
          <SvgText
            x={width / 2}
            y={height / 2 + 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={24}
          >
            {surface.value}
          </SvgText>
        )}
        {surface.kind === "trace" && (
          <>
            {Array.from({ length: surface.columns + 1 }, (_, i) => (
              <Line
                key={`x${i}`}
                x1={(i * width) / surface.columns}
                x2={(i * width) / surface.columns}
                y1={0}
                y2={height}
                stroke="#aad5d6"
                strokeWidth={0.8}
              />
            ))}
            {Array.from({ length: surface.rows + 1 }, (_, i) => (
              <Line
                key={`y${i}`}
                x1={0}
                x2={width}
                y1={(i * height) / surface.rows}
                y2={(i * height) / surface.rows}
                stroke="#aad5d6"
                strokeWidth={0.8}
              />
            ))}
            {surface.targets.map((t, i) =>
              t.dot ? (
                <Circle
                  key={i}
                  cx={t.points[0].x * width}
                  cy={t.points[0].y * height}
                  r={3}
                  fill={t.color}
                />
              ) : (
                <Path
                  key={i}
                  d={t.points
                    .map(
                      (p, i) =>
                        `${i ? "L" : "M"}${p.x * width},${p.y * height}`,
                    )
                    .join(" ")}
                  stroke={t.color}
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  fill="none"
                  opacity={0.55}
                />
              ),
            )}
          </>
        )}
        {(surface.kind === "place" || surface.kind === "cards") && (
          <>
            <Rect
              x={8}
              y={8}
              width={width - 16}
              height={height * 0.55}
              rx={12}
              fill="#e5f0e8"
              stroke="#71938d"
              strokeDasharray="5 5"
            />
            <Rect
              x={8}
              y={height * 0.68}
              width={width - 16}
              height={height * 0.3}
              rx={12}
              fill="#f1e5cf"
            />
          </>
        )}
        {surface.kind === "place" &&
          surface.slots?.map((p, i) => {
            const x = 8 + p.x * (width - 16),
              y = 8 + p.y * height * 0.55;
            return surface.token === "circle" ? (
              <Circle
                key={i}
                cx={x}
                cy={y}
                r={15}
                stroke="#71938d"
                fill="none"
                strokeDasharray="3 3"
              />
            ) : (
              <Rect
                key={i}
                x={x - (surface.token === "stick" ? 4 : 17)}
                y={y - 17}
                width={surface.token === "stick" ? 8 : 34}
                height={34}
                rx={3}
                stroke="#71938d"
                fill="none"
                strokeDasharray="3 3"
              />
            );
          })}
        {surface.kind === "cards" &&
          [0.4, 0.6].map((x, i) => (
            <Rect
              key={i}
              x={x * width - 20}
              y={height * 0.12}
              width={40}
              height={height * 0.28}
              rx={6}
              stroke="#23594e"
              strokeDasharray="4 4"
              fill="#fff"
            />
          ))}
        {surface.kind === "shape" &&
          surface.edges.map(([a, b], i) => (
            <Line
              key={i}
              x1={point(surface.vertices[a]).x}
              y1={point(surface.vertices[a]).y}
              x2={point(surface.vertices[b]).x}
              y2={point(surface.vertices[b]).y}
              stroke="#71938d"
              strokeWidth={3}
              strokeDasharray="5 5"
            />
          ))}
      </Svg>
    </View>
  );
}
