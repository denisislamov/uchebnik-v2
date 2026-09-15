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
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "./Controls";
import { colors as c, fonts as f } from "../theme";
import {
  COACH_STORAGE_KEY,
  coachSpotlight,
  readSeenCoaches,
  type CoachFamily,
  type CoachRect,
} from "../lib/gestureCoach";

type Target = { ref: React.RefObject<View | null>; text: string };
type Tutorial = { family: CoachFamily; targets: Target[] };
type Entry = { id: string; tutorial: Tutorial };
type RevealTarget = (target: View) => Promise<void>;
const Context = createContext<{
  register: (id: string, tutorial: Tutorial) => () => void;
  replay: (id: string) => void;
} | null>(null);
let saveQueue = Promise.resolve();
function remember(family: CoachFamily) {
  saveQueue = saveQueue
    .catch(() => {})
    .then(async () => {
      const seen = readSeenCoaches(
        await AsyncStorage.getItem(COACH_STORAGE_KEY),
      );
      await AsyncStorage.setItem(
        COACH_STORAGE_KEY,
        JSON.stringify([...new Set([...seen, family])]),
      );
    });
  return saveQueue;
}

/** Each concrete manipulative registers its own real targets, even in multi-board tasks. */
export function useGestureCoach(family: CoachFamily, targets: Target[]) {
  const id = useId(),
    context = useContext(Context);
  const latest = useRef(targets);
  latest.current = targets;
  const register = context?.register;
  useEffect(
    () =>
      register?.(id, {
        family,
        get targets() {
          return latest.current;
        },
      }),
    [id, family, register],
  );
  return () => context?.replay(id);
}
export function CoachButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ alignSelf: "flex-start" }}>
      <Button secondary small onPress={onPress}>
        Покажи, как
      </Button>
    </View>
  );
}
export function GestureCoachProvider({
  children,
  revealTarget,
}: {
  children: React.ReactNode;
  revealTarget?: RevealTarget;
}) {
  const { width, height } = useWindowDimensions();
  const entries = useRef(new Map<string, Tutorial>());
  const [revision, setRevision] = useState(0);
  const [seen, setSeen] = useState<CoachFamily[] | null>(null);
  const [active, setActive] = useState<Entry | null>(null);
  const [step, setStep] = useState(0);
  const [targetRect, setRect] = useState<CoachRect | null>(null);
  const [cardHeight, setCardHeight] = useState(225);
  const rect = targetRect
    ? coachSpotlight(targetRect, width, height, cardHeight + 32)
    : null;
  const [finished, setFinished] = useState(false);
  const showing = useRef(false);
  const register = useCallback((id: string, tutorial: Tutorial) => {
    entries.current.set(id, tutorial);
    setRevision((v) => v + 1);
    return () => {
      entries.current.delete(id);
      setRevision((v) => v + 1);
    };
  }, []);
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
    showing.current = true;
    setRect(null);
    setStep(0);
    setFinished(false);
    setActive({ id, tutorial });
  }, []);
  useEffect(() => {
    if (seen === null || active || showing.current) return;
    const entry = [...entries.current].find(
      ([, tutorial]) => !seen.includes(tutorial.family),
    );
    if (entry) replay(entry[0]);
  }, [revision, seen, active, replay]);
  useEffect(() => {
    if (!active || finished) return;
    let cancelled = false;
    setRect(null);
    const timer = setTimeout(async () => {
      const target = active.tutorial.targets[step]?.ref.current;
      if (!target) {
        if (cancelled) return;
        setFinished(true);
        return;
      }
      if (Platform.OS === "web") {
        (target as unknown as HTMLElement).scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      } else if (revealTarget) await revealTarget(target);
      if (cancelled) return;
      target.measureInWindow((x, y, w, h) => {
        if (cancelled) return;
        if (w > 0 && h > 0) setRect({ x, y, width: w, height: h });
        else setFinished(true);
      });
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, step, width, height, revealTarget, finished]);
  function close(completed: boolean) {
    if (!active) return;
    // Dismissal lasts for this exercise; only completing the tutorial persists across visits.
    setSeen((old) => [...new Set([...(old ?? []), active.tutorial.family])]);
    if (completed && !finished && rect)
      void remember(active.tutorial.family).catch(() => {});
    showing.current = false;
    setActive(null);
    setRect(null);
  }
  const text = active?.tutorial.targets[step]?.text;
  return (
    <Context.Provider value={{ register, replay }}>
      {children}
      <Modal
        visible={!!active && (!!targetRect || finished)}
        transparent
        animationType="none"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => close(false)}
      >
        <View
          testID="gesture-coach"
          accessibilityViewIsModal
          style={{ flex: 1 }}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
            onStartShouldSetResponder={() => true}
          />
          {rect ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: rect.y,
                  backgroundColor: "rgba(15,29,31,.76)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: rect.y + rect.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(15,29,31,.76)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: rect.y,
                  left: 0,
                  width: rect.x,
                  height: rect.height,
                  backgroundColor: "rgba(15,29,31,.76)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: rect.y,
                  left: rect.x + rect.width,
                  right: 0,
                  height: rect.height,
                  backgroundColor: "rgba(15,29,31,.76)",
                }}
              />
              <View
                testID="coach-highlight"
                style={{
                  position: "absolute",
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                  borderWidth: 4,
                  borderColor: "#ffda72",
                  borderRadius: 14,
                }}
              />
              <Text
                testID="coach-finger"
                style={{
                  position: "absolute",
                  left: Math.max(
                    8,
                    Math.min(width - 65, rect.x + rect.width / 2 - 26),
                  ),
                  top: Math.max(0, rect.y + Math.min(rect.height, 90) - 34),
                  fontSize: 52,
                }}
              >
                👆
              </Text>
            </View>
          ) : (
            <View
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(15,29,31,.76)",
              }}
            />
          )}
          <View
            testID="coach-card"
            onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
            style={{
              position: "absolute",
              bottom: 16,
              alignSelf: "center",
              width: Math.min(width - 24, 480),
              padding: height < 600 ? 12 : 18,
              borderRadius: 20,
              backgroundColor: c.paper,
              gap: height < 600 ? 6 : 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontFamily: f.bold, color: c.green, fontSize: 16 }}
              >
                Покажу, как · {step + 1}/{active?.tutorial.targets.length}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Закрыть подсказку"
                onPress={() => close(false)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 24, color: c.ink }}>×</Text>
              </Pressable>
            </View>
            <Text
              accessibilityLiveRegion="polite"
              style={{
                fontFamily: f.bold,
                fontSize: height < 600 ? 16 : 18,
                lineHeight: height < 600 ? 21 : 25,
                color: c.ink,
              }}
            >
              {finished
                ? "Здесь уже всё на месте. Можно убрать последний предмет, чтобы попробовать ещё раз."
                : text}
            </Text>
            <Button
              onPress={() => {
                if (
                  active &&
                  !finished &&
                  step + 1 < active.tutorial.targets.length
                ) {
                  setRect(null);
                  setStep((v) => v + 1);
                } else close(true);
              }}
            >
              {!finished && active && step + 1 < active.tutorial.targets.length
                ? "Дальше"
                : "Попробую"}
            </Button>
          </View>
        </View>
      </Modal>
    </Context.Provider>
  );
}
