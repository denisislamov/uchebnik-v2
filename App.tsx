import React, { useEffect, useRef, useState } from "react";
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
import { Nunito_400Regular } from "@expo-google-fonts/nunito/400Regular";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import * as Speech from "expo-speech";
import { pages, allBlocks } from "./src/content/book";
import type { Answer, Progress } from "./src/content/types";
import {
  emptyProgress,
  isDone,
  pageCompleted,
  parseProgress,
} from "./src/lib/assessment";
import { readProgress, saveProgress } from "./src/lib/storage";
import { colors as c, fonts as f } from "./src/theme";
import { Button, ProgressBar } from "./src/components/Controls";
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
                style={{ fontFamily: f.bold, fontSize: 19, color: c.green }}
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
    Nunito_400Regular,
    Nunito_700Bold,
    Nunito_800ExtraBold,
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
          setProgress(parseProgress(raw, pages));
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
    setDrawing(false);
    setSpeaking(false);
    setSpeechError("");
    void Speech.stop();
  }, [progress.page, progress.block, home]);
  const page = pages[progress.page - 1],
    block = page.blocks[progress.block],
    answer = progress.answers[block.id] ?? {};
  const finished = pages.filter((p) =>
    pageCompleted(p, progress.answers),
  ).length;
  const stepsDone = allBlocks.filter((b) =>
    isDone(b, progress.answers[b.id]),
  ).length;
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
        : p.page < pages.length
          ? { ...p, answers, page: p.page + 1, block: 0 }
          : { ...p, answers };
    });
    if (
      progress.page === pages.length &&
      progress.block === page.blocks.length - 1
    )
      setHome(true);
  }
  function previous() {
    setProgress((p) =>
      p.block > 0
        ? { ...p, block: p.block - 1 }
        : p.page > 1
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
        <ActivityIndicator color={c.green} />
        <Text style={{ color: c.green, marginTop: 20 }}>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="На главную"
          onPress={() => setHome(true)}
          style={s.brand}
        >
          <View style={s.brandIcon}>
            <Text style={s.brandGlyph}>а</Text>
          </View>
          <View>
            <Text style={s.brandTitle}>арифметика</Text>
            <Text style={s.brandSub}>МАЛЕНЬКИЕ ШАГИ · БОЛЬШИЕ ОТКРЫТИЯ</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Информация для родителей"
          onPress={() => setParent(true)}
          style={s.parentButton}
        >
          <Text style={s.parentText}>
            {compact ? "Для взрослых" : "Родителям  ↗"}
          </Text>
        </Pressable>
      </View>
      {storageError !== "" && (
        <View accessibilityRole="alert" style={s.storageError}>
          <Text style={{ color: "#8a4a26", flex: 1 }}>{storageError}</Text>
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
          style={{ flex: comparison ? 0.52 : 1, minWidth: 0 }}
          ref={scroll}
          scrollEnabled={!drawing}
          contentContainerStyle={s.scroll}
        >
          {home ? (
            <View
              style={[
                s.home,
                compact && { paddingHorizontal: 18, paddingTop: 28 },
              ]}
            >
              <View
                style={[s.hero, !wide && { flexDirection: "column", gap: 28 }]}
              >
                <View style={[s.heroText, wide && { paddingRight: 48 }]}>
                  <View style={s.badge}>
                    <View style={s.badgeDot} />
                    <Text style={s.badgeText}>
                      ПЕРВЫЙ КЛАСС · ОТ ОДНОГО ДО СТА
                    </Text>
                  </View>
                  <Text
                    style={[
                      s.heroTitle,
                      compact && { fontSize: 44, lineHeight: 49 },
                    ]}
                  >
                    Большое путешествие{"\n"}начинается{"\n"}с{" "}
                    <Text style={{ color: c.orange }}>одного.</Text>
                  </Text>
                  <Text style={s.heroDescription}>
                    Считаем рыбок, сравниваем мячи и рисуем первые цифры.
                    Знакомый учебник — теперь с маленькими открытиями на каждом
                    шаге.
                  </Text>
                  <View style={{ alignSelf: "flex-start", marginTop: 28 }}>
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
                  <Text style={s.heroFoot}>
                    Слушай, пробуй и открывай. В своём темпе.
                  </Text>
                </View>
                <View
                  style={[
                    s.heroArt,
                    !wide && {
                      width: "100%",
                      maxWidth: 550,
                      alignSelf: "center",
                    },
                  ]}
                >
                  <View style={s.artTag}>
                    <Text style={s.artTagText}>ИЗ УЧЕБНИКА 1959 ГОДА</Text>
                  </View>
                  <BookImage id="p010_boys_fishing" maxHeight={350} />
                  <View style={s.numberTiles}>
                    {[1, 2, 3].map((n) => (
                      <View
                        key={n}
                        style={[
                          s.numberTile,
                          n === 2 && {
                            backgroundColor: c.orange,
                            transform: [{ rotate: "6deg" }],
                          },
                          n === 3 && {
                            backgroundColor: c.sand,
                            transform: [{ rotate: "-5deg" }],
                          },
                        ]}
                      >
                        <Text
                          style={[s.tileDigit, n === 3 && { color: c.green }]}
                        >
                          {n}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.artCaption}>Два рыбака. И ещё один друг.</Text>
                </View>
              </View>
              <View style={s.pathHeading}>
                <View>
                  <Text style={s.eyebrow}>НАША МАЛЕНЬКАЯ ПРОГРАММА</Text>
                  <Text style={s.sectionTitle}>Весь учебник</Text>
                </View>
                <Text style={s.progressText}>
                  {finished} из {pages.length} пройдено
                </Text>
              </View>
              <ProgressBar value={finished / pages.length} />
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
                    "Оглавление",
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
                  style={{
                    padding: 14,
                    borderWidth: 1,
                    borderColor: c.line,
                    borderRadius: 12,
                    fontFamily: f.regular,
                    fontSize: 18,
                    color: c.green,
                  }}
                />
              </View>
              <View style={s.pageGrid}>
                {pages
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
                          <Text style={s.pageNumber}>
                            {String(p.number).padStart(2, "0")}
                          </Text>
                          <Text
                            style={[s.pageStatus, done && { color: c.green }]}
                          >
                            {done
                              ? "✓"
                              : p.number < 3
                                ? "ЗНАКОМСТВО"
                                : `${p.blocks.length} шагов`}
                          </Text>
                        </View>
                        <View style={s.cardArt}>
                          <BookImage id={p.hero} maxHeight={108} />
                        </View>
                        <Text style={s.cardTitle}>{p.title}</Text>
                        <Text style={s.cardSubtitle}>{p.subtitle}</Text>
                        <View style={{ marginTop: "auto", paddingTop: 18 }}>
                          <ProgressBar value={count / p.blocks.length} />
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
                compact && { paddingHorizontal: 14, paddingTop: 20 },
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
                  <Text style={s.eyebrow}>СОСЕДНИЕ СТРАНИЦЫ</Text>
                  {pages
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
                            backgroundColor: c.mint,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.sideNumber,
                            page.number === p.number && { color: c.green },
                          ]}
                        >
                          {pageCompleted(p, progress.answers)
                            ? "✓"
                            : String(p.number).padStart(2, "0")}
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
                      {wide ? "УЧЕБНИК / АРИФМЕТИКА" : "← Все страницы"}
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
                    ШАГ {progress.block + 1} ИЗ {page.blocks.length}
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
                        isDone(b, progress.answers[b.id]) && {
                          borderColor: c.green,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.stepDotText,
                          i === progress.block && { color: c.white },
                        ]}
                      >
                        {isDone(b, progress.answers[b.id]) ? "✓" : i + 1}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={[s.exerciseCard, compact && { padding: 20 }]}>
                  <View style={s.exerciseTop}>
                    <Text style={s.exerciseCategory}>
                      {block.kind === "read"
                        ? "РАССМАТРИВАЕМ"
                        : block.kind === "draw"
                          ? "ТВОРЧЕСКАЯ МАСТЕРСКАЯ"
                          : block.kind === "shape"
                            ? "СОБИРАЕМ ФИГУРУ"
                            : "ПОПРОБУЙ САМ"}
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
                  />
                </View>
                <View style={s.navigation}>
                  <Button
                    secondary
                    disabled={progress.page === 1 && progress.block === 0}
                    onPress={previous}
                  >
                    ← Назад
                  </Button>
                  <Button onPress={next}>
                    {progress.page === pages.length &&
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
                    backgroundColor: c.sand,
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
  header: {
    paddingVertical: 18,
    paddingHorizontal: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: c.line,
    gap: 12,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  brandIcon: {
    width: 42,
    height: 46,
    backgroundColor: c.green,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-5deg" }],
  },
  brandGlyph: {
    fontFamily: f.serif,
    fontSize: 36,
    color: c.card,
    lineHeight: 42,
  },
  brandTitle: {
    fontFamily: f.heavy,
    fontSize: 23,
    color: c.green,
    letterSpacing: -0.6,
  },
  brandSub: {
    fontFamily: f.bold,
    fontSize: 7,
    letterSpacing: 0.9,
    color: c.muted,
  },
  parentButton: { paddingVertical: 12, paddingHorizontal: 8 },
  parentText: { fontFamily: f.bold, fontSize: 14, color: c.green },
  scroll: { flexGrow: 1 },
  home: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    padding: 42,
    paddingTop: 58,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 40,
    marginBottom: 64,
  },
  heroText: { flex: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 22,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.orange },
  badgeText: {
    fontFamily: f.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: c.green,
  },
  heroTitle: {
    fontFamily: f.serif,
    fontSize: 59,
    lineHeight: 65,
    color: c.green,
    letterSpacing: -1.5,
  },
  heroDescription: {
    fontFamily: f.regular,
    fontSize: 17,
    lineHeight: 28,
    color: c.muted,
    marginTop: 24,
    maxWidth: 455,
  },
  heroFoot: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 12,
    marginTop: 14,
  },
  heroArt: {
    width: "44%",
    backgroundColor: "#ede5d3",
    borderRadius: 120,
    borderBottomLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 28,
    paddingTop: 48,
    alignItems: "center",
  },
  artTag: {
    position: "absolute",
    top: 15,
    alignSelf: "center",
    backgroundColor: c.card,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 6,
    transform: [{ rotate: "-3deg" }],
  },
  artTagText: {
    fontFamily: f.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: c.green,
  },
  numberTiles: { flexDirection: "row", gap: 15, marginTop: -5 },
  numberTile: {
    width: 65,
    height: 77,
    backgroundColor: c.green,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-7deg" }],
    borderWidth: 1,
    borderColor: "#ffffff55",
  },
  tileDigit: {
    fontFamily: f.serif,
    fontSize: 51,
    lineHeight: 63,
    color: c.card,
  },
  artCaption: {
    fontFamily: f.regular,
    fontSize: 12,
    color: c.muted,
    marginTop: 18,
  },
  pathHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 22,
    flexWrap: "wrap",
  },
  eyebrow: {
    fontFamily: f.bold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: c.muted,
    marginBottom: 9,
  },
  sectionTitle: { fontFamily: f.serif, color: c.green, fontSize: 34 },
  progressText: {
    fontFamily: f.bold,
    color: c.green,
    fontSize: 13,
    paddingBottom: 4,
  },
  pageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 25 },
  pageCard: {
    backgroundColor: c.card,
    padding: 17,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 18,
    minHeight: 265,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  pageNumber: { fontFamily: f.bold, fontSize: 13, color: c.green },
  pageStatus: {
    fontFamily: f.bold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: c.muted,
  },
  cardArt: { height: 110, justifyContent: "center", marginBottom: 18 },
  cardTitle: {
    fontFamily: f.heavy,
    fontSize: 17,
    lineHeight: 23,
    color: c.green,
  },
  cardSubtitle: {
    fontFamily: f.regular,
    fontSize: 12,
    lineHeight: 18,
    color: c.muted,
    marginTop: 6,
  },
  homeFooter: {
    borderTopWidth: 1,
    borderColor: c.line,
    marginTop: 42,
    paddingTop: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  footerText: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 11,
    lineHeight: 18,
  },
  lessonLayout: {
    width: "100%",
    maxWidth: 1230,
    alignSelf: "center",
    padding: 38,
    flexDirection: "row",
    gap: 55,
  },
  sidebar: { width: 235, paddingTop: 4 },
  back: { fontFamily: f.bold, fontSize: 12, color: c.muted },
  sideItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 12,
    padding: 13,
    marginTop: 4,
  },
  sideNumber: { fontFamily: f.bold, color: c.muted, fontSize: 12, width: 22 },
  sideTitle: { fontFamily: f.bold, color: c.green, fontSize: 13, flex: 1 },
  sideNote: {
    marginTop: 32,
    padding: 18,
    backgroundColor: c.sand,
    borderRadius: 16,
  },
  sideNoteTitle: {
    fontFamily: f.bold,
    fontSize: 13,
    color: c.green,
    marginBottom: 8,
  },
  sideNoteText: {
    fontFamily: f.regular,
    fontSize: 12,
    lineHeight: 20,
    color: c.muted,
  },
  lessonMain: { flex: 1, minWidth: 0, maxWidth: 780 },
  lessonTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 26,
  },
  sourceLink: {
    fontFamily: f.bold,
    color: c.green,
    fontSize: 13,
    paddingVertical: 10,
  },
  lessonTitle: {
    fontFamily: f.serif,
    color: c.green,
    fontSize: 42,
    lineHeight: 49,
  },
  lessonSubtitle: {
    fontFamily: f.regular,
    fontSize: 14,
    lineHeight: 22,
    color: c.muted,
    marginTop: 10,
  },
  stepHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 27,
    marginBottom: 10,
  },
  stepText: {
    fontFamily: f.bold,
    color: c.muted,
    fontSize: 10,
    letterSpacing: 1,
  },
  stepDots: { gap: 7, paddingVertical: 17 },
  stepDot: {
    width: 39,
    height: 39,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepActive: { backgroundColor: c.green, borderColor: c.green },
  stepDotText: { fontFamily: f.bold, color: c.green, fontSize: 12 },
  exerciseCard: {
    backgroundColor: c.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.line,
    padding: 32,
  },
  exerciseTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  exerciseCategory: {
    fontFamily: f.bold,
    color: c.orange,
    fontSize: 9,
    letterSpacing: 1.3,
  },
  speechButton: {
    backgroundColor: c.mint,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  speechText: { fontFamily: f.bold, color: c.green, fontSize: 12 },
  blockTitle: {
    fontFamily: f.serif,
    color: c.green,
    fontSize: 29,
    marginBottom: 20,
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 22,
  },
  saveNote: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 11,
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
    fontFamily: f.bold,
    fontSize: 22,
    color: c.green,
    flexShrink: 1,
  },
  modalShade: {
    flex: 1,
    backgroundColor: "#162b26aa",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  parentPanel: {
    maxWidth: 580,
    width: "100%",
    maxHeight: "90%",
    backgroundColor: c.card,
    borderRadius: 22,
    overflow: "hidden",
  },
  parentBody: {
    fontFamily: f.regular,
    color: c.green,
    fontSize: 16,
    lineHeight: 25,
  },
  storageError: {
    backgroundColor: "#fff0dc",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
