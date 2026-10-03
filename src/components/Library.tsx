import React, { useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { libraryColors as c, libraryFonts as f } from "./libraryTheme";
import {
  plannedBooks,
  PROJECT_SUPPORT_URL,
  PROJECT_FUNDING,
} from "../content/library";
import { libraryCover } from "../content/libraryCover";
import { LanguagePicker } from "./LanguagePicker";
import Svg, { Path } from "react-native-svg";
import {
  libraryText,
  type LibraryCopy,
  type LibraryLocale,
} from "../localization/library";

function SupportProject({
  compact,
  copy: t,
  locale,
}: {
  compact: boolean;
  copy: LibraryCopy;
  locale: LibraryLocale;
}) {
  const [error, setError] = useState(false);
  const url = PROJECT_SUPPORT_URL.trim();
  const { raised, goal } = PROJECT_FUNDING;
  const fraction = goal > 0 ? Math.max(0, Math.min(1, raised / goal)) : 0;
  const rubles = (amount: number) => `${amount.toLocaleString(locale)} ₽`;
  const amounts = { raised: rubles(raised), goal: rubles(goal) };
  return (
    <View
      testID="support-project"
      style={[s.support, compact && s.supportCompact]}
    >
      <View style={s.funding}>
        <Text
          style={[s.supportTitle, compact && { fontSize: 20, lineHeight: 28 }]}
        >
          {t.supportTitle}
        </Text>
        <Text style={s.fundingAmount}>{libraryText(t.funding, amounts)}</Text>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t.fundingLabel}
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={raised}
          aria-valuetext={libraryText(t.fundingAccessible, amounts)}
          style={s.fundingTrack}
        >
          <View
            testID="funding-fill"
            style={[s.fundingFill, { width: `${fraction * 100}%` }]}
          />
        </View>
      </View>
      <View style={s.supportAction}>
        <Pressable
          accessibilityRole={url ? "link" : "button"}
          accessibilityLabel={t.supportLabel}
          accessibilityState={{ disabled: !url }}
          disabled={!url}
          {...(Platform.OS === "web" && url
            ? {
                href: url,
                hrefAttrs: { target: "_blank", rel: "noopener noreferrer" },
              }
            : {})}
          onPress={
            Platform.OS === "web"
              ? undefined
              : () => {
                  setError(false);
                  Linking.openURL(url).catch(() => setError(true));
                }
          }
          style={({ pressed }) => [
            s.action,
            s.supportButton,
            pressed && s.pressed,
          ]}
        >
          <Text style={[s.actionText, s.supportButtonText]}>{t.support} ↗</Text>
        </Pressable>
        <Text style={s.note}>{url ? "Boosty" : t.supportSoon}</Text>
        {error && (
          <Text accessibilityRole="alert" style={s.note}>
            {t.supportError}
          </Text>
        )}
      </View>
    </View>
  );
}

