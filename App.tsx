import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Andika_400Regular } from "@expo-google-fonts/andika/400Regular";
import { Andika_700Bold } from "@expo-google-fonts/andika/700Bold";
import { Neucha_400Regular } from "@expo-google-fonts/neucha/400Regular";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import Svg, { Path, Rect } from "react-native-svg";
import { pages, allBlocks, lessonPages } from "./src/content/book";
import { catalogPreviewId } from "./src/content/catalogPreview";
import { originalIllustrations } from "./src/content/illustrationMode";
import { revisedAssets } from "./src/content/revisedAssets";
import { vectorAssets } from "./src/content/vectorAssets";
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
import { Button } from "./src/components/Controls";
import { NotebookPaper } from "./src/components/NotebookPaper";
import { HandFrame, Rows } from "./src/components/HandDrawn";
import { CELL, cells, wholeCells, written } from "./src/lib/grid";
import { BookImage } from "./src/components/BookImage";
import { Library } from "./src/components/Library";
import { useLibraryLanguage } from "./src/localization/useLibraryLanguage";
import { Exercise } from "./src/components/Exercise";
import { TaskFitExtra, fitsPhone } from "./src/components/taskSize";
import { SettledWindow, useSettledWindowSource } from "./src/lib/settledWindow";
import { scrollbarGutter } from "./src/lib/scrollbar";
import { fitLook, startFit, type Fit } from "./src/lib/fit";
import { AdultGate } from "./src/components/AdultGate";
import {
  LessonNav,
  LessonTop,
  PageDone,
  StepList,
} from "./src/components/Lesson";
/** A step not answered yet: one object, so an unanswered step reads as unchanged. */
const NO_ANSWER: Answer = {};
const revisedPreviewIds = new Set(Object.keys(revisedAssets));
const vectorPreviewIds = new Set(Object.keys(vectorAssets));
function Main() {
  const [loaded, fontError] = useFonts({
    Andika_400Regular,
    Andika_700Bold,
    Neucha_400Regular,
    Inter_400Regular,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const [progress, setProgress] = useState<Progress>(emptyProgress),
    [ready, setReady] = useState(false),
    [home, setHome] = useState(true),
    [library, setLibrary] = useState(true),
    [parent, setParent] = useState(false),
    // The adults' part opens after a question a child does not answer.
    [adult, setAdult] = useState(false),
    [confirmReset, setConfirmReset] = useState(false),
    [drawing, setDrawing] = useState(false),
    [storageError, setStorageError] = useState(""),
    [catalogSection, setCatalogSection] = useState(0),
    [search, setSearch] = useState(""),
    // The list of the page's steps, the end of a page, and the word said
    // when «Дальше» is pressed too early.
    [stepsOpen, setStepsOpen] = useState(false),
    [pageEnd, setPageEnd] = useState(false),
    [lockNote, setLockNote] = useState(false);
  const libraryLanguage = useLibraryLanguage(library);
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
  // The window once it stands still: while it is dragged to a new size the
  // sheet keeps the old one and is laid out anew once.
  const held = useSettledWindowSource();
  const { width: windowWidth, height: windowHeight } = held;
  const width = windowWidth;
  const wide = width >= 1000,
    compact = width < 600;
  // The sheet is ruled from the left edge of the writing, and the writing is
  // a whole number of cells wide: what is measured in cells lies on the lines
  // at any window width. The sheet's width is reckoned from the window's, so
  // a window of a new size is laid out at once; measured, it would follow a
  // frame later. The measure only corrects what the reckoning cannot know.
  const paneWidth = Math.floor(width) - scrollbarGutter();
  const limit = home ? 1180 : 1800;
  const sheetKey = `${home}|${width}`;
  const [measured, setMeasured] = useState({ key: "", x: 0, width: 0 });
  const sheet =
    measured.key === sheetKey
      ? measured
      : {
          x: Math.max(0, (paneWidth - limit) / 2),
          width: Math.min(paneWidth, limit),
        };
  const sheetWidth = sheet.width;
  const measureSheet = (e: LayoutChangeEvent) => {
    const { x, width: w } = e.nativeEvent.layout;
    if (
      measured.key !== sheetKey ||
      Math.abs(x - measured.x) > 0.5 ||
      Math.abs(w - measured.width) > 0.5
    )
      setMeasured({ key: sheetKey, x, width: w });
  };
  // A phone keeps a quarter of a cell at each side at least; wider screens
  // have a margin of two cells on the left, as a notebook has, and at least
  // one on the right. On a computer a lesson leaves thirteen cells more on
  // the right: the help's card stands there, beside the task and not over
  // it. A task is at most 57 cells wide.
  const room = sheetWidth - cells(2) - CELL;
  const writing = compact
    ? wholeCells(sheetWidth - CELL / 2)
    : home
      ? wholeCells(room)
      : Math.min(
          cells(57),
          Math.max(
            wholeCells(room - cells(13)),
            Math.min(wholeCells(room), cells(33)),
          ),
        );
  const left = compact ? Math.floor((sheetWidth - writing) / 2) : cells(2);
  const paperOrigin = sheet.x + left;
  // Cards of the contents stand a cell apart, in whole cells.
  const cardColumns = wide ? 3 : compact ? 1 : 2;
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
  // Paper shows beside the sheet while the window is wider than it was.
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined")
      document.body.style.backgroundColor = c.paper;
  }, []);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    lastScroll.current = 0;
    setDrawing(false);
    setLockNote(false);
    setStepsOpen(false);
  }, [progress.page, progress.block, home, library, pageEnd]);
  useEffect(() => setPageEnd(false), [progress.page, progress.block, home]);
  // The way to the adults' part is asked for every time it is opened.
  useEffect(() => {
    if (!parent) setAdult(false);
  }, [parent]);
  useEffect(() => {
    if (!lockNote) return;
    const timer = setTimeout(() => setLockNote(false), 4000);
    return () => clearTimeout(timer);
  }, [lockNote]);
  const page = pages[progress.page - 1],
    block = page.blocks[progress.block],
    answer = progress.answers[block.id] ?? NO_ANSWER;
  // Off a phone the task is fitted to the window: right after a step opens,
  // the room left under the task (or the overflow) is measured and handed to
  // the picture or the sheet. Then the size is frozen, so nothing moves while
  // the child answers.
  const advance = canAdvance(block, answer);
  const [paneHeight, setPaneHeight] = useState(0);
  // What was handed over belongs to the step: a window of another size keeps
  // it (the formulas follow the window's height themselves) and is measured
  // again, so the task does not fall back to its first size and grow anew.
  const fitKey = `${home}|${pageEnd}|${block.id}`;
  const [fit, setFit] = useState({ key: "", extra: 0 });
  const leftKey = useRef("");
  // While a step that has just been opened is being fitted it is not shown:
  // the child sees it at its size, not growing and shrinking into it.
  const [shown, setShown] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setShown(fitKey), 450);
    return () => clearTimeout(timer);
  }, [fitKey]);
  const lessonMain = useRef<View>(null);
  useEffect(() => {
    setFit((f) => (f.key === fitKey ? f : { key: fitKey, extra: 0 }));
    // A phone scrolls, except for the tasks it shows whole.
    const fitted = !compact || fitsPhone(block.kind);
    if (!fitted || home || pageEnd) setShown(fitKey);
    if (!fitted || home || pageEnd || !paneHeight) return;
    // The task is looked at right after it is laid out and again once
    // pictures have loaded; each look goes on, a few frames apart, until the
    // task fits (see fitLook). Then the size stays as it is.
    // A task left as it is — too long for a phone — is not tried again when
    // it answers or the window changes: it would shrink and come back.
    const same =
      fit.key === fitKey &&
      leftKey.current === `${fitKey}|${windowWidth}x${windowHeight}`;
    let alive = true,
      state: Fit = {
        ...startFit(fit.key === fitKey ? fit.extra : 0),
        left: same,
      };
    const timers: ReturnType<typeof setTimeout>[] = [];
    const look = (more: number) =>
      lessonMain.current?.measureInWindow((_x, y, _w, h) => {
        if (!alive) return;
        const next = fitLook(
          state,
          y + h + lastScroll.current,
          paneHeight,
          more,
          compact,
        );
        if (next.fit.extra !== state.extra)
          setFit({ key: fitKey, extra: next.fit.extra });
        state = next.fit;
        if (state.left)
          leftKey.current = `${fitKey}|${windowWidth}x${windowHeight}`;
        if (next.show) setShown(fitKey);
        if (next.again) timers.push(setTimeout(() => look(more - 1), 40));
      });
    for (const ms of [30, 400, 1100])
      timers.push(setTimeout(() => look(8), ms));
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
    // Not when the task is answered: its size is settled when it opens, and
    // a picture that grew and shrank under the finger was a jump. What the
    // task answers with has rows kept for it from the start.
  }, [fitKey, windowWidth, windowHeight, paneHeight]);
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
    setLibrary(false);
  }
  // «№ 500» is a textbook exercise number; a bare number is a page.
  const query = search.trim(),
    byExercise = query.includes("№"),
    queryNumber = Number(query.replace(/[^0-9]/g, ""));
  const foundStep = (p: (typeof pages)[number]) =>
    byExercise
      ? p.blocks.findIndex((b) => b.exerciseNumber === queryNumber)
      : -1;
  const pageLine = `Страница ${page.number} · ${page.title}`,
    stepLine = `Шаг ${progress.block + 1} из ${page.blocks.length}`;
  // «Дальше» stands under the sheet and is always in view. «Проверить…» and
  // what the task answers with are parts of the task: on a task longer than
  // the screen the page glides just far enough to show them once the child
  // has answered, as the drawing sheet glides to its next line. A step
  // that was already solved when it opened stays where it is, and so does
  // one that has only been opened.
  const exerciseCard = useRef<View>(null);
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
      // What the task answered with — «верно» or where to look again — is
      // shown too, on a task long enough to be scrolled.
      const said = [
        ...(card?.querySelectorAll('[data-testid="task-result"]') ?? []),
      ].find((e) => (e as HTMLElement).innerText.trim() !== "") as
        HTMLElement | undefined;
      const result = answer.checked || advance ? said : undefined;
      const target = result ?? check,
        kind = result ? "result" : "check";
      // Each once per step: a later answer does not pull the page again.
      if (!target || g.shown.includes(kind)) return;
      const pane = verticalScrollPane(target);
      if (!pane) return;
      g.shown += kind;
      const box = target.getBoundingClientRect(),
        view = pane.getBoundingClientRect();
      // Down only, and never past the top of the task.
      const shift = box.bottom + 24 - view.bottom;
      if (shift > 1) pane.scrollBy({ top: shift, behavior: "smooth" });
    }, 350);
    return () => clearTimeout(timer);
  }, [answer, advance, drawing, home]);
  // A lesson page ends with a word about it; the book's other pages lead
  // back to the contents.
  const lastStep = progress.block === page.blocks.length - 1,
    lessonPage = progress.page >= 3 && progress.page < 142;
  function review(p: Progress) {
    const current = pages[p.page - 1].blocks[p.block];
    return current.kind === "read" ||
      (current.kind === "counters" &&
        current.expected === undefined &&
        Number(p.answers[current.id]?.value) > 0)
      ? {
          ...p.answers,
          [current.id]: { ...p.answers[current.id], reviewed: true },
        }
      : p.answers;
  }
  function next() {
    if (!pageEnd && !advance) {
      setLockNote(true);
      return;
    }
    if (pageEnd) {
      setProgress((p) => ({ ...p, page: p.page + 1, block: 0 }));
      return;
    }
    if (lastStep && lessonPage) {
      setProgress((p) => ({ ...p, answers: review(p) }));
      setPageEnd(true);
      return;
    }
    setProgress((p) =>
      p.block < pages[p.page - 1].blocks.length - 1
        ? { ...p, answers: review(p), block: p.block + 1 }
        : { ...p, answers: review(p), page: 3, block: 0 },
    );
    if (lastStep) setHome(true);
  }
  /** «Закончить» at the end of a page: the next lesson starts on the next page. */
  function finish() {
    setProgress((p) => ({ ...p, page: p.page + 1, block: 0 }));
    setHome(true);
  }
  function previous() {
    if (pageEnd) {
      setPageEnd(false);
      return;
    }
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
        accessibilityLabel={home ? "В библиотеку" : "На главную"}
        onPress={() => (home ? setLibrary(true) : setHome(true))}
        style={s.brand}
      >
        <Text style={s.brandTitle}>{home ? "‹ Библиотека" : "Арифметика"}</Text>
        {!home && <Text style={s.brandSub}>1 класс</Text>}
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
    <SettledWindow.Provider value={held}>
      <SafeAreaView
        // In a browser the sheet is as large as the window was when it last
        // stood still: nothing on it moves while the window is dragged.
        style={
          Platform.OS === "web"
            ? [s.sheet, { width: windowWidth, height: windowHeight }]
            : s.safe
        }
        edges={["top", "bottom", "left", "right"]}
      >
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
            flexDirection: "column",
          }}
        >
          <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <ScrollView
              testID="lesson-scroll-pane"
              style={[
                { flex: 1, minWidth: 0 },
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
              {!library && (
                <NotebookPaper margin={!compact} origin={paperOrigin} />
              )}
              {home && !library && header}
              {library ? (
                <Library
                  locale={libraryLanguage.locale}
                  onLocaleChange={libraryLanguage.chooseLocale}
                  copy={libraryLanguage.copy}
                  languageSaveError={libraryLanguage.saveError}
                  width={windowWidth}
                  hasProgress={!!stepsDone || progress.page > 1}
                  completed={finished}
                  total={lessonPages.length}
                  onOpenBook={() => setLibrary(false)}
                  onContinue={() => {
                    setLibrary(false);
                    if (stepsDone || progress.page > 1) setHome(false);
                    else selectPage(3);
                  }}
                  onParents={() => setParent(true)}
                />
              ) : home ? (
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
                      <View
                        style={[s.coverText, wide && { paddingRight: CELL }]}
                      >
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
                        <View
                          style={{ alignSelf: "flex-start", marginTop: CELL }}
                        >
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
                        <BookImage id="p010_boys_fishing" maxHeight={360} />
                      </View>
                    </Rows>
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
                      {/* The cover, the book's own contents and its imprint
                          are not lessons: they are not offered on the
                          page, and are found by their number or name. */}
                      {(search.trim()
                        ? pages.filter((p) => p.number !== 2)
                        : lessonPages
                      )
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
                          const previewId = catalogPreviewId(
                            p,
                            revisedPreviewIds,
                            vectorPreviewIds,
                            originalIllustrations,
                          );
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
                                <Text style={s.pageNumber}>
                                  стр. {p.number}
                                </Text>
                                <Text
                                  style={[s.pageStatus, done && s.pageDone]}
                                >
                                  {foundStep(p) >= 0
                                    ? `№ ${queryNumber} · шаг ${foundStep(p) + 1}`
                                    : done
                                      ? "✓"
                                      : p.number < 3
                                        ? "знакомство"
                                        : count > 0
                                          ? `${count} из ${p.blocks.length}`
                                          : ""}
                                </Text>
                              </View>
                              <View style={s.cardArt}>
                                {previewId ? (
                                  <BookImage
                                    id={previewId}
                                    maxHeight={cells(8)}
                                  />
                                ) : (
                                  <View style={s.cardNumberArt}>
                                    <Text style={s.cardNumberArtText}>
                                      {p.number}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text style={s.cardTitle}>{p.title}</Text>
                              <Text style={s.cardSubtitle}>{p.subtitle}</Text>
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
                    // On a phone the row kept empty under a fitted task is
                    // margin enough.
                    compact && { paddingRight: left, paddingBottom: 0 },
                  ]}
                >
                  <View
                    ref={lessonMain}
                    style={[s.lessonMain, { width: writing }]}
                  >
                    {pageEnd ? (
                      <View testID="exercise-card">
                        <LessonTop
                          compact={compact}
                          width={writing}
                          line={pageLine}
                          step={stepLine}
                          onHome={() => setHome(true)}
                          onSteps={() => setStepsOpen(true)}
                          help={null}
                        />
                        <PageDone
                          number={page.number}
                          title={page.title}
                          done={pageDone}
                          total={page.blocks.length}
                          onFinish={finish}
                        />
                      </View>
                    ) : (
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
                            veiled={shown !== fitKey}
                            header={(help) => (
                              <LessonTop
                                compact={compact}
                                width={writing}
                                line={pageLine}
                                step={stepLine}
                                onHome={() => setHome(true)}
                                onSteps={() => setStepsOpen(true)}
                                help={help}
                              />
                            )}
                            revealCoachTarget={(target) =>
                              new Promise<void>((resolve) => {
                                const container =
                                  scroll.current?.getInnerViewNode();
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
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
            {!home && (
              <LessonNav
                left={paperOrigin}
                width={writing}
                back={{
                  disabled:
                    !pageEnd &&
                    progress.block === 0 &&
                    (progress.page <= 3 || progress.page > 142),
                  onPress: previous,
                }}
                next={{
                  label: pageEnd
                    ? "Продолжить →"
                    : lastStep && !lessonPage
                      ? "К страницам →"
                      : "Дальше →",
                  locked: !pageEnd && !advance,
                  onPress: next,
                }}
                note={lockNote ? "Сначала сделай задание" : ""}
              />
            )}
          </View>
        </View>
        <StepList
          visible={stepsOpen}
          title={page.title}
          subtitle={`Страница ${page.number} · ${page.subtitle}`}
          steps={page.blocks.map((b) => ({
            id: b.id,
            title: b.title,
            done: isDone(b, progress.answers[b.id]),
          }))}
          current={pageEnd ? -1 : progress.block}
          onPick={(i) => {
            setStepsOpen(false);
            setPageEnd(false);
            setProgress((p) => ({ ...p, block: i }));
          }}
          onClose={() => setStepsOpen(false)}
        />
        <Modal
          visible={parent}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setParent(false);
            setAdult(false);
            setConfirmReset(false);
          }}
        >
          <View style={s.modalShade}>
            <View style={s.parentPanel}>
              {!adult && !library ? (
                <ScrollView>
                  <AdultGate
                    library={library}
                    onPass={() => setAdult(true)}
                    onClose={() => setParent(false)}
                  />
                </ScrollView>
              ) : (
                <ScrollView contentContainerStyle={{ gap: 20, padding: 28 }}>
                  <Text style={s.modalTitle}>
                    {library
                      ? libraryLanguage.copy.parentsTitle
                      : "Учимся вместе"}
                  </Text>
                  {library ? (
                    <Text testID="library-parent-info" style={s.parentBody}>
                      {libraryLanguage.copy.parentsBody}
                    </Text>
                  ) : (
                    <>
                      <Text style={s.parentBody}>
                        Это тестовая версия полного учебника: 144 страницы и
                        задания до числа 100. Начать можно с любой страницы.
                      </Text>
                      <Text style={s.parentBody}>
                        Нажатия на рисунки, числа и фигуры проверяются
                        автоматически. Прописи проверяются по форме и положению
                        линии на клетчатом поле. Это проверка обведения образца,
                        а не распознавание свободного рисунка.
                      </Text>
                      <Text style={s.parentBody}>
                        Мешки на странице 5 перекрываются. В этом задании нет
                        строгой числовой оценки. Это свободная тренировка
                        выкладывания палочек; переход не означает проверку
                        количества.
                      </Text>
                      <Text style={s.parentBody}>
                        Пропущенные шаги остаются незавершёнными. Прогресс
                        хранится только на этом устройстве; аккаунта и
                        синхронизации нет.
                      </Text>
                      <Text style={s.parentBody}>
                        Озвучивание временно отключено: кнопки «Слушать» нет,
                        пока не выбран голос диктора. Читайте задания вместе.
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
                            Удалить все ответы и рисунки в учебнике «Арифметика
                            · 1 класс»? Это действие нельзя отменить.
                          </Text>
                          <Button
                            onPress={() => {
                              setProgress(emptyProgress());
                              setConfirmReset(false);
                              setParent(false);
                              setAdult(false);
                              setHome(true);
                            }}
                          >
                            Да, удалить прогресс
                          </Button>
                          <Button
                            secondary
                            onPress={() => setConfirmReset(false)}
                          >
                            Отмена
                          </Button>
                        </View>
                      ) : (
                        <Button secondary onPress={() => setConfirmReset(true)}>
                          Начать заново…
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    testID={library ? "library-parent-close" : undefined}
                    onPress={() => {
                      setParent(false);
                      setAdult(false);
                      setConfirmReset(false);
                    }}
                  >
                    {library
                      ? libraryLanguage.copy.back
                      : "Вернуться к учебнику"}
                  </Button>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SettledWindow.Provider>
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
  sheet: { flexGrow: 0, flexShrink: 0, backgroundColor: c.paper },
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
  coverText: { flex: 1, alignSelf: "stretch" },
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
  // The label and the picture stand on one line: their tops are level.
  coverContent: { flexDirection: "row", alignItems: "flex-start", gap: CELL },
  coverFoot: {
    fontFamily: f.regular,
    color: c.ink,
    fontSize: 15,
    lineHeight: CELL,
    marginTop: CELL,
  },
  coverArt: {
    width: "52%",
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
  // Larger cards give the lesson illustration enough room to read.
  pageCard: {
    backgroundColor: c.card,
    padding: CELL / 2,
    minHeight: cells(15),
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
    height: cells(8),
    justifyContent: "center",
    marginBottom: CELL / 2,
  },
  cardNumberArt: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#edf3f1",
    borderRadius: 4,
  },
  cardNumberArtText: {
    fontFamily: f.hand,
    fontSize: 78,
    lineHeight: 96,
    color: c.pen,
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
  // Everything here is counted in cells of the sheet (24 px): an empty row
  // over the task, the task itself, an empty row under it.
  lessonLayout: {
    width: "100%",
    // A big screen gives the task more width, so its picture can use the
    // window's height.
    maxWidth: 1800,
    alignSelf: "center",
    paddingRight: CELL,
    paddingTop: CELL,
    paddingBottom: CELL,
    alignItems: "flex-start",
  },
  lessonMain: { minWidth: 0, maxWidth: "100%" },
  exerciseCard: {},
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
