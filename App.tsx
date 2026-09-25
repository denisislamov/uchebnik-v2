import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Andika_400Regular } from "@expo-google-fonts/andika/400Regular";
import { Andika_700Bold } from "@expo-google-fonts/andika/700Bold";
import { Neucha_400Regular } from "@expo-google-fonts/neucha/400Regular";
import Svg, { Path, Rect } from "react-native-svg";
import * as Speech from "expo-speech";
import { pages, allBlocks, lessonPages, extraPages } from "./src/content/book";
import type { Answer, Progress } from "./src/content/types";
import {
  emptyProgress,
  isDone,
  pageCompleted,
  parseProgress,
} from "./src/lib/assessment";
import { readProgress, saveProgress } from "./src/lib/storage";
import { colors as c, fonts as f } from "./src/theme";
import { Button, Cells, ProgressBar } from "./src/components/Controls";
import { NotebookPaper } from "./src/components/NotebookPaper";
import { BookImage } from "./src/components/BookImage";
import { assets } from "./src/content/assets";
import { Exercise } from "./src/components/Exercise";
// Both guards are build-time constants: production removes this entire component.
const DebugSourcePanel =
  __DEV__ && process.env.EXPO_PUBLIC_SOURCE_DEBUG === "1"
    ? function SourceComparison({
        pageNumber,
        title,
      }: {
        pageNumber: number;
        title: string;
      }) {
        const [panelWidth, setPanelWidth] = useState(500);
        const [enlarged, setEnlarged] = useState(false);
        const imageWidth = Math.max(280, panelWidth - 32) * (enlarged ? 2 : 1);
        const scan = assets[`page_${String(pageNumber).padStart(3, "0")}`];
        return (
          <View
            testID="debug-source-panel"
            style={{
              flex: 1,
              minHeight: 0,
              backgroundColor: "#edf4fc",
              borderLeftWidth: 1,
              borderColor: "#b5c9df",
            }}
            onLayout={(e) => setPanelWidth(e.nativeEvent.layout.width)}
          >
            <View style={{ padding: 16, gap: 8 }}>
              <Text
                style={{ fontFamily: f.bold, color: "#2563a6", fontSize: 16 }}
              >
                РЕЖИМ СВЕРКИ · ТОЛЬКО ДЛЯ РАЗРАБОТКИ
              </Text>
              <Text
                testID="debug-source-page"
                style={{ fontFamily: f.bold, fontSize: 19, color: c.pen }}
              >
                PDF · страница {pageNumber}
              </Text>
              <Text style={{ fontFamily: f.regular, color: c.muted }}>
                {title}
              </Text>
              <Text
                style={{ fontFamily: f.regular, color: c.muted, fontSize: 12 }}
              >
                Полный скан страницы исходного PDF. Нумерация — по листам PDF.
              </Text>
              <Button small secondary onPress={() => setEnlarged((v) => !v)}>
                {enlarged
                  ? "Сверка: уместить страницу"
                  : "Сверка: увеличить ×2"}
              </Button>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16 }}
            >
              <ScrollView horizontal style={{ flexGrow: 0 }}>
                <Image
                  accessibilityLabel={scan.alt}
                  source={scan.source}
                  resizeMode="contain"
                  style={{
                    width: imageWidth,
                    height: (imageWidth * scan.height) / scan.width,
                  }}
                />
              </ScrollView>
            </ScrollView>
          </View>
        );
      }
    : null;