export function Library({
  width,
  hasProgress,
  completed,
  total,
  onOpenBook,
  onContinue,
  onParents,
  locale,
  onLocaleChange,
  copy: t,
  languageSaveError,
}: {
  width: number;
  hasProgress: boolean;
  completed: number;
  total: number;
  onOpenBook: () => void;
  onContinue: () => void;
  onParents: () => void;
  locale: LibraryLocale;
  onLocaleChange: (locale: LibraryLocale) => void;
  copy: LibraryCopy;
  languageSaveError: boolean;
}) {
  const singleColumn = width < 1000;
  const phone = width < 600;
  const gutter = singleColumn ? 20 : 48;
  const contentWidth = Math.min(width, 1248) - gutter * 2;
  const futurePanelWidth = singleColumn
    ? contentWidth
    : (contentWidth - 48) * 0.56;
  const plannedColumns = futurePanelWidth < 460 ? 2 : 3;
  const futureWidth = Math.min(150, futurePanelWidth / plannedColumns - 16);
  const coverWidth = phone ? (width < 360 ? 112 : 128) : 180;
  const shelfRows = Array.from(
    { length: Math.ceil(plannedBooks.length / plannedColumns) },
    (_, row) =>
      plannedBooks.slice(row * plannedColumns, (row + 1) * plannedColumns),
  );
  const bookDetails = (
    <View style={s.bookInfo}>
      <View style={s.bookHeading}>
        {!phone && (
          <Text accessibilityRole="header" style={s.bookTitle}>
            {t.arithmetic}
          </Text>
        )}
        <Text style={s.grade}>{t.grade}</Text>
      </View>
      <Text style={s.methodology}>{t.methodology}</Text>
      {locale !== "ru" && <Text style={s.note}>{t.bookLanguage}</Text>}
      {hasProgress && (
        <Text style={s.note}>
          {libraryText(t.progress, { completed, total })}
        </Text>
      )}
    </View>
  );
  return (
    <View testID="library-home" style={s.page}>
      <View style={[s.container, { paddingHorizontal: gutter }]}>
        <View style={[s.header, width < 800 && s.headerCompact]}>
          <View style={s.brand}>
            <View style={s.brandMark} aria-hidden>
              <Svg width={28} height={28} viewBox="0 0 28 28">
                <Path
                  d="M14 7C11 4 6 4 3 5v17c4-1 8-1 11 2 3-3 7-3 11-2V5c-3-1-8-1-11 2Zm0 0v17"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text
              accessibilityRole="header"
              style={[s.brandTitle, phone && { fontSize: 22, lineHeight: 28 }]}
            >
              {t.title}
            </Text>
          </View>
          <View
            style={[
              s.headerTools,
              width < 800 && { width: "100%", maxWidth: 420 },
            ]}
          >
            <LanguagePicker
              locale={locale}
              onChange={onLocaleChange}
              copy={t}
            />
            <Pressable
              testID="library-parents"
              accessibilityRole="button"
              accessibilityLabel={t.parentsLabel}
              onPress={onParents}
              style={({ pressed }) => [
                s.headerButton,
                pressed && s.secondaryPressed,
              ]}
            >
              <Text style={s.headerButtonText}>{t.parents}</Text>
            </Pressable>
          </View>
        </View>
        {languageSaveError && (
          <Text accessibilityRole="alert" style={[s.note, { marginTop: 12 }]}>
            {t.languageSaveError}
          </Text>
        )}
        <View
          style={[
            s.intro,
            phone && { paddingTop: 16, paddingBottom: 20, gap: 8 },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[s.introTitle, phone && s.introTitlePhone]}
          >
            {t.chooseBook}
          </Text>
          <Text style={[s.subtitle, phone && { fontSize: 18, lineHeight: 26 }]}>
            {t.subtitle}
          </Text>
        </View>
        <View style={[s.libraryLayout, singleColumn && s.libraryLayoutCompact]}>
          <View style={[s.currentColumn, singleColumn && { width: "100%" }]}>
            {phone && (
              <Text
                accessibilityRole="header"
                style={[s.bookTitle, { marginBottom: 12 }]}
              >
                {t.arithmetic}
              </Text>
            )}
            <View
              testID="available-book"
              style={[s.availableRow, { gap: phone ? 20 : 28 }]}
            >
              <View style={s.standingBook}>
                <BookVolume
                  width={coverWidth}
                  height={coverWidth * 1.5}
                  edgeColor="#a87839"
                >
                  <Pressable
                    accessibilityRole="button"
                    testID="library-open-book"
                    accessibilityLabel={t.openBook}
                    onPress={onOpenBook}
                    style={({ pressed }) => [
                      s.book,
                      { width: coverWidth, height: coverWidth * 1.5 },
                      pressed && s.pressed,
                    ]}
                  >
                    <Image
                      accessibilityLabel={t.cover}
                      source={libraryCover}
                      style={s.coverImage}
                      resizeMode="cover"
                    />
                    <View pointerEvents="none" style={s.spine} />
                  </Pressable>
                </BookVolume>
              </View>
              {phone && bookDetails}
            </View>
            <View style={s.bookShelf} />
            {!phone && <View style={{ marginTop: 24 }}>{bookDetails}</View>}
            <View style={s.bookActions}>
              <BookActions
                copy={t}
                hasProgress={hasProgress}
                onContinue={onContinue}
                onOpenBook={onOpenBook}
              />
            </View>
            <SupportProject compact copy={t} locale={locale} />
          </View>
          <View style={[s.plans, singleColumn && s.plansCompact]}>
            <Text accessibilityRole="header" style={s.plansTitle}>
              {t.moreSubjects}
            </Text>
            {shelfRows.map((books, row) => (
              <View key={row} style={s.shelfRow}>
                <View
                  style={[
                    s.rowBooks,
                    { height: Math.max(210, futureWidth * 1.48) + 14 },
                  ]}
                >
                  {books.map((book, index) => (
                    <View
                      key={book.id}
                      style={[
                        s.plannedSlot,
                        { width: `${100 / plannedColumns}%` },
                      ]}
                    >
                      <BookVolume
                        width={futureWidth - (index === 1 ? 6 : 0)}
                        height={Math.max(
                          210,
                          futureWidth * [1.44, 1.3, 1.38][(row + index) % 3],
                        )}
                        edgeColor={
                          bookTones[
                            (row * plannedColumns + index) % bookTones.length
                          ].ink
                        }
                      >
                        <View
                          testID="planned-cover"
                          style={[
                            s.book,
                            s.plannedCover,
                            {
                              width: futureWidth - (index === 1 ? 6 : 0),
                              height: Math.max(
                                210,
                                futureWidth *
                                  [1.44, 1.3, 1.38][(row + index) % 3],
                              ),
                              backgroundColor:
                                bookTones[
                                  (row * plannedColumns + index) %
                                    bookTones.length
                                ].paper,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.plannedTitle,
                              {
                                color:
                                  bookTones[
                                    (row * plannedColumns + index) %
                                      bookTones.length
                                  ].ink,
                              },
                            ]}
                          >
                            {t.books[book.id]}
                          </Text>
                          <View style={s.coverRule} />
                          <Text
                            style={[
                              s.plannedSymbol,
                              futureWidth < 134 && {
                                fontSize: 34,
                                lineHeight: 42,
                              },
                              {
                                color:
                                  bookTones[
                                    (row * plannedColumns + index) %
                                      bookTones.length
                                  ].ink,
                              },
                            ]}
                          >
                            {locale !== "ru" &&
                            (book.id === "reading" || book.id === "russian")
                              ? "Aa"
                              : book.symbol}
                          </Text>
                          <View pointerEvents="none" style={s.spine} />
                        </View>
                      </BookVolume>
                    </View>
                  ))}
                </View>
                <View style={s.bookShelf} />
                <View style={s.rowLabels}>
                  {books.map((book) => (
                    <Text
                      key={book.id}
                      style={[
                        s.plannedStatus,
                        { width: `${100 / plannedColumns}%` },
                      ]}
                    >
                      {t.planned}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const bookTones = [
  { paper: "#eeeafa", ink: "#6250cc" },
  { paper: "#ffe8d5", ink: "#a75222" },
  { paper: "#e2edfb", ink: "#306d98" },
  { paper: "#ddf1e8", ink: "#28785c" },
];

/** Keep the page block behind the front cover so its full face remains readable. */
function BookVolume({
  width,
  height,
  edgeColor,
  children,
}: {
  width: number;
  height: number;
  edgeColor: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ width: width + 14, height }}>
      <View
        pointerEvents="none"
        style={[s.backCover, { backgroundColor: edgeColor }]}
      />
      <View pointerEvents="none" style={s.pageEdge}>
        {[0, 1, 2, 3].map((line) => (
          <View key={line} style={[s.pageLine, { right: 2 + line * 2 }]} />
        ))}
      </View>
      {children}
    </View>
  );
}

function BookActions({
  copy: t,
  hasProgress,
  onContinue,
  onOpenBook,
}: {
  copy: LibraryCopy;
  hasProgress: boolean;
  onContinue: () => void;
  onOpenBook: () => void;
}) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasProgress ? t.resumeLabel : t.startLabel}
        onPress={onContinue}
        style={({ pressed }) => [s.action, pressed && s.pressed]}
      >
        <Text style={s.actionText}>{hasProgress ? t.resume : t.start} →</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.contentsLabel}
        onPress={onOpenBook}
        style={({ pressed }) => [
          s.action,
          s.secondaryAction,
          pressed && s.secondaryPressed,
        ]}
      >
        <Text style={[s.actionText, { color: c.ink }]}>{t.contents}</Text>
      </Pressable>
    </>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: c.paper },
  container: {
    width: "100%",
    maxWidth: 1248,
    alignSelf: "center",
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  headerCompact: { flexDirection: "column", alignItems: "flex-start", gap: 12 },
  brand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minWidth: 0,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.pen,
    justifyContent: "center",
    alignItems: "center",
  },
  brandTitle: {
    flexShrink: 1,
    fontFamily: f.regular,
    fontSize: 24,
    lineHeight: 32,
    color: c.ink,
  },
  intro: { paddingTop: 18, paddingBottom: 18, gap: 8 },
  introTitle: {
    fontFamily: f.heading,
    fontSize: 52,
    lineHeight: 62,
    color: c.ink,
  },
  introTitlePhone: { fontSize: 30, lineHeight: 36 },
  subtitle: {
    fontFamily: f.regular,
    fontSize: 20,
    lineHeight: 28,
    color: c.muted,
  },
  headerTools: {
    width: 320,
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  headerButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonText: {
    fontFamily: f.bold,
    fontSize: 18,
    lineHeight: 26,
    color: c.pen,
    textAlign: "center",
  },
  libraryLayout: { flexDirection: "row", gap: 48 },
  libraryLayoutCompact: { flexDirection: "column", gap: 44 },
  currentColumn: { width: "44%", flexShrink: 1 },
  availableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },
  standingBook: { paddingHorizontal: 4 },
  book: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    overflow: "hidden",
    boxShadow: "3px 2px 5px rgba(40, 38, 56, 0.18)",
  },
  backCover: {
    position: "absolute",
    right: 0,
    top: 4,
    bottom: 0,
    width: 20,
    borderRadius: 3,
    boxShadow: "5px 5px 9px rgba(40,38,56,0.14)",
  },
  pageEdge: {
    position: "absolute",
    right: 2,
    top: 7,
    bottom: 5,
    width: 13,
    backgroundColor: "#fffbef",
    borderWidth: 1,
    borderColor: "#e6dfce",
    transform: [{ skewY: "-12deg" }],
  },
  pageLine: {
    position: "absolute",
    top: 1,
    bottom: 1,
    width: 1,
    backgroundColor: "#d8d0bd88",
  },
  coverImage: { width: "100%", height: "100%" },
  spine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 5,
    width: 5,
    borderLeftWidth: 1,
    borderLeftColor: "#ffffff44",
    borderRightWidth: 1,
    borderRightColor: "#00000016",
    backgroundColor: "#00000009",
  },
  bookShelf: {
    width: "100%",
    height: 11,
    borderTopWidth: 3,
    borderTopColor: c.shelfLight,
    borderBottomWidth: 2,
    borderBottomColor: c.shelfShade,
    backgroundColor: c.shelf,
    borderRadius: 2,
    boxShadow: "0px 7px 9px rgba(40,38,56,0.09)",
  },
  bookInfo: { flex: 1, minWidth: 0, gap: 10 },
  bookHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 12,
  },
  bookTitle: {
    fontFamily: f.heading,
    fontSize: 30,
    lineHeight: 40,
    color: c.ink,
  },
  grade: { fontFamily: f.regular, fontSize: 22, lineHeight: 30, color: c.ink },
  methodology: {
    fontFamily: f.regular,
    fontSize: 18,
    lineHeight: 26,
    color: c.muted,
    maxWidth: 420,
  },
  note: { fontFamily: f.regular, fontSize: 18, lineHeight: 26, color: c.muted },
  bookActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 22,
  },
  action: {
    backgroundColor: c.pen,
    borderRadius: 14,
    minHeight: 60,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "100%",
  },
  actionText: {
    fontFamily: f.bold,
    fontSize: 20,
    lineHeight: 28,
    color: c.white,
    textAlign: "center",
  },
  secondaryAction: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
  },
  pressed: { opacity: 0.8 },
  secondaryPressed: { backgroundColor: c.wash },
  support: {
    gap: 14,
    marginTop: 32,
    padding: 20,
    borderRadius: 18,
    backgroundColor: c.wash,
  },
  supportCompact: { alignItems: "stretch" },
  funding: { gap: 8, minWidth: 0 },
  supportTitle: {
    fontFamily: f.bold,
    fontSize: 20,
    lineHeight: 28,
    color: c.ink,
  },
  fundingAmount: {
    fontFamily: f.regular,
    fontSize: 18,
    lineHeight: 26,
    color: c.muted,
  },
  fundingTrack: {
    width: "100%",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: c.line,
  },
  fundingFill: { height: "100%", backgroundColor: c.pen },
  supportAction: { alignItems: "flex-start", gap: 4 },
  supportButton: {
    backgroundColor: c.pen,
  },
  supportButtonText: {
    color: c.white,
    fontSize: 20,
  },
  plans: { flex: 1, minWidth: 0 },
  plansCompact: { flex: undefined, width: "100%" },
  plansTitle: {
    fontFamily: f.heading,
    fontSize: 26,
    lineHeight: 36,
    color: c.ink,
    marginBottom: 12,
  },
  shelfRow: { marginBottom: 24 },
  rowBooks: { flexDirection: "row", alignItems: "flex-end", paddingTop: 10 },
  plannedSlot: { alignItems: "center", justifyContent: "flex-end" },
  plannedCover: {
    paddingLeft: 24,
    paddingRight: 14,
    paddingVertical: 20,
    justifyContent: "space-between",
  },
  plannedTitle: {
    fontFamily: f.bold,
    fontSize: 18,
    lineHeight: 25,
    color: c.ink,
  },
  coverRule: {
    height: 1,
    backgroundColor: "#28263822",
    width: 36,
    marginVertical: 12,
  },
  plannedSymbol: {
    fontFamily: f.regular,
    fontSize: 42,
    lineHeight: 50,
    color: c.ink,
  },
  rowLabels: { flexDirection: "row", paddingTop: 8 },
  plannedStatus: {
    fontFamily: f.regular,
    fontSize: 18,
    lineHeight: 26,
    color: c.muted,
    textAlign: "center",
  },
});
