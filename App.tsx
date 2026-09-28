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
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Andika_400Regular } from "@expo-google-fonts/andika/400Regular";
import { Andika_700Bold } from "@expo-google-fonts/andika/700Bold";
import { Neucha_400Regular } from "@expo-google-fonts/neucha/400Regular";
import Svg, { Path, Rect } from "react-native-svg";
import { pages, allBlocks, lessonPages, extraPages } from "./src/content/book";
import type { Answer, Progress } from "./src/content/types";
import {
  emptyProgress,
  isDone,
  canAdvance,
  pageCompleted,
  parseProgress,
} from "./src/lib/assessment";
import { readProgress, saveProgress } from "./src/lib/storage";
import { colors as c, fonts as f } from "./src/theme";
import {
  Button,
  Cells,
  CellPressable,
} from "./src/components/Controls";
import { NotebookPaper } from "./src/components/NotebookPaper";
import { HandFrame, Rows } from "./src/components/HandDrawn";
import { CELL, cells, wholeCells, written } from "./src/lib/grid";
import { BookImage } from "./src/components/BookImage";
import { assets } from "./src/content/assets";
import { Exercise } from "./src/components/Exercise";
import { TaskFitExtra } from "./src/components/taskSize";
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const comparison = !!DebugSourcePanel && !home;
  const sideBySide = windowWidth >= 900;
  const width = comparison && sideBySide ? windowWidth * 0.52 : windowWidth;
  const wide = width >= 1000,
    compact = width < 600,
    // Same rule as useTaskSize: off a phone the lesson fits the window and
    // its header folds; only a tall window gets the larger title.
    short = !compact,
    tall = wide && windowHeight >= 1000;
  // The sheet is ruled from the left edge of the writing, and the writing is
  // a whole number of cells wide: what is measured in cells lies on the lines
  // at any window width. Until the sheet is measured the window stands in.
  const [sheet, setSheet] = useState({ x: 0, width: 0 });
  const sheetWidth = sheet.width || width;
  const measureSheet = (e: LayoutChangeEvent) => {
    const { x, width: w } = e.nativeEvent.layout;
    if (Math.abs(x - sheet.x) > 0.5 || Math.abs(w - sheet.width) > 0.5)
      setSheet({ x, width: w });
  };
  // A phone keeps a quarter of a cell at each side at least; wider screens
  // have a margin of two cells on the left, as a notebook has, and at least
  // one on the right.
  const sideColumn = wide ? cells(10) + cells(2) : 0;
  const writing = compact
    ? wholeCells(sheetWidth - CELL / 2)
    : wholeCells(sheetWidth - cells(2) - CELL - (home ? 0 : sideColumn));
  const left = compact ? Math.floor((sheetWidth - writing) / 2) : cells(2);
  const paperOrigin = sheet.x + left;
  // Cards of the contents stand a cell apart, in whole cells.
  const cardColumns = wide ? 5 : compact ? 1 : 2;
  const cardWidth = wholeCells(
    (writing - (cardColumns - 1) * CELL) / cardColumns,
  );
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
  // Mobile browsers hide their address bar while scrolling; sized with 100vh
  // the app then overflows the visible area and the bottom of a lesson is
  // cut off. Size it to the dynamic viewport where the browser supports it.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (typeof CSS === "undefined" || !CSS.supports("height", "100dvh")) return;
    for (const element of [
      document.documentElement,
      document.body,
      document.getElementById("root"),
    ])
      if (element) element.style.height = "100dvh";
  }, []);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    lastScroll.current = 0;
    setDrawing(false);
  }, [progress.page, progress.block, home]);
  const page = pages[progress.page - 1],
    block = page.blocks[progress.block],
    answer = progress.answers[block.id] ?? {};
  // Off a phone the task is fitted to the window: right after a step opens,
  // the room left under «Дальше» (or the overflow) is measured and handed to
  // the picture or the sheet. Then the size is frozen, so nothing moves while
  // the child answers.
  const [paneHeight, setPaneHeight] = useState(0);
  const fitKey = `${home}|${block.id}|${windowWidth}x${windowHeight}|${paneHeight}`;
  const [fit, setFit] = useState({ key: "", extra: 0 });
  const lessonMain = useRef<View>(null);
  useEffect(() => {
    setFit({ key: fitKey, extra: 0 });
    if (compact || home || !paneHeight) return;
    // A few looks during the first second (pictures load, the sheet sizes
    // itself), then the size stays as it is.
    const timers = [150, 400, 750, 1100].map((ms) =>
      setTimeout(
        () =>
          lessonMain.current?.measureInWindow((_x, y, _w, h) => {
            const bottom = y + h + lastScroll.current;
            const slack = paneHeight - bottom - 16;
            // The task is laid out in rows of the sheet, so room is handed
            // over a row at a time: less than a row of it stays under
            // «Дальше», and an overflow takes a whole row back.
            if (slack > -6 && slack < CELL) return;
            const rows = Math.floor(slack / CELL) * CELL;
            setFit((f) =>
              f.key !== fitKey
                ? f
                : {
                    ...f,
                    extra: Math.max(-600, Math.min(900, f.extra + rows)),
                  },
            );
          }),
        ms,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [fitKey]);
  const fitExtra = fit.key === fitKey ? fit.extra : 0;

  const finished = lessonPages.filter((p) =>
    pageCompleted(p, progress.answers),
  ).length;
  const stepsDone = lessonPages
    .flatMap((p) => p.blocks)
    .filter((b) => isDone(b, progress.answers[b.id])).length;
  const pageDone = page.blocks.filter((b) =>
    isDone(b, progress.answers[b.id]),
  ).length;
  function selectPage(n: number, block?: number) {
    const p = pages[n - 1];
    const index =
      block ?? p.blocks.findIndex((b) => !isDone(b, progress.answers[b.id]));
    setProgress((v) => ({ ...v, page: n, block: index < 0 ? 0 : index }));
    setHome(false);
  }
  // «№ 500» is a textbook exercise number; a bare number is a page.
  const query = search.trim(),
    byExercise = query.includes("№"),
    queryNumber = Number(query.replace(/[^0-9]/g, ""));
  const foundStep = (p: (typeof pages)[number]) =>
    byExercise
      ? p.blocks.findIndex((b) => b.exerciseNumber === queryNumber)
      : -1;
  const pageLine =
    `Страница ${page.number} · ${page.subtitle}` +
    (short && block.exerciseNumber ? ` · № ${block.exerciseNumber}` : "");
  const advance = canAdvance(block, answer);
  // Once the child has done the task, glide just far enough to show the next
  // button — «Проверить…» while it waits for a check, «Дальше» once solved —
  // as the drawing sheet glides to its next line. A step that was already
  // solved when it opened stays where it is.
  const exerciseCard = useRef<View>(null),
    navigation = useRef<View>(null);
  const glide = useRef({
    step: "",
    solvedOnOpen: false,
    answer: answer,
    shown: "",
  });
  if (glide.current.step !== `${progress.page}:${block.id}`)
    glide.current = {
      step: `${progress.page}:${block.id}`,
      solvedOnOpen: advance,
      answer,
      shown: "",
    };
  useEffect(() => {
    const g = glide.current;
    if (Platform.OS !== "web" || home || drawing || g.solvedOnOpen) return;
    // Only after the child's own work on this step, never on opening it.
    if (answer === g.answer) return;
    const timer = setTimeout(() => {
      const card = exerciseCard.current as unknown as HTMLElement | null;
      // A drawing sheet leads the child line by line itself; its check button
      // waits until the whole step is solved.
      const sheet = card?.querySelector('[aria-label="Поле для рисования"]');
      const check =
        advance || sheet
          ? null
          : ([...(card?.querySelectorAll('[role="button"]') ?? [])].find(
              (b) =>
                /^Проверить/.test((b as HTMLElement).innerText.trim()) &&
                b.getAttribute("aria-disabled") !== "true",
            ) as HTMLElement | undefined);
      const kind = advance ? "next" : check ? "check" : "";
      // Each button once per step: a later answer does not pull the page again.
      if (!kind || g.shown.includes(kind)) return;
      const target = advance
        ? (navigation.current as unknown as HTMLElement | null)
        : check;
      const pane = target && verticalScrollPane(target);
      if (!target || !pane) return;
      g.shown += kind;
      const box = target.getBoundingClientRect(),
        view = pane.getBoundingClientRect();
      // Down only, and never past the top of the task.
      const shift = box.bottom + 24 - view.bottom;
      if (shift > 1) pane.scrollBy({ top: shift, behavior: "smooth" });
    }, 350);
    return () => clearTimeout(timer);
  }, [answer, advance, drawing, home]);
  function next() {
    if (!advance) return;
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
  // On phones and tablets the header scrolls away with the page: pinned, it
  // only ate room that a long task needs. Wide screens keep it in place.
  const header = (
    <View
      style={[
        s.header,
        { paddingLeft: paperOrigin, paddingRight: compact ? left : CELL },
      ]}
    >
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
  );
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom", "left", "right"]}>
      <StatusBar style="dark" />
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
          onLayout={(e) => setPaneHeight(e.nativeEvent.layout.height)}
          scrollEnabled={!drawing}
          scrollEventThrottle={16}
          onScroll={(e) => {
            lastScroll.current = e.nativeEvent.contentOffset.y;
          }}
          contentContainerStyle={s.scroll}
        >
          {/* The page's ruling is drawn first: the header and all text lie on it. */}
          <NotebookPaper margin={!compact} origin={paperOrigin} />
          {home && header}
          {home ? (
            <View
              onLayout={measureSheet}
              style={[
                s.home,
                { paddingLeft: left },
                compact && { paddingRight: left, paddingTop: CELL },
              ]}
            >
              <View style={{ width: writing, maxWidth: "100%" }}>
                <Rows
                  style={s.cover}
                  contentStyle={[
                    s.coverContent,
                    !wide && { flexDirection: "column" },
                  ]}
                >
                  <View style={[s.coverText, wide && { paddingRight: CELL }]}>
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
                    <View style={{ alignSelf: "flex-start", marginTop: CELL }}>
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
                </Rows>
                <View>
                  <Text style={s.eyebrow}>Вне занятий · материалы книги</Text>
                  <View style={s.chips}>
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
                <View style={{ gap: CELL, marginVertical: CELL }}>
                  <View style={s.chips}>
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
                    placeholder="Страница 80 · задание № 500"
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
                          onPress={() =>
                            selectPage(
                              p.number,
                              foundStep(p) >= 0 ? foundStep(p) : undefined,
                            )
                          }
                          style={({ pressed }) => [
                            s.pageCard,
                            { width: cardWidth },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <HandFrame seed={p.id} />
                          <View style={s.cardTop}>
                            <Text style={s.pageNumber}>стр. {p.number}</Text>
                            <Text style={[s.pageStatus, done && s.pageDone]}>
                              {foundStep(p) >= 0
                                ? `№ ${queryNumber} · шаг ${foundStep(p) + 1}`
                                : done
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
                          <View style={{ marginTop: "auto", paddingTop: 12 }}>
                            <Cells total={p.blocks.length} done={count} />
                          </View>
                        </Pressable>
                      );
                    })}
                </View>
                <View style={s.homeFooter}>
                  <Text style={s.footerText}>
                    А. С. Пчёлко · Г. Б. Поляк{"\n"}Арифметика для первого
                    класса
                  </Text>
                  <Text style={s.footerText}>
                    Тестовая версия{"\n"}Страницы PDF 1–144
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View
              onLayout={measureSheet}
              style={[
                s.lessonLayout,
                { paddingLeft: left },
                compact && { paddingRight: left },
              ]}
            >
              {wide && (
                <View style={s.sidebar}>
                  <Text style={[s.eyebrow, s.sideHeading]}>
                    Соседние страницы
                  </Text>
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
                        style={s.sideItem}
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
                        <Text
                          style={[
                            s.sideTitle,
                            page.number === p.number && { color: c.pen },
                          ]}
                        >
                          {p.title}
                        </Text>
                      </Pressable>
                    ))}
                  {/* A word in pencil, not a framed card: nothing to press. */}
                  <View style={s.sideNote}>
                    <Text style={s.sideNoteText}>
                      Можно остановиться на любом шаге. Мы запомним, где ты
                      закончил.
                    </Text>
                  </View>
                </View>
              )}
              <View
                ref={lessonMain}
                style={[s.lessonMain, { width: Math.min(writing, cells(57)) }]}
              >
                {/* One row: the arrow home, the page's name, the original. The
                    app header stays on the contents page; here it only
                    repeated «Арифметика» and took a line. */}
                {/* Two rows of cells: the arrow home, the page's name written
                    on the lower line with its number after it, the original. */}
                <View style={s.lessonTop}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="На главную"
                    onPress={() => setHome(true)}
                    hitSlop={8}
                    style={s.backButton}
                  >
                    <BackArrow />
                  </Pressable>
                  <View style={[s.lessonName, compact && { paddingTop: CELL }]}>
                    <Text
                      style={[
                        s.lessonTitle,
                        tall && written(38, 2, true),
                        // On a phone a long name takes two lines: a row
                        // each, under the empty row at the top.
                        compact && s.lessonTitleCompact,
                      ]}
                    >
                      {page.title}
                    </Text>
                    {!compact && (
                      <Text style={s.lessonSubtitle}>{pageLine}</Text>
                    )}
                  </View>
                  <CellPressable
                    accessibilityRole="button"
                    onPress={() => {
                      setOriginal(true);
                      setZoom(false);
                    }}
                  >
                    <Text style={s.sourceLink}>Оригинал ↗</Text>
                  </CellPressable>
                </View>
                {/* On a phone the name takes the whole row; its number goes under it. */}
                {compact && <Text style={s.lessonSubtitleRow}>{pageLine}</Text>}
                {/* On a laptop screen the step squares carry the count, as on a phone. */}
                {!short && (
                  <View style={s.stepHeading}>
                    <Text style={s.stepText}>
                      Шаг {progress.block + 1} из {page.blocks.length}
                      {block.exerciseNumber
                        ? ` · № ${block.exerciseNumber}`
                        : ""}
                    </Text>
                    <Text style={s.stepText}>{pageDone} выполнено</Text>
                  </View>
                )}
                <ScrollView
                  horizontal
                  style={{ flexGrow: 0 }}
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
                        isDone(b, progress.answers[b.id]) && s.stepDone,
                        i === progress.block && s.stepActive,
                      ]}
                    >
                      <Text
                        style={[
                          s.stepDotText,
                          isDone(b, progress.answers[b.id]) && s.stepDoneText,
                          i === progress.block &&
                            !isDone(b, progress.answers[b.id]) && { color: c.pen },
                        ]}
                      >
                        {isDone(b, progress.answers[b.id]) ? "✓" : i + 1}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View
                  ref={exerciseCard}
                  testID="exercise-card"
                  style={s.exerciseCard}
                >
                  <TaskFitExtra.Provider value={fitExtra}>
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
                  </TaskFitExtra.Provider>
                </View>
                <View ref={navigation} style={s.navigation}>
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
                  <Button disabled={!advance} onPress={next}>
                    {!(progress.page >= 3 && progress.page < 142) &&
                    progress.block === page.blocks.length - 1
                      ? "К страницам →"
                      : "Дальше →"}
                  </Button>
                </View>
                {!advance && (
                  <Text testID="next-locked-note" style={s.lockNote}>
                    «Дальше» откроется, когда задание получится.
                  </Text>
                )}
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
                Озвучивание временно отключено: кнопки «Слушать» нет, пока не
                выбран голос диктора. Читайте задания вместе.
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
function BackArrow() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M15 5 L8 12 L15 19"
        fill="none"
        stroke={c.pen}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
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
    height: cells(3),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    paddingRight: CELL,
    paddingBottom: 42,
    paddingTop: cells(2),
  },
  // The cover lies on the sheet itself: no coloured panel around it.
  cover: {
    backgroundColor: c.cover,
    marginBottom: cells(2),
  },
  coverText: { flex: 1, alignSelf: "stretch", justifyContent: "center" },
  // The label pasted on the cover is nine cells high.
  label: {
    backgroundColor: c.white,
    borderWidth: 1.5,
    borderColor: c.ink,
    padding: 6,
  },
  labelInner: {
    borderWidth: 1,
    borderColor: c.ink,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  labelTitle: { fontFamily: f.bold, color: c.ink, ...written(28, 2) },
  labelHand: { fontFamily: f.hand, color: c.pen, ...written(40, 2, true) },
  labelLine: {
    fontFamily: f.regular,
    fontSize: 17,
    lineHeight: CELL,
    color: c.ink,
  },
  labelRule: {
    alignSelf: "stretch",
    height: 1,
    backgroundColor: c.line,
    marginTop: CELL / 2,
    marginBottom: CELL / 2,
  },
  labelNote: {
    fontFamily: f.regular,
    fontSize: 12,
    lineHeight: CELL,
    color: c.muted,
    textAlign: "center",
  },
  coverContent: { flexDirection: "row", alignItems: "center", gap: CELL },
  coverFoot: {
    fontFamily: f.regular,
    color: c.ink,
    fontSize: 15,
    lineHeight: CELL,
    marginTop: CELL,
  },
  coverArt: {
    width: "46%",
    backgroundColor: c.white,
    borderWidth: 1.5,
    borderColor: c.ink,
    padding: 10,
  },
  // Buttons in a row stand a cell apart, rows of them too.
  chips: { flexDirection: "row", flexWrap: "wrap", gap: CELL },
  pathHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: CELL,
    marginTop: CELL,
    flexWrap: "wrap",
  },
  eyebrow: {
    fontFamily: f.regular,
    fontSize: 14,
    lineHeight: CELL,
    color: c.muted,
  },
  sectionTitle: { fontFamily: f.hand, color: c.pen, ...written(40, 2, true) },
  progressText: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 15,
    lineHeight: CELL,
  },
  // Two cells high: the words stand in the upper one, the pen's line closes
  // the lower.
  search: {
    height: cells(2),
    paddingHorizontal: 4,
    borderBottomWidth: 1.5,
    borderColor: c.line,
    fontFamily: f.regular,
    fontSize: 20,
    color: c.ink,
    maxWidth: cells(18),
  },
  pageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CELL,
  },
  // A card is a whole number of cells wide and eleven cells high: half a
  // cell around, a row for the number, the picture, the name, the strip.
  pageCard: {
    backgroundColor: c.card,
    padding: CELL / 2,
    minHeight: cells(11),
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: CELL / 2,
    height: CELL,
  },
  pageNumber: {
    fontFamily: f.bold,
    fontSize: 14,
    lineHeight: CELL,
    color: c.pen,
  },
  pageStatus: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: CELL,
    color: c.muted,
  },
  pageDone: {
    fontFamily: f.hand,
    fontSize: 24,
    lineHeight: CELL,
    color: c.red,
  },
  cardArt: {
    height: CELL * 4.5,
    justifyContent: "center",
    marginBottom: CELL / 2,
  },
  cardTitle: {
    fontFamily: f.bold,
    fontSize: 18,
    lineHeight: CELL,
    color: c.ink,
  },
  cardSubtitle: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: CELL,
    color: c.muted,
  },
  homeFooter: {
    marginTop: cells(2),
    flexDirection: "row",
    justifyContent: "space-between",
    gap: CELL,
  },
  footerText: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 12,
    lineHeight: CELL,
  },
  // Everything here is counted in cells of the sheet (24 px). The page's
  // name is written on the second line from the top, so the row above it is
  // the margin; the columns stand two cells apart.
  lessonLayout: {
    width: "100%",
    // A big screen gives the task more width, so its picture can use the
    // window's height instead of leaving it empty under «Дальше».
    maxWidth: 1800,
    alignSelf: "center",
    paddingRight: CELL,
    paddingBottom: 38,
    flexDirection: "row",
    // The columns keep their own heights: stretched to the list of pages,
    // the lesson column handed the extra to the row of step squares.
    alignItems: "flex-start",
    gap: cells(2),
  },
  sidebar: { width: cells(10) },
  // Written level with the page's name, so the list starts level with the
  // step squares.
  sideHeading: { ...written(14, 2) },
  sideItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 4,
    paddingHorizontal: 11,
    minHeight: cells(2),
  },
  sideNumber: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 13,
    lineHeight: CELL,
    width: 28,
  },
  sideTitle: {
    fontFamily: f.bold,
    color: c.ink,
    fontSize: 14,
    lineHeight: CELL,
    flex: 1,
  },
  sideNote: { marginTop: cells(2), paddingHorizontal: 11 },
  sideNoteText: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: CELL,
    color: c.muted,
  },
  lessonMain: { minWidth: 0, maxWidth: "100%" },
  lessonTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minHeight: cells(2),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceLink: {
    fontFamily: f.bold,
    color: c.pen,
    textAlign: "right",
    ...written(15, 2),
  },
  // The name and what follows it stand on one line.
  lessonName: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: CELL / 2,
  },
  lessonTitle: { fontFamily: f.hand, color: c.pen, ...written(28, 2, true) },
  lessonTitleCompact: { ...written(26, 1, true), top: 3 },
  lessonSubtitle: {
    fontFamily: f.regular,
    color: c.muted,
    ...written(14, 2),
  },
  lessonSubtitleRow: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 13,
    lineHeight: CELL,
  },
  stepHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepText: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 14,
    lineHeight: CELL,
  },
  // The squares stand in a band of three rows, apart from the page's name
  // above and the task below; each takes two cells and is drawn a little
  // inside them. A small square gets a plain line: a hand-drawn one this
  // small reads as a smudge.
  stepDots: { gap: 8, paddingTop: 16, paddingBottom: 16 },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  // The current step is outlined in pen, not filled: one blue square in a
  // row of pencil ones is enough to find it.
  stepDone: {},
  stepActive: { borderColor: c.pen, borderWidth: 2 },
  stepDotText: {
    fontFamily: f.bold,
    color: c.muted,
    fontSize: 16,
    lineHeight: CELL,
  },
  stepDoneText: {
    fontFamily: f.hand,
    color: c.red,
    fontSize: 24,
    lineHeight: CELL,
  },
  exerciseCard: {},
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: CELL,
    marginTop: CELL,
  },
  // Half a cell under the button it explains.
  lockNote: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 14,
    lineHeight: CELL,
    textAlign: "right",
    marginTop: CELL / 2,
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
