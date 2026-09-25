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
import { narrator } from "../lib/narrator";
import { Button } from "./Controls";
import { CoachSurface, type DemoSurface } from "./CoachSurface";
import {
  coachCardPosition,
  mobileCoachLayout,
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
/** The single way into coaching for a task; every block shows exactly one. */
export function CoachButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ alignSelf: "flex-start" }}>
      <Button secondary small onPress={onPress}>
        Как это сделать?
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
  const [active, setActive] = useState<Active | null>(null),
    [step, setStep] = useState(0);
  const [resolvedStep, setResolvedStep] = useState(0),
    [measuring, setMeasuring] = useState(false);
  const [targetRect, setRect] = useState<CoachRect | null>(null),
    [targetViewport, setTargetViewport] = useState<CoachRect | null>(null),
    [motionPoints, setMotionPoints] = useState<Point[]>([]),
    [cardHeight, setCardHeight] = useState<number | null>(null),
    [missing, setMissing] = useState(false);
  // Until onLayout reports the card, layout math uses an estimate and the card stays hidden.
  const cardReady = cardHeight !== null,
    cardBox = cardHeight ?? 240;
  const [mobileLayout, setMobileLayout] = useState<ReturnType<
    typeof mobileCoachLayout
  > | null>(null);
  const [elapsed, setElapsed] = useState(0),
    [paused, setPaused] = useState(false),
    [replayNonce, setReplayNonce] = useState(0),
    [positionRevision, setPositionRevision] = useState(0);
  const measuredPlayback = useRef<string | null>(null);
  const interrupted = useRef(false),
    announced = useRef(false);
  const isActive = !!active;
  useEffect(() => {
    if (isActive) onActiveChange?.(true);
    // On web the modal hands focus back to the opening button only after it has
    // fully closed, which scrolls that button into view; "closed" is reported
    // from onDismiss there so the lesson can be restored afterwards.
    else if (Platform.OS !== "web") onActiveChange?.(false);
    return () => {
      if (Platform.OS !== "web") onActiveChange?.(false);
    };
  }, [isActive, onActiveChange]);
  // Keep the previous complete frame until the next target has been measured.
  const current = active?.targets[resolvedStep],
    motion = current?.motion;
  const landscape = height < 600 && width > height;
  const mobileWeb = Platform.OS === "web" && width < 1000;
  const sideCard = landscape && (!mobileWeb || !!current?.surface || !!motion);
  const cardWidth = Math.min(
    sideCard ? width * 0.46 : width - 24,
    mobileWeb && landscape && !sideCard
      ? width - 24
      : Platform.OS === "web" && width >= 1000
        ? 360
        : 480,
  );
  const mobileCardLimit = sideCard
    ? height - 24
    : Math.min(320, Math.round(height * 0.44));
  const mobileCardHeight = Math.min(cardBox, mobileCardLimit);
  const cardLimit = landscape ? height : height - cardBox - 30;
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
    !!current?.surface &&
    (mobileWeb
      ? !!mobileLayout && !mobileLayout.fits
      : Platform.OS !== "web" &&
        (landscape ||
          imageClipped ||
          motionPoints.some(
            (p) =>
              p.y < 75 || p.y > cardLimit - 40 || p.x < 10 || p.x > width - 40,
          )));
  let surfaceBox: CoachRect = {
    x: 12,
    y: landscape ? 38 : 84,
    width: landscape ? width - cardWidth - 36 : width - 24,
    height: Math.max(90, landscape ? height - 66 : cardLimit - 100),
  };
  if (mobileWeb && mobileLayout) {
    surfaceBox = { ...mobileLayout.space };
    // Leave room for the spotlight border and the fingertip below the drawing.
    surfaceBox = {
      x: surfaceBox.x + 8,
      y: surfaceBox.y + 8,
      width: Math.max(1, surfaceBox.width - 16),
      height: Math.max(1, surfaceBox.height - 48),
    };
  }
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
    return () => {
      entries.current.delete(id);
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
  // Coaching opens only from its button: a child who already knows the gesture
  // is never interrupted, and a solved task is never re-explained.
  const replay = useCallback((id: string) => {
    const tutorial = entries.current.get(id);
    if (!tutorial) return;
    const gestures = tutorial.includeGestures
      ? [...entries.current].filter(([, t]) => !t.primary).map(([, t]) => t)
      : [];
    interrupted.current = false;
    setCardHeight(null);
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
        // Desktop keeps its floating overlay. Phones reveal the target in a
        // reserved area before starting the demonstration.
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
        const measuredBox = await measure(target);
        if (cancelled) return;
        if (!measuredBox) {
          interrupted.current = true;
          setMissing(true);
          setResolvedStep(step);
          setMeasuring(false);
          return;
        }
        let box = measuredBox;
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
        if (mobileWeb) {
          const pane = webScrollPane(target);
          const bounds = pane?.getBoundingClientRect();
          const viewport = bounds
            ? {
                x: Math.max(0, bounds.x),
                y: Math.max(0, bounds.y),
                width: Math.min(width, bounds.width),
                height: Math.min(height, bounds.bottom) - Math.max(0, bounds.y),
              }
            : { x: 0, y: 0, width, height };
          // Protect the whole target and every point of a drag, including the
          // source token outside the destination board.
          // A composite board may span the entire page. With no separate
          // preview, reserve its actual source-to-destination gesture instead.
          const gestureOnly =
            points.length > 0 && !active.targets[step].surface;
          const x = Math.min(
            gestureOnly ? Infinity : box.x,
            ...points.map((p) => p.x - 12),
          );
          const y = Math.min(
            gestureOnly ? Infinity : box.y,
            ...points.map((p) => p.y - 12),
          );
          const focus = {
            x,
            y,
            width:
              Math.max(
                gestureOnly ? -Infinity : box.x + box.width,
                ...points.map((p) => p.x + 26),
              ) - x,
            height:
              Math.max(
                gestureOnly ? -Infinity : box.y + box.height,
                ...points.map((p) => p.y + 42),
              ) - y,
          };
          const layout = mobileCoachLayout(
            focus,
            viewport,
            { width: cardWidth, height: mobileCardHeight },
            {
              top: pane?.scrollTop ?? 0,
              max: pane ? pane.scrollHeight - pane.clientHeight : 0,
            },
          );
          if (pane && (layout.fits || !active.targets[step].surface)) {
            const before = pane.scrollTop;
            pane.scrollTop += layout.scrollDelta;
            const delta = pane.scrollTop - before;
            box = { ...box, y: box.y - delta };
            points = points.map((p) => ({ ...p, y: p.y - delta }));
          }
          setMobileLayout(layout);
        } else setMobileLayout(null);
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
      narrator.stop();
    };
  }, [
    active,
    step,
    width,
    height,
    revealTarget,
    replayNonce,
    positionRevision,
    mobileWeb,
    cardWidth,
    mobileCardHeight,
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
  const floatingCard =
    mobileWeb && mobileLayout
      ? mobileLayout.card
      : coachCardPosition(
          baseRect,
          targetViewport ?? { x: 0, y: 0, width, height },
          { width: cardWidth, height: cardBox },
        );
  const viewport =
    mobileWeb && mobileLayout
      ? mobileLayout.space
      : (targetViewport ?? { x: 0, y: 0, width, height });
  const rawHole = highlight
    ? coachSpotlight(
        highlight,
        !web && landscape ? width - cardWidth - 16 : width,
        height,
        web || landscape ? 12 : cardBox + 30,
      )
    : null;
  const hole = web ? clipCoachRect(rawHole, viewport) : rawHole;
  const finger = frame?.point;
  const cardTop = web || landscape ? height : height - cardBox - 12;
  const fingerUnderCard =
    web &&
    !!finger &&
    finger.x >= floatingCard.x &&
    finger.x <= floatingCard.x + cardWidth &&
    finger.y >= floatingCard.y &&
    finger.y <= floatingCard.y + cardBox;
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
    !needsSurface &&
    (!hole ||
      (motion
        ? !!finger && !fingerVisible
        : !mobileWeb &&
          !!highlight &&
          (highlight.y < viewport.y ||
            highlight.y + highlight.height > viewport.y + viewport.height)));
  function close(completed: boolean) {
    if (!active) return;
    narrator.stop();
    if (completed && !interrupted.current)
      void remember(active.families).catch(() => {});
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
        onDismiss={() => onActiveChange?.(false)}
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
                    borderRadius: 4,
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
                    backgroundColor: "#1f2433bf",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    top: hole.y + hole.height,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "#1f2433bf",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    top: hole.y,
                    left: 0,
                    width: hole.x,
                    height: hole.height,
                    backgroundColor: "#1f2433bf",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    top: hole.y,
                    left: hole.x + hole.width,
                    right: 0,
                    height: hole.height,
                    backgroundColor: "#1f2433bf",
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
                    borderRadius: 4,
                  }}
                />
              </>
            ) : (
              <View
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "#1f2433bf",
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
              // The first frame has no measured height: anchor to the bottom, invisible, until measured.
              bottom: web && cardReady ? undefined : 12,
              top: web && cardReady ? floatingCard.y : undefined,
              left: web ? floatingCard.x : undefined,
              opacity: cardReady ? 1 : 0,
              alignSelf: web || landscape ? undefined : "center",
              right: !web && landscape ? 10 : undefined,
              width: cardWidth,
              maxHeight: mobileWeb
                ? mobileCardLimit
                : !landscape && current?.surface
                  ? Math.max(180, height - 230)
                  : height - 24,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: c.pen,
              backgroundColor: c.paper,
            }}
          >
            <View
              style={{
                paddingHorizontal: 14,
                paddingTop: 6,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: f.bold, color: c.pen }}>
                Смотри, как · {resolvedStep + 1}/{active?.targets.length}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Закрыть подсказку"
                onPress={() => close(false)}
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 24 }}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              key={`${active?.id}:${resolvedStep}`}
              style={{ flexShrink: 1 }}
              contentContainerStyle={{
                padding: height < 500 ? 10 : 14,
                paddingTop: 4,
                gap: 8,
              }}
            >
              <Text
                testID="coach-instruction"
                accessibilityLiveRegion="polite"
                style={{
                  fontFamily: f.bold,
                  fontSize: 18,
                  lineHeight: 25,
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
                  style={{ fontFamily: f.bold, color: c.pen }}
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
                  onPress={() => narrator.say([current?.text ?? ""])}
                  style={{ padding: 8, minHeight: 40 }}
                >
                  <Text style={{ fontFamily: f.bold, color: c.pen }}>
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
                    <Text style={{ fontFamily: f.bold, color: c.pen }}>
                      {done ? "Ещё раз" : paused ? "Продолжить показ" : "Пауза"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
            <View style={{ padding: 10, paddingTop: 4 }}>
              <Button
                disabled={measuring || (!done && !missing)}
                onPress={() => {
                  narrator.stop();
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
            </View>
          </View>
        </View>
      </Modal>
    </Context.Provider>
  );
}