function Main() {
  const [loaded, fontError] = useFonts({
    Andika_400Regular,
    Andika_700Bold,
    Neucha_400Regular,
  });
  const [progress, setProgress] = useState<Progress>(emptyProgress),
    [ready, setReady] = useState(false),
    [home, setHome] = useState(true),
    [original, setOriginal] = useState(false),
    [parent, setParent] = useState(false),
    [confirmReset, setConfirmReset] = useState(false),
    [drawing, setDrawing] = useState(false),
    [storageError, setStorageError] = useState(""),
    [speaking, setSpeaking] = useState(false),
    [speechError, setSpeechError] = useState(""),
    [zoom, setZoom] = useState(false),
    [catalogSection, setCatalogSection] = useState(0),
    [search, setSearch] = useState("");
  const scroll = useRef<ScrollView>(null),
    saveRevision = useRef(0);
  // Coaching may scroll the lesson to its target; the child returns to where they were.
  const lastScroll = useRef(0),
    coachScroll = useRef<number | null>(null);
  const onCoachActiveChange = useCallback((active: boolean) => {
    if (active) coachScroll.current = lastScroll.current;
    else if (coachScroll.current !== null) {
      // Reported after the coaching modal has fully closed (see GestureCoach).
      scroll.current?.scrollTo({ y: coachScroll.current, animated: false });
      coachScroll.current = null;
    }
  }, []);
  const [readAttempt, setReadAttempt] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const comparison = !!DebugSourcePanel && !home;
  const sideBySide = windowWidth >= 900;
  const width = comparison && sideBySide ? windowWidth * 0.52 : windowWidth;
  const wide = width >= 1000,
    compact = width < 600;
  useEffect(() => {
    let mounted = true;
    readProgress()
      .then((raw) => {
        if (mounted) {
          const restored = parseProgress(raw, pages);
          setProgress(
            restored.page === 2 ? { ...restored, page: 3, block: 0 } : restored,
          );
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted)
          setStorageError(
            "Не удалось прочитать сохранение. Попробуйте перезапустить приложение.",
          );
      });
    return () => {
      mounted = false;
      void Speech.stop();
    };
  }, [readAttempt]);
  useEffect(() => {
    if (!ready) return;
    const revision = ++saveRevision.current;
    saveProgress(progress)
      .then(() => {
        if (revision === saveRevision.current) setStorageError("");
      })
      .catch(() => {
        if (revision === saveRevision.current)
          setStorageError(
            "Прогресс пока не сохранён. Освободите место и повторите сохранение.",
          );
      });
  }, [progress, ready]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    lastScroll.current = 0;
    setDrawing(false);
    setSpeaking(false);
    setSpeechError("");
    void Speech.stop();
  }, [progress.page, progress.block, home]);
  const page = pages[progress.page - 1],
    block = page.blocks[progress.block],
    answer = progress.answers[block.id] ?? {};
  const finished = lessonPages.filter((p) =>
    pageCompleted(p, progress.answers),
  ).length;
  const stepsDone = lessonPages
    .flatMap((p) => p.blocks)
    .filter((b) => isDone(b, progress.answers[b.id])).length;
  const pageDone = page.blocks.filter((b) =>
    isDone(b, progress.answers[b.id]),
  ).length;
  function selectPage(n: number) {
    const p = pages[n - 1];
    const index = p.blocks.findIndex((b) => !isDone(b, progress.answers[b.id]));
    setProgress((v) => ({ ...v, page: n, block: index < 0 ? 0 : index }));
    setHome(false);
  }
  function next() {
    setProgress((p) => {
      const current = pages[p.page - 1].blocks[p.block];
      const answers =
        current.kind === "read" ||
        (current.kind === "counters" &&
          current.expected === undefined &&
          Number(p.answers[current.id]?.value) > 0)
          ? {
              ...p.answers,
              [current.id]: { ...p.answers[current.id], reviewed: true },
            }
          : p.answers;
      return p.block < pages[p.page - 1].blocks.length - 1
        ? { ...p, answers, block: p.block + 1 }
        : p.page >= 3 && p.page < 142
          ? { ...p, answers, page: p.page + 1, block: 0 }
          : { ...p, answers, page: 3, block: 0 };
    });
    if (
      !(progress.page >= 3 && progress.page < 142) &&
      progress.block === page.blocks.length - 1
    )
      setHome(true);
  }
  function previous() {
    setProgress((p) =>
      p.block > 0
        ? { ...p, block: p.block - 1 }
        : p.page > 3 && p.page <= 142
          ? {
              ...p,
              page: p.page - 1,
              block: pages[p.page - 2].blocks.length - 1,
            }
          : p,
    );
  }
  function updateAnswer(a: Answer) {
    setProgress((p) => ({ ...p, answers: { ...p.answers, [block.id]: a } }));
  }
  function speak() {
    if (speaking) {
      void Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeechError("");
    setSpeaking(true);
    Speech.speak(block.kind === "read" ? block.body : block.prompt, {
      language: "ru-RU",
      rate: 0.85,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => {
        setSpeaking(false);
        setSpeechError("Озвучивание недоступно. Прочитайте задание вместе.");
      },
    });
  }
  if (!ready || (!loaded && !fontError))
    return (
      <View style={s.loading}>
        <ActivityIndicator color={c.pen} />
        <Text style={{ color: c.pen, marginTop: 20 }}>
          {storageError || "Открываем учебник…"}
        </Text>
        {storageError !== "" && (
          <Button
            secondary
            onPress={() => {
              setStorageError("");
              setReadAttempt((n) => n + 1);
            }}
          >
            Повторить загрузку
          </Button>
        )}
      </View>
    );
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={[s.header, compact && { paddingHorizontal: 18 }]}>
        <NotebookPaper />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="На главную"
          onPress={() => setHome(true)}
          style={s.brand}
        >
          <Text style={s.brandTitle}>Арифметика</Text>
          <Text style={s.brandSub}>1 класс</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Информация для родителей"
          onPress={() => setParent(true)}
          style={s.parentButton}
        >
          <LockIcon />
          {!compact && <Text style={s.parentText}>Родителям</Text>}
        </Pressable>
      </View>
      {storageError !== "" && (
        <View accessibilityRole="alert" style={s.storageError}>
          <Text style={{ color: c.red, fontFamily: f.regular, flex: 1 }}>
            {storageError}
          </Text>
          <Button
            small
            secondary
            onPress={() => setProgress((p) => ({ ...p }))}
          >
            Повторить
          </Button>
        </View>
      )}
      <View
        style={{
          flex: 1,
          minHeight: 0,
          flexDirection: comparison && sideBySide ? "row" : "column",
        }}
      >
        <ScrollView
          testID="lesson-scroll-pane"
          style={[
            { flex: comparison ? 0.52 : 1, minWidth: 0 },
            // Keep notebook width fixed when drawing temporarily hides scrolling.
            Platform.OS === "web"
              ? ({ scrollbarGutter: "stable" } as any)
              : undefined,
          ]}
          ref={scroll}
          scrollEnabled={!drawing}
          scrollEventThrottle={16}
          onScroll={(e) => {
            lastScroll.current = e.nativeEvent.contentOffset.y;
          }}
          contentContainerStyle={s.scroll}
        >
          <NotebookPaper margin={!compact} />
          {home ? (
            <View
              style={[
                s.home,
                compact && {
                  paddingHorizontal: 18,
                  paddingLeft: 18,
                  paddingTop: 24,
                },
              ]}
            >
              <View style={[s.cover, !wide && { flexDirection: "column" }]}>
                <View style={[s.coverText, wide && { paddingRight: 36 }]}>
                  <View style={s.label}>
                    <View style={s.labelInner}>
                      <Text style={s.labelTitle}>Тетрадь</Text>
                      <Text style={s.labelHand}>по арифметике</Text>
                      <Text style={s.labelLine}>ученика 1 класса</Text>
                      <View style={s.labelRule} />
                      <Text style={s.labelNote}>
                        по учебнику А. С. Пчёлко и Г. Б. Поляка, 1959
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignSelf: "flex-start", marginTop: 24 }}>
                    <Button
                      onPress={() =>
                        stepsDone || progress.page > 1
                          ? setHome(false)
                          : selectPage(3)
                      }
                    >
                      {stepsDone || progress.page > 1
                        ? "Продолжить занятие  →"
                        : "Начать заниматься  →"}
                    </Button>
                  </View>
                  <Text style={s.coverFoot}>
                    Считаем рыбок, сравниваем мячи и рисуем первые цифры.
                  </Text>
                </View>
                <View
                  style={[
                    s.coverArt,
                    !wide && {
                      width: "100%",
                      maxWidth: 520,
                      alignSelf: "center",
                    },
                  ]}
                >
                  <BookImage id="p010_boys_fishing" maxHeight={320} />
                </View>
              </View>
              <View style={{ gap: 12, marginTop: 20 }}>
                <Text style={s.eyebrow}>Вне занятий · материалы книги</Text>
                <View
                  style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                >
                  {extraPages.map((p) => (
                    <Button
                      key={p.id}
                      small
                      secondary
                      label={`Страница ${p.number}. ${p.title}`}
                      onPress={() => selectPage(p.number)}
                    >
                      {p.number === 1
                        ? "Здравствуй, арифметика! · Обложка"
                        : p.number === 143
                          ? "Оглавление книги"
                          : "Выходные данные"}
                    </Button>
                  ))}
                </View>
              </View>
              <View style={s.pathHeading}>
                <Text style={s.sectionTitle}>Оглавление</Text>
                <Text style={s.progressText}>
                  {finished} из {lessonPages.length} пройдено
                </Text>
              </View>
              <ProgressBar value={finished / lessonPages.length} />
              <View style={{ gap: 12, marginVertical: 20 }}>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {[
                    "Знакомство с числами",
                    "Первый десяток",
                    "Второй десяток",
                    "Умножение и деление",
                    "Первая сотня",
                  ].map((title, i) => (
                    <Button
                      key={title}
                      small
                      secondary={catalogSection !== i}
                      onPress={() => {
                        setCatalogSection(i);
                        setSearch("");
                      }}
                    >
                      {title}
                    </Button>
                  ))}
                </View>
                <TextInput
                  accessibilityLabel="Найти страницу или задание"
                  placeholder="Страница 80 или № 500"
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor={c.muted}
                  style={s.search}
                />
              </View>
              <View style={s.pageGrid}>
                {lessonPages
                  .filter((p) => {
                    if (search.trim()) {
                      const n = Number(search.replace(/[^0-9]/g, ""));
                      return search.includes("№")
                        ? p.blocks.some((b) => b.exerciseNumber === n)
                        : p.number === n ||
                            p.title
                              .toLowerCase()
                              .includes(search.toLowerCase());
                    }
                    const bounds = [
                      [1, 29],
                      [30, 58],
                      [59, 96],
                      [97, 125],
                      [126, 142],
                      [143, 144],
                    ][catalogSection];
                    return p.number >= bounds[0] && p.number <= bounds[1];
                  })
                  .map((p) => {
                    const done = pageCompleted(p, progress.answers),
                      count = p.blocks.filter((b) =>
                        isDone(b, progress.answers[b.id]),
                      ).length;
                    return (
                      <Pressable
                        key={p.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Страница ${p.number}. ${p.title}`}
                        onPress={() => selectPage(p.number)}
                        style={({ pressed }) => [
                          s.pageCard,
                          {
                            width: wide ? "18.6%" : compact ? "100%" : "48.5%",
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <View style={s.cardTop}>
                          <Text style={s.pageNumber}>стр. {p.number}</Text>
                          <Text style={[s.pageStatus, done && s.pageDone]}>
                            {done
                              ? "✓"
                              : p.number < 3
                                ? "знакомство"
                                : `${p.blocks.length} шагов`}
                          </Text>
                        </View>
                        <View style={s.cardArt}>
                          <BookImage id={p.hero} maxHeight={108} />
                        </View>
                        <Text style={s.cardTitle}>{p.title}</Text>
                        <Text style={s.cardSubtitle}>{p.subtitle}</Text>
                        <View style={{ marginTop: "auto", paddingTop: 16 }}>
                          <Cells total={p.blocks.length} done={count} />
                        </View>
                      </Pressable>
                    );
                  })}
              </View>
              <View style={s.homeFooter}>
                <Text style={s.footerText}>
                  А. С. Пчёлко · Г. Б. Поляк{"\n"}Арифметика для первого класса
                </Text>
                <Text style={s.footerText}>
                  Тестовая версия{"\n"}Страницы PDF 1–144
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={[
                s.lessonLayout,
                compact && {
                  paddingHorizontal: 14,
                  paddingLeft: 14,
                  paddingTop: 20,
                },
              ]}
            >
              {wide && (
                <View style={s.sidebar}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setHome(true)}
                    style={{ paddingBottom: 28 }}
                  >
                    <Text style={s.back}>← Все страницы</Text>
                  </Pressable>
                  <Text style={s.eyebrow}>Соседние страницы</Text>
                  {lessonPages
                    .filter((p) => Math.abs(p.number - page.number) <= 4)
                    .map((p) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Открыть страницу ${p.number}`}
                        accessibilityState={{
                          selected: page.number === p.number,
                        }}
                        key={p.id}
                        onPress={() => selectPage(p.number)}
                        style={[
                          s.sideItem,
                          page.number === p.number && {
                            backgroundColor: c.wash,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.sideNumber,
                            page.number === p.number && { color: c.pen },
                          ]}
                        >
                          {pageCompleted(p, progress.answers)
                            ? "✓"
                            : String(p.number)}
                        </Text>
                        <Text style={s.sideTitle}>{p.title}</Text>
                      </Pressable>
                    ))}
                  <View style={s.sideNote}>
                    <Text style={s.sideNoteTitle}>Понемногу каждый день</Text>
                    <Text style={s.sideNoteText}>
                      Можно остановиться на любом шаге. Мы запомним, где ты
                      закончил.
                    </Text>
                  </View>
                </View>
              )}
              <View style={s.lessonMain}>
                <View style={s.lessonTop}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setHome(true)}
                  >
                    <Text style={s.back}>
                      {wide ? "Учебник · Арифметика" : "← Все страницы"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setOriginal(true);
                      setZoom(false);
                    }}
                  >
                    <Text style={s.sourceLink}>Оригинал ↗</Text>
                  </Pressable>
                </View>
                <Text
                  style={[
                    s.lessonTitle,
                    compact && { fontSize: 33, lineHeight: 39 },
                  ]}
                >
                  {page.title}
                </Text>
                <Text style={s.lessonSubtitle}>
                  Страница {page.number} · {page.subtitle}
                </Text>
                <View style={s.stepHeading}>
                  <Text style={s.stepText}>
                    Шаг {progress.block + 1} из {page.blocks.length}
                  </Text>
                  <Text style={s.stepText}>{pageDone} выполнено</Text>
                </View>
                <ProgressBar value={pageDone / page.blocks.length} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.stepDots}
                >
                  {page.blocks.map((b, i) => (
                    <Pressable
                      key={b.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Шаг ${i + 1}: ${b.title}`}
                      accessibilityState={{ selected: i === progress.block }}
                      onPress={() => setProgress((p) => ({ ...p, block: i }))}
                      style={[
                        s.stepDot,
                        i === progress.block && s.stepActive,
                        isDone(b, progress.answers[b.id]) && s.stepDone,
                      ]}
                    >
                      <Text
                        style={[
                          s.stepDotText,
                          isDone(b, progress.answers[b.id]) && s.stepDoneText,
                          i === progress.block && { color: c.white },
                        ]}
                      >
                        {isDone(b, progress.answers[b.id]) ? "✓" : i + 1}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={s.exerciseCard}>
                  <View style={s.exerciseTop}>
                    <Text style={s.exerciseCategory}>
                      {block.kind === "read"
                        ? "Рассмотри"
                        : block.kind === "draw"
                          ? "Нарисуй"
                          : block.kind === "shape"
                            ? "Собери фигуру"
                            : "Попробуй сам"}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        speaking
                          ? "Остановить озвучивание"
                          : "Послушать задание"
                      }
                      onPress={speak}
                      style={s.speechButton}
                    >
                      <Text style={s.speechText}>
                        {speaking ? "■ Стоп" : "♫ Слушать"}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={s.blockTitle}>{block.title}</Text>
                  {speechError !== "" && (
                    <Text style={s.lessonSubtitle}>{speechError}</Text>
                  )}
                  <Exercise
                    key={block.id}
                    block={block}
                    answer={answer}
                    onAnswer={updateAnswer}
                    onDrawing={setDrawing}
                    onCoachActiveChange={onCoachActiveChange}
                    revealCoachTarget={(target) =>
                      new Promise<void>((resolve) => {
                        const container = scroll.current?.getInnerViewNode();
                        if (!container) {
                          resolve();
                          return;
                        }
                        target.measureLayout(
                          container,
                          (_x, y) => {
                            scroll.current?.scrollTo({
                              y: Math.max(0, y - 100),
                              animated: false,
                            });
                            setTimeout(resolve, 160);
                          },
                          resolve,
                        );
                      })
                    }
                  />
                </View>
                <View style={s.navigation}>
                  <Button
                    secondary
                    disabled={
                      progress.block === 0 &&
                      (progress.page <= 3 || progress.page > 142)
                    }
                    onPress={previous}
                  >
                    ← Назад
                  </Button>
                  <Button onPress={next}>
                    {!(progress.page >= 3 && progress.page < 142) &&
                    progress.block === page.blocks.length - 1
                      ? "К страницам →"
                      : "Дальше →"}
                  </Button>
                </View>
                <Text style={s.saveNote}>
                  Ответы и рисунки сохраняются на этом устройстве.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
        {comparison && DebugSourcePanel && (
          <View style={{ flex: 0.48, minWidth: 0, minHeight: 0 }}>
            <DebugSourcePanel
              key={page.number}
              pageNumber={page.number}
              title={block.title}
            />
          </View>
        )}
      </View>
      <Modal
        visible={original}
        animationType="slide"
        onRequestClose={() => setOriginal(false)}
      >
        <SafeAreaView style={s.safe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Оригинал · страница {page.number}</Text>
            <Button small secondary onPress={() => setOriginal(false)}>
              Закрыть
            </Button>
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <Button small secondary onPress={() => setZoom(!zoom)}>
              {zoom ? "Уместить страницу" : "Увеличить ×2"}
            </Button>
          </View>
          <ScrollView
            maximumZoomScale={3}
            minimumZoomScale={1}
            contentContainerStyle={{ alignItems: "center", padding: 16 }}
          >
            <ScrollView
              horizontal
              contentContainerStyle={{
                width: zoom ? Math.max(width * 1.7, 1000) : width - 32,
              }}
            >
              <BookImage
                id={`page_${String(page.number).padStart(3, "0")}`}
                maxHeight={zoom ? 2600 : 1600}
              />
            </ScrollView>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={parent}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setParent(false);
          setConfirmReset(false);
        }}
      >
        <View style={s.modalShade}>
          <View style={s.parentPanel}>
            <ScrollView contentContainerStyle={{ gap: 20, padding: 28 }}>
              <Text style={s.modalTitle}>Учимся вместе</Text>
              <Text style={s.parentBody}>
                Это тестовая версия полного учебника: 144 страницы и задания до
                числа 100. Начать можно с любой страницы.
              </Text>
              <Text style={s.parentBody}>
                Нажатия на рисунки, числа и фигуры проверяются автоматически.
                Прописи проверяются по форме и положению линии на клетчатом
                поле. Это проверка обведения образца, а не распознавание
                свободного рисунка.
              </Text>
              <Text style={s.parentBody}>
                Мешки на странице 5 перекрываются. В этом задании нет строгой
                числовой оценки. Это свободная тренировка выкладывания палочек;
                переход не означает проверку количества.
              </Text>
              <Text style={s.parentBody}>
                Пропущенные шаги остаются незавершёнными. Прогресс хранится
                только на этом устройстве; аккаунта и синхронизации нет.
              </Text>
              <Text style={s.parentBody}>
                Озвучивание использует голос устройства. Доступность русского
                голоса зависит от системы.
              </Text>
              <Text style={s.parentBody}>
                Выполнено {stepsDone} из {allBlocks.length} шагов.
              </Text>
              {confirmReset ? (
                <View
                  style={{
                    gap: 12,
                    backgroundColor: c.washWarm,
                    padding: 16,
                    borderRadius: 12,
                  }}
                >
                  <Text style={s.parentBody}>
                    Удалить все ответы и рисунки этой тестовой версии? Это
                    действие нельзя отменить.
                  </Text>
                  <Button
                    onPress={() => {
                      setProgress(emptyProgress());
                      setConfirmReset(false);
                      setParent(false);
                      setHome(true);
                    }}
                  >
                    Да, удалить прогресс
                  </Button>
                  <Button secondary onPress={() => setConfirmReset(false)}>
                    Отмена
                  </Button>
                </View>
              ) : (
                <Button secondary onPress={() => setConfirmReset(true)}>
                  Начать заново…
                </Button>
              )}
              <Button
                onPress={() => {
                  setParent(false);
                  setConfirmReset(false);
                }}
              >
                Вернуться к учебнику
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
function LockIcon() {
  return (
    <Svg width={20} height={22} viewBox="0 0 20 22">
      <Path
        d="M5 9.5V6.5a5 5 0 0 1 10 0v3"
        stroke={c.muted}
        strokeWidth={2}
        fill="none"
      />
      <Rect
        x={3}
        y={9.5}
        width={14}
        height={10.5}
        rx={2}
        stroke={c.muted}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.paper },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.paper,
  },
  // Три клетки в высоту: линии сетки шапки и листа совпадают.
  header: {
    height: 72,
    paddingHorizontal: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderColor: c.line,
    gap: 12,
  },
  brand: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    flexShrink: 1,
  },
  brandTitle: {
    fontFamily: f.hand,
    fontSize: 30,
    lineHeight: 34,
    color: c.pen,
  },
  brandSub: { fontFamily: f.regular, fontSize: 14, color: c.muted },
  parentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  parentText: { fontFamily: f.regular, fontSize: 15, color: c.muted },
  scroll: { flexGrow: 1 },
  home: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    padding: 42,
    paddingLeft: 64,
    paddingTop: 48,
  },
  cover: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
    backgroundColor: c.cover,
    borderRadius: 6,
    padding: 28,
    marginBottom: 44,
  },
  coverText: { flex: 1, alignSelf: "stretch", justifyContent: "center" },
  label: {
    backgroundColor: c.white,
    borderWidth: 1.5,
    borderColor: c.ink,
    padding: 5,
  },
  labelInner: {
    borderWidth: 1,
    borderColor: c.ink,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 4,
  },
  labelTitle: {
    fontFamily: f.bold,
    fontSize: 28,
    lineHeight: 34,
    color: c.ink,
  },
  labelHand: {
    fontFamily: f.hand,
    fontSize: 40,
    lineHeight: 46,
    color: c.pen,
  },
  labelLine: { fontFamily: f.regular, fontSize: 17, color: c.ink },
  labelRule: {
    alignSelf: "stretch",
    height: 1,
    backgroundColor: c.line,
    marginTop: 10,
    marginBottom: 4,
  },
  labelNote: {
    fontFamily: f.regular,
    fontSize: 12,
    lineHeight: 16,
    color: c.muted,
    textAlign: "center",
  },
  coverFoot: {
    fontFamily: f.regular,
    color: c.ink,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },
  coverArt: {
    width: "46%",
    backgroundColor: c.white,
    borderWidth: 1.5,
    borderColor: c.ink,
    padding: 10,
  },
  pathHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    marginTop: 36,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  eyebrow: {
    fontFamily: f.regular,
    fontSize: 14,
    color: c.muted,
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: f.hand,
    color: c.pen,
    fontSize: 40,
    lineHeight: 46,
  },
  progressText: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 15,
    paddingBottom: 8,
  },
  search: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1.5,
    borderColor: c.pen,
    fontFamily: f.regular,
    fontSize: 20,
    color: c.ink,
    maxWidth: 420,
  },
  pageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 20 },
  pageCard: {
    backgroundColor: c.card,
    padding: 14,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 6,
    minHeight: 250,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    minHeight: 24,
  },
  pageNumber: { fontFamily: f.bold, fontSize: 14, color: c.pen },
  pageStatus: { fontFamily: f.regular, fontSize: 13, color: c.muted },
  pageDone: {
    fontFamily: f.hand,
    fontSize: 24,
    lineHeight: 24,
    color: c.red,
  },
  cardArt: { height: 110, justifyContent: "center", marginBottom: 14 },
  cardTitle: {
    fontFamily: f.bold,
    fontSize: 18,
    lineHeight: 24,
    color: c.ink,
  },
  cardSubtitle: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 18,
    color: c.muted,
    marginTop: 4,
  },
  homeFooter: {
    borderTopWidth: 1.5,
    borderColor: c.line,
    marginTop: 42,
    paddingTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  footerText: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  lessonLayout: {
    width: "100%",
    maxWidth: 1230,
    alignSelf: "center",
    padding: 38,
    paddingLeft: 64,
    flexDirection: "row",
    gap: 55,
  },
  sidebar: { width: 235, paddingTop: 4 },
  back: { fontFamily: f.bold, fontSize: 15, color: c.pen },
  sideItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 4,
    padding: 11,
    marginTop: 2,
  },
  sideNumber: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 13,
    width: 28,
  },
  sideTitle: { fontFamily: f.bold, color: c.ink, fontSize: 14, flex: 1 },
  sideNote: {
    marginTop: 32,
    padding: 16,
    backgroundColor: c.washWarm,
    borderRadius: 4,
  },
  sideNoteTitle: {
    fontFamily: f.hand,
    fontSize: 22,
    lineHeight: 26,
    color: c.pen,
    marginBottom: 6,
  },
  sideNoteText: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 20,
    color: c.ink,
  },
  lessonMain: { flex: 1, minWidth: 0, maxWidth: 780 },
  lessonTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  sourceLink: {
    fontFamily: f.bold,
    color: c.pen,
    fontSize: 15,
    paddingVertical: 10,
  },
  lessonTitle: {
    fontFamily: f.hand,
    color: c.pen,
    fontSize: 46,
    lineHeight: 52,
  },
  lessonSubtitle: {
    fontFamily: f.regular,
    fontSize: 15,
    lineHeight: 22,
    color: c.muted,
    marginTop: 6,
  },
  stepHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 10,
  },
  stepText: { fontFamily: f.regular, color: c.muted, fontSize: 14 },
  stepDots: { gap: 8, paddingVertical: 16 },
  stepDot: {
    width: 40,
    height: 40,
    borderWidth: 1.5,
    borderColor: c.line,
    borderRadius: 4,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stepActive: { backgroundColor: c.pen, borderColor: c.pen },
  stepDone: { borderColor: c.red },
  stepDotText: { fontFamily: f.bold, color: c.pen, fontSize: 16 },
  stepDoneText: { fontFamily: f.hand, color: c.red, fontSize: 24 },
  exerciseCard: { paddingTop: 4 },
  exerciseTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  exerciseCategory: { fontFamily: f.regular, color: c.muted, fontSize: 14 },
  speechButton: {
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.pen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    minHeight: 40,
    justifyContent: "center",
  },
  speechText: { fontFamily: f.bold, color: c.pen, fontSize: 14 },
  blockTitle: {
    fontFamily: f.bold,
    color: c.ink,
    fontSize: 26,
    lineHeight: 32,
    marginBottom: 18,
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 26,
  },
  saveNote: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 22,
  },
  modalHeader: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: {
    fontFamily: f.hand,
    fontSize: 30,
    lineHeight: 34,
    color: c.pen,
    flexShrink: 1,
  },
  modalShade: {
    flex: 1,
    backgroundColor: "#1f2433aa",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  parentPanel: {
    maxWidth: 580,
    width: "100%",
    maxHeight: "90%",
    backgroundColor: c.card,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: c.ink,
    overflow: "hidden",
  },
  parentBody: {
    fontFamily: f.regular,
    color: c.ink,
    fontSize: 16,
    lineHeight: 25,
  },
  storageError: {
    backgroundColor: c.washWarm,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
