import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import Svg, { Path, Circle, Rect, Text as SvgText } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { Button } from "./Controls";
import { CoachSurface, type DemoSurface } from "./CoachSurface";
import {
  coachCardPosition,
  shapeDemoPoint,
  shapeDemoEdge,
} from "../lib/coachGeometry";
import { assets } from "../content/assets";
import { CoachExample, type ExampleData } from "./CoachExample";
import { colors as c, fonts as f } from "../theme";
import {
  COACH_STORAGE_KEY,
  coachSpotlight,
  clipCoachRect,
  readSeenCoaches,
  type CoachRect,
} from "../lib/gestureCoach";
import { demoDuration, demoFrame, type DemoKind } from "../lib/coachMotion";
import type { Point } from "../content/types";

type Anchor = { ref?: React.RefObject<View | null>; anchor?: string };
export type CoachMotion = {
  kind: DemoKind;
  points: Point[];
  regions?: CoachRect[];
  labels?: string[];
  from?: Anchor;
  to?: Anchor;
  toPoint?: Point;
  surfaceToPoint?: Point;
  token?: "circle" | "stick" | "square" | "card";
  color?: string;
  angle?: number;
  tokenLength?: number;
  tokenLabel?: string;
};
export type CoachTarget = Anchor & {
  text: string;
  surface?: DemoSurface;
  motion?: CoachMotion;
  example?: ExampleData;
};
type Tutorial = {
  family: string;
  targets: CoachTarget[];
  primary?: boolean;
  includeGestures?: boolean;
};
type Active = { id: string; targets: CoachTarget[]; families: string[] };
type Reveal = (target: View) => Promise<void>;
const Context = createContext<{
  register: (id: string, tutorial: Tutorial) => () => void;
  anchor: (id: string, ref: React.RefObject<View | null>) => () => void;
  replay: (id: string) => void;
} | null>(null);
let saveQueue = Promise.resolve();
function remember(families: string[]) {
  saveQueue = saveQueue
    .catch(() => {})
    .then(async () => {
      const old = readSeenCoaches(
        await AsyncStorage.getItem(COACH_STORAGE_KEY),
      );
      await AsyncStorage.setItem(
        COACH_STORAGE_KEY,
        JSON.stringify([...new Set([...old, ...families])]),
      );
    });
  return saveQueue;
}
export function useCoachAnchor(id: string, ref: React.RefObject<View | null>) {
  const register = useContext(Context)?.anchor;
  useEffect(() => register?.(id, ref), [id, ref, register]);
}
export function useGestureCoach(
  family: string,
  targets: CoachTarget[],
  options: { primary?: boolean; includeGestures?: boolean } = {},
) {
  const id = useId(),
    context = useContext(Context),
    latest = useRef(targets);
  latest.current = targets;
  const register = context?.register;
  useEffect(
    () =>
      register?.(id, {
        family,
        primary: options.primary,
        includeGestures: options.includeGestures,
        get targets() {
          return latest.current;
        },
      }),
    [id, family, register, options.primary, options.includeGestures],
  );
  return () => context?.replay(id);
}
export function CoachButton({
  onPress,
  label = "Покажи подсказку",
}: {
  onPress: () => void;
  label?: string;
}) {
  return (
    <View style={{ alignSelf: "flex-start" }}>
      <Button secondary small onPress={onPress}>
        {label}
      </Button>
    </View>
  );
}
function measure(view: View): Promise<CoachRect | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 1000);
    view.measureInWindow((x, y, width, height) => {
      clearTimeout(timeout);
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  });
}
function webScrollPane(target: View): HTMLElement | null {
  let pane = (target as unknown as HTMLElement).parentElement;
  while (
    pane &&
    !(
      pane.scrollHeight > pane.clientHeight &&
      /auto|scroll/.test(getComputedStyle(pane).overflowY)
    )
  )
    pane = pane.parentElement;
  return pane;
}
export function GestureCoachProvider({
  children,
  revealTarget,
  onActiveChange,
}: {
  children: React.ReactNode;
  revealTarget?: Reveal;
  onActiveChange?: (active: boolean) => void;
}) {
  const { width, height } = useWindowDimensions();
  const entries = useRef(new Map<string, Tutorial>()),
    anchors = useRef(new Map<string, React.RefObject<View | null>>());
  const [revision, setRevision] = useState(0),
    [seen, setSeen] = useState<string[] | null>(null),
    [active, setActive] = useState<Active | null>(null),
    [step, setStep] = useState(0);
  const [resolvedStep, setResolvedStep] = useState(0),
    [measuring, setMeasuring] = useState(false);
  const [targetRect, setRect] = useState<CoachRect | null>(null),
    [targetViewport, setTargetViewport] = useState<CoachRect | null>(null),
    [motionPoints, setMotionPoints] = useState<Point[]>([]),
    [cardHeight, setCardHeight] = useState(240),
    [missing, setMissing] = useState(false);
  const [elapsed, setElapsed] = useState(0),
    [paused, setPaused] = useState(false),
    [replayNonce, setReplayNonce] = useState(0),
    [positionRevision, setPositionRevision] = useState(0);
  const measuredPlayback = useRef<string | null>(null);
  const interrupted = useRef(false),
    showing = useRef(false),
    announced = useRef(false);
  const isActive = !!active;
  useEffect(() => {
    onActiveChange?.(isActive);
    return () => onActiveChange?.(false);
  }, [isActive, onActiveChange]);
  // Keep the previous complete frame until the next target has been measured.
  const current = active?.targets[resolvedStep],
    motion = current?.motion;
  const landscape = height < 600 && width > height;
  const cardWidth = Math.min(
    landscape ? width * 0.46 : width - 24,
    Platform.OS === "web" && width >= 1000 ? 320 : 480,
  );
  const cardLimit = landscape ? height : height - cardHeight - 30;
  // A visible fingertip does not imply that the pictured object is fully visible.
  // Fit the entire image, including steps with no animated gesture.
  const imageClipped =
    current?.surface?.kind === "image" &&
    targetRect &&
    (targetRect.x < 12 ||
      targetRect.y < 12 ||
      targetRect.x + targetRect.width > width - 12 ||
      targetRect.y + targetRect.height > cardLimit - 8);
  const needsSurface =
    Platform.OS !== "web" &&
    !!current?.surface &&
    (landscape ||
      imageClipped ||
      motionPoints.some(
        (p) => p.y < 75 || p.y > cardLimit - 40 || p.x < 10 || p.x > width - 40,
      ));
  let surfaceBox: CoachRect = {
    x: 12,
    y: landscape ? 38 : 84,
    width: landscape ? width - cardWidth - 36 : width - 24,
    height: Math.max(90, landscape ? height - 66 : cardLimit - 100),
  };
  if (
    current?.surface?.kind === "image" ||
    current?.surface?.kind === "trace"
  ) {
    const surface = current.surface;
    const aspect =
      surface.kind === "image"
        ? assets[surface.imageId].width / assets[surface.imageId].height
        : surface.columns / surface.rows;
    const w = Math.min(surfaceBox.width, surfaceBox.height * aspect),
      h = w / aspect;
    surfaceBox = {
      x: surfaceBox.x + (surfaceBox.width - w) / 2,
      y: surfaceBox.y + (surfaceBox.height - h) / 2,
      width: w,
      height: h,
    };
  }
  const surface = current?.surface;
  let normalized = motion?.points ?? [];
  if (needsSurface && motion?.kind === "drag") {
    const to =
      surface?.kind === "shape" && motion.surfaceToPoint
        ? (() => {
            const p = shapeDemoPoint(
              motion.surfaceToPoint!,
              surfaceBox.width,
              surfaceBox.height,
            );
            return { x: p.x / surfaceBox.width, y: p.y / surfaceBox.height };
          })()
        : surface?.kind === "place" && motion.surfaceToPoint
          ? {
              x:
                (8 + motion.surfaceToPoint.x * (surfaceBox.width - 16)) /
                surfaceBox.width,
              y:
                (8 + motion.surfaceToPoint.y * surfaceBox.height * 0.55) /
                surfaceBox.height,
            }
          : {
              x:
                surface?.kind === "cards"
                  ? surface.targetIndex === 1
                    ? 0.6
                    : 0.4
                  : 0.5,
              y: 0.26,
            };
    normalized = [{ x: 0.5, y: 0.83 }, to];
  }
  if (needsSurface && surface?.kind === "answer")
    normalized = [
      {
        x: ((surface.value % 6) + 0.5) / 6,
        y: (Math.floor(surface.value / 6) + 0.5) / 2,
      },
    ];
  const shapeEdge =
    needsSurface &&
    surface?.kind === "shape" &&
    surface.activeEdge !== undefined
      ? surface.edges[surface.activeEdge]
      : undefined;
  const stickGeometry =
    shapeEdge && surface?.kind === "shape"
      ? shapeDemoEdge(
          surface.vertices[shapeEdge[0]],
          surface.vertices[shapeEdge[1]],
          surfaceBox.width,
          surfaceBox.height,
        )
      : null;
  const stickLength = stickGeometry?.length ?? motion?.tokenLength ?? 44;
  const stickAngle = stickGeometry?.angle ?? motion?.angle ?? 90;
  const points = needsSurface
    ? normalized.map((p) => ({
        x: surfaceBox.x + p.x * surfaceBox.width,
        y: surfaceBox.y + p.y * surfaceBox.height,
      }))
    : motionPoints;
  const duration = motion ? demoDuration(motion.kind, points) : 0;
  const frame =
    motion && targetRect ? demoFrame(motion.kind, points, elapsed) : null;
  const done = !motion || !!frame?.done;
  const register = useCallback((id: string, tutorial: Tutorial) => {
    entries.current.set(id, tutorial);
    setRevision((v) => v + 1);
    return () => {
      entries.current.delete(id);
      setRevision((v) => v + 1);
    };
  }, []);
  const anchor = useCallback(
    (id: string, ref: React.RefObject<View | null>) => {
      anchors.current.set(id, ref);
      return () => {
        if (anchors.current.get(id) === ref) anchors.current.delete(id);
      };
    },
    [],
  );
  const resolve = (target: Anchor) =>
    target.ref?.current ??
    (target.anchor ? anchors.current.get(target.anchor)?.current : null);
  useEffect(() => {
    let cancelled = false;
    saveQueue
      .catch(() => {})
      .then(() => AsyncStorage.getItem(COACH_STORAGE_KEY))
      .then((raw) => {
        if (!cancelled) setSeen(readSeenCoaches(raw));
      })
      .catch(() => {
        if (!cancelled) setSeen([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const replay = useCallback((id: string) => {
    const tutorial = entries.current.get(id);
    if (!tutorial) return;
    const gestures = tutorial.includeGestures
      ? [...entries.current].filter(([, t]) => !t.primary).map(([, t]) => t)
      : [];
    showing.current = true;
    interrupted.current = false;
    setStep(0);
    setResolvedStep(0);
    setMeasuring(true);
    setRect(null);
    setElapsed(0);
    setPaused(false);
    setMissing(false);
    setActive({
      id,
      targets: [...tutorial.targets, ...gestures.flatMap((t) => t.targets)],
      families: [tutorial.family, ...gestures.map((t) => t.family)],
    });
  }, []);
  useEffect(() => {
    if (seen === null || active || showing.current) return;
    const candidates = [...entries.current].sort(
      (a, b) => Number(!!b[1].primary) - Number(!!a[1].primary),
    );
    const next = candidates.find(([, t]) => !seen.includes(t.family));
    if (next) replay(next[0]);
  }, [revision, seen, active, replay]);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const playback = JSON.stringify([active.id, step, replayNonce]);
    setMeasuring(true);
    announced.current = false;
    const timer = setTimeout(
      async () => {
        const target = resolve(active.targets[step]);
        if (!target) {
          if (!cancelled) {
            interrupted.current = true;
            setMissing(true);
            setResolvedStep(step);
            setMeasuring(false);
          }
          return;
        }
        // Browser onboarding is an overlay: never scroll or reflow the lesson.
        if (Platform.OS !== "web" && revealTarget) {
          let timeout: ReturnType<typeof setTimeout> | undefined;
          await Promise.race([
            revealTarget(target),
            new Promise<void>((resolve) => {
              timeout = setTimeout(resolve, 1000);
            }),
          ]);
          clearTimeout(timeout);
        }
        const box = await measure(target);
        if (cancelled) return;
        if (!box) {
          interrupted.current = true;
          setMissing(true);
          setResolvedStep(step);
          setMeasuring(false);
          return;
        }
        const movement = active.targets[step].motion;
        let points = (movement?.points ?? []).map((p) => ({
          x: box.x + p.x * box.width,
          y: box.y + p.y * box.height,
        }));
        if (movement?.from) {
          const from = resolve(movement.from);
          const start = from ? await measure(from) : null;
          if (cancelled) return;
          if (start)
            points = [
              { x: start.x + start.width / 2, y: start.y + start.height / 2 },
            ];
          else {
            interrupted.current = true;
            setMissing(true);
            setResolvedStep(step);
            setMeasuring(false);
            return;
          }
        }
        if (movement?.to) {
          const to = resolve(movement.to);
          const end = to ? await measure(to) : null;
          if (cancelled) return;
          if (end) {
            const p = movement.toPoint ?? { x: 0.5, y: 0.5 };
            points = [
              ...points,
              { x: end.x + p.x * end.width, y: end.y + p.y * end.height },
            ];
          } else {
            interrupted.current = true;
            setMissing(true);
            setResolvedStep(step);
            setMeasuring(false);
            return;
          }
        }
        setMotionPoints(points);
        setRect(box);
        if (Platform.OS === "web") {
          const pane = webScrollPane(target)?.getBoundingClientRect();
          setTargetViewport(
            pane
              ? { x: pane.x, y: pane.y, width: pane.width, height: pane.height }
              : null,
          );
        }
        setResolvedStep(step);
        setMissing(false);
        if (measuredPlayback.current !== playback) {
          setElapsed(0);
          setPaused(false);
          measuredPlayback.current = playback;
        }
        setMeasuring(false);
      },
      Platform.OS === "web" ? 0 : 180,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
      void Speech.stop();
    };
  }, [
    active,
    step,
    width,
    height,
    revealTarget,
    replayNonce,
    positionRevision,
  ]);
  useEffect(() => {
    if (
      !motion ||
      !targetRect ||
      measuring ||
      paused ||
      missing ||
      elapsed >= duration
    )
      return;
    const timer = setInterval(
      () => setElapsed((t) => Math.min(duration, t + 50)),
      50,
    );
    return () => clearInterval(timer);
  }, [
    motion,
    targetRect,
    measuring,
    paused,
    missing,
    duration,
    elapsed >= duration,
  ]);
  let baseRect = missing ? null : needsSurface ? surfaceBox : targetRect;
  let highlight = baseRect;
  if (baseRect && motion?.regions && frame) {
    const region = motion.regions[frame.index];
    if (region)
      highlight = {
        x: baseRect.x + region.x * baseRect.width,
        y: baseRect.y + region.y * baseRect.height,
        width: region.width * baseRect.width,
        height: region.height * baseRect.height,
      };
  }
  const web = Platform.OS === "web";
  const floatingCard = coachCardPosition(
    motion && frame && !motion.regions
      ? { x: frame.point.x - 24, y: frame.point.y - 24, width: 48, height: 48 }
      : highlight,
    { width, height },
    { width: cardWidth, height: cardHeight },
  );
  const viewport = targetViewport ?? { x: 0, y: 0, width, height };
  const rawHole = highlight
    ? coachSpotlight(
        highlight,
        !web && landscape ? width - cardWidth - 16 : width,
        height,
        web || landscape ? 12 : cardHeight + 30,
      )
    : null;
  const hole = web ? clipCoachRect(rawHole, viewport) : rawHole;
  const finger = frame?.point;
  const cardTop = web || landscape ? height : height - cardHeight - 12;
  const fingerUnderCard =
    web &&
    !!finger &&
    finger.x >= floatingCard.x &&
    finger.x <= floatingCard.x + cardWidth &&
    finger.y >= floatingCard.y &&
    finger.y <= floatingCard.y + cardHeight;
  const fingerVisible =
    !!finger &&
    finger.x >= (web ? viewport.x : 0) &&
    finger.x <=
      (web
        ? Math.min(width, viewport.x + viewport.width)
        : landscape
          ? width - cardWidth - 24
          : width) &&
    finger.y >= Math.max(10, web ? viewport.y : 0) &&
    finger.y <
      Math.min(cardTop - 6, web ? viewport.y + viewport.height : height) &&
    !fingerUnderCard &&
    !missing;
  const offscreen =
    web &&
    !!targetRect &&
    !missing &&
    (!hole ||
      (motion
        ? !!finger && !fingerVisible
        : !!highlight &&
          (highlight.y < viewport.y ||
            highlight.y + highlight.height > viewport.y + viewport.height)));
  function close(completed: boolean) {
    if (!active) return;
    void Speech.stop();
    setSeen((old) => [...new Set([...(old ?? []), ...active.families])]);
    if (completed && !interrupted.current)
      void remember(active.families).catch(() => {});
    showing.current = false;
    setActive(null);
    setRect(null);
  }
  const trail =
    frame?.trail.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ") ?? "";
  return (
    <Context.Provider value={{ register, anchor, replay }}>
      {children}
      <Modal
        visible={!!active}
        transparent
        animationType="none"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => close(false)}
      >
        <View
          testID="gesture-coach"
          accessibilityViewIsModal
          accessibilityState={{ busy: measuring }}
          style={{ flex: 1 }}
        >
          <View
            style={{ position: "absolute", inset: 0 }}
            onStartShouldSetResponder={() => true}
          />
          <View
            testID={
              motion && targetRect ? `coach-motion-${motion.kind}` : undefined
            }
            pointerEvents="none"
            style={{ position: "absolute", inset: 0 }}
          >
            {needsSurface && surface && (
              <View
                testID="coach-demo-surface"
                style={{
                  position: "absolute",
                  left: surfaceBox.x,
                  top: surfaceBox.y,
                  width: surfaceBox.width,
                  height: surfaceBox.height,
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    inset: -8,
                    borderRadius: 10,
                    backgroundColor: c.paper,
                  }}
                />
                <CoachSurface
                  surface={surface}
                  width={surfaceBox.width}
                  height={surfaceBox.height}
                />
              </View>
            )}
            {hole ? (
              <>
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: hole.y,
                    backgroundColor: "#102426bf",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    top: hole.y + hole.height,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "#102426bf",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    top: hole.y,
                    left: 0,
                    width: hole.x,
                    height: hole.height,
                    backgroundColor: "#102426bf",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    top: hole.y,
                    left: hole.x + hole.width,
                    right: 0,
                    height: hole.height,
                    backgroundColor: "#102426bf",
                  }}
                />
                <View
                  testID="coach-highlight"
                  style={{
                    position: "absolute",
                    left: hole.x,
                    top: hole.y,
                    width: hole.width,
                    height: hole.height,
                    borderWidth: 2,
                    borderColor: "#ffda72",
                    borderRadius: 8,
                  }}
                />
              </>
            ) : (
              <View
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "#102426bf",
                }}
              />
            )}
            {needsSurface && surface && (
              <Text
                style={{
                  position: "absolute",
                  left: surfaceBox.x,
                  top: surfaceBox.y - 24,
                  color: "#fffdf8",
                  fontFamily: f.bold,
                }}
              >
                Подсказка
              </Text>
            )}
            <Svg
              width={width}
              height={Math.max(0, cardTop - 4)}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              {motion?.kind === "trace" && (
                <Path
                  testID="coach-demonstration-line"
                  d={trail}
                  stroke={motion.color ?? "#1565c0"}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              {fingerVisible &&
                motion?.kind === "drag" &&
                (motion.token === "stick" ? (
                  <Rect
                    x={finger!.x - 4}
                    y={finger!.y - stickLength / 2}
                    width={8}
                    height={stickLength}
                    rx={3}
                    fill={motion.color ?? "#bb8052"}
                    transform={`rotate(${stickAngle - 90} ${finger!.x} ${finger!.y})`}
                  />
                ) : motion.token === "square" || motion.token === "card" ? (
                  <Rect
                    x={finger!.x - 14}
                    y={finger!.y - 14}
                    width={28}
                    height={28}
                    rx={4}
                    fill={motion.color ?? "#1565c0"}
                  />
                ) : (
                  <Circle
                    cx={finger!.x}
                    cy={finger!.y}
                    r={14}
                    fill={motion.color ?? "#1565c0"}
                  />
                ))}
              {fingerVisible &&
                motion?.kind === "drag" &&
                motion.tokenLabel && (
                  <SvgText
                    testID="coach-token-label"
                    x={finger!.x}
                    y={finger!.y + 7}
                    fontSize={22}
                    textAnchor="middle"
                    fill="#fff"
                  >
                    {motion.tokenLabel}
                  </SvgText>
                )}
              {fingerVisible && frame?.pressing && (
                <Circle
                  cx={finger!.x}
                  cy={finger!.y}
                  r={10 + (elapsed % 600) / 150}
                  stroke="#ffca55"
                  strokeWidth={2}
                  fill="none"
                  opacity={0.8}
                />
              )}
            </Svg>
            {fingerVisible && (
              <View
                testID="coach-finger"
                style={{
                  position: "absolute",
                  left: finger!.x - 9,
                  top: finger!.y - 3,
                  width: 34,
                  height: 44,
                  opacity: frame?.pressing ? 1 : 0.7,
                }}
              >
                <Svg width={34} height={44} viewBox="0 0 34 44">
                  <Path
                    d="M6 23 L6 6 C6 0 13 0 13 6 L13 18 C14 13 20 14 20 19 C23 15 27 17 27 21 C32 19 33 23 32 29 L29 40 L15 42 C11 37 3 31 2 27 C0 22 3 20 6 23 Z"
                    fill="#ffd17a"
                    stroke="#8e5b21"
                    strokeWidth={1.5}
                  />
                </Svg>
              </View>
            )}
          </View>
          <View
            testID="coach-card"
            onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
            style={{
              position: "absolute",
              bottom: web ? undefined : 12,
              top: web ? floatingCard.y : undefined,
              left: web ? floatingCard.x : undefined,
              alignSelf: web || landscape ? undefined : "center",
              right: !web && landscape ? 10 : undefined,
              width: cardWidth,
              maxHeight:
                !landscape && current?.surface
                  ? Math.max(180, height - 230)
                  : height - 24,
              borderRadius: 18,
              backgroundColor: c.paper,
            }}
          >
            <ScrollView
              contentContainerStyle={{
                padding: height < 500 ? 10 : 14,
                gap: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: f.bold, color: c.green }}>
                  Смотри, как · {resolvedStep + 1}/{active?.targets.length}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Закрыть подсказку"
                  onPress={() => close(false)}
                  style={{
                    width: 44,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 24 }}>×</Text>
                </Pressable>
              </View>
              <Text
                testID="coach-instruction"
                accessibilityLiveRegion="polite"
                style={{
                  fontFamily: f.bold,
                  fontSize: 17,
                  lineHeight: 23,
                  color: c.ink,
                }}
              >
                {missing
                  ? "Не удалось показать этот шаг. Закрой подсказку и открой её ещё раз."
                  : current?.text}
              </Text>
              {current?.example && <CoachExample example={current.example} />}
              {offscreen && (
                <View testID="coach-offscreen-help" style={{ gap: 8 }}>
                  <Text style={{ fontFamily: f.regular, color: c.ink }}>
                    Нужная часть задания сейчас не видна. Нажми, чтобы перейти к
                    ней.
                  </Text>
                  <Button
                    secondary
                    small
                    onPress={() => {
                      const target = current && resolve(current);
                      if (!target) return;
                      // Scrolling is a child's explicit choice, never a step side effect.
                      const element = target as unknown as HTMLElement;
                      const pane = webScrollPane(target);
                      if (finger && pane) {
                        const box = pane.getBoundingClientRect();
                        pane.scrollTop +=
                          finger.y -
                          (Math.max(12, box.top) +
                            Math.min(height - 12, box.bottom)) /
                            2;
                      } else
                        element.scrollIntoView({
                          block: "start",
                          behavior: "instant",
                        });
                      setPositionRevision((v) => v + 1);
                    }}
                  >
                    Показать это место
                  </Button>
                </View>
              )}
              {motion && frame && !missing && (
                <Text
                  testID="coach-demonstration-status"
                  accessibilityLiveRegion="polite"
                  style={{ fontFamily: f.bold, color: c.green }}
                >
                  {motion.kind === "count"
                    ? `${Math.min(frame.index + 1, motion.points.length)} из ${motion.points.length}${motion.labels?.[frame.index] ? ` · ${motion.labels[frame.index]}` : ""}`
                    : motion.kind === "inspect"
                      ? (motion.labels?.[frame.index] ??
                        "Рассмотри выделенный предмет")
                      : done
                        ? "Теперь попробуй сам."
                        : motion.kind === "trace"
                          ? "Ведём по линии…"
                          : motion.kind === "drag"
                            ? elapsed < 450
                              ? "Прижми и держи…"
                              : elapsed < 2250
                                ? "Перенеси, не отпуская…"
                                : "Отпусти на месте."
                            : "Коснись и подними палец."}
                </Text>
              )}
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  justifyContent: "space-between",
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Послушать подсказку"
                  onPress={() => {
                    void Speech.stop();
                    Speech.speak(current?.text ?? "", {
                      language: "ru-RU",
                      rate: 0.85,
                    });
                  }}
                  style={{ padding: 8, minHeight: 40 }}
                >
                  <Text style={{ fontFamily: f.bold, color: c.green }}>
                    Послушать
                  </Text>
                </Pressable>
                {motion && targetRect && !missing && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      done
                        ? "Показать ещё раз"
                        : paused
                          ? "Продолжить показ"
                          : "Пауза"
                    }
                    onPress={() =>
                      done ? setReplayNonce((v) => v + 1) : setPaused((v) => !v)
                    }
                    style={{ padding: 8, minHeight: 40 }}
                  >
                    <Text style={{ fontFamily: f.bold, color: c.green }}>
                      {done ? "Ещё раз" : paused ? "Продолжить показ" : "Пауза"}
                    </Text>
                  </Pressable>
                )}
              </View>
              <Button
                disabled={measuring || (!done && !missing)}
                onPress={() => {
                  void Speech.stop();
                  if (active && step + 1 < active.targets.length) {
                    setStep((v) => v + 1);
                    setMeasuring(true);
                  } else close(!missing);
                }}
              >
                {active && resolvedStep + 1 < active.targets.length
                  ? "Дальше"
                  : "Попробую сам"}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Context.Provider>
  );
}
