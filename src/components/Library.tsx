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
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import {
  plannedBooks,
  PROJECT_SUPPORT_URL,
  PROJECT_FUNDING,
} from "../content/library";
import { libraryCover } from "../content/libraryCover";
import { CELL } from "../lib/grid";
import { LanguagePicker } from "./LanguagePicker";
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
          style={[s.supportTitle, compact && { fontSize: 26, lineHeight: 32 }]}
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
          <Text style={s.actionText}>{t.support} ↗</Text>
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
  const compact = width < 800;
  const gutter = compact ? 24 : 72;
  const plannedColumns = width < 900 ? 2 : 3;
  const contentWidth = Math.min(width, 1200) - gutter * 2;
  const futureWidth = Math.min(192, contentWidth / plannedColumns - 24);
  const coverWidth = compact ? (width < 360 ? 96 : 128) : 216;
  return (
    <View testID="library-home" style={s.page}>
      <View style={[s.container, { paddingHorizontal: gutter }]}>
        <View style={[s.header, width < 1000 && s.headerCompact]}>
          <View style={s.brand}>
            <Text
              accessibilityRole="header"
              style={[
                s.brandTitle,
                compact && { fontSize: 30, lineHeight: 38 },
              ]}
            >
              {t.title}
            </Text>
            <Text style={s.subtitle}>{t.subtitle}</Text>
          </View>
          <View
            style={[
              s.headerTools,
              width < 1000 && { width: "100%", maxWidth: 420 },
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
          <Text
            accessibilityRole="alert"
            style={[s.note, { marginBottom: 12 }]}
          >
            {t.languageSaveError}
          </Text>
        )}

        <SupportProject compact={width < 1000} copy={t} locale={locale} />

        <View style={s.shelves}>
          <View style={[s.availableBook, compact && s.availableBookCompact]}>
            {width >= 1200 && <ShelfDoodle />}
            {compact && (
              <Text
                accessibilityRole="header"
                style={[s.bookTitle, s.mobileBookTitle]}
              >
                {t.arithmetic}
              </Text>
            )}
            <View style={[s.availableRow, { gap: compact ? 16 : 48 }]}>
              <View
                style={{
                  width: coverWidth + (compact ? 0 : 32),
                  alignItems: "center",
                }}
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
                <View style={s.bookShelf} />
              </View>
              <View style={s.bookInfo}>
                {!compact && (
                  <Text accessibilityRole="header" style={s.bookTitle}>
                    {t.arithmetic}
                  </Text>
                )}
                <Text style={s.grade}>{t.grade}</Text>
                <Text style={s.methodology}>{t.methodology}</Text>
                {locale !== "ru" && (
                  <Text style={s.note}>{t.bookLanguage}</Text>
                )}
                {hasProgress && (
                  <Text style={s.note}>
                    {libraryText(t.progress, { completed, total })}
                  </Text>
                )}
                {!compact && (
                  <View style={s.desktopActions}>
                    <BookActions
                      copy={t}
                      hasProgress={hasProgress}
                      onContinue={onContinue}
                      onOpenBook={onOpenBook}
                    />
                  </View>
                )}
              </View>
            </View>
            {compact && (
              <View style={s.mobileActions}>
                <BookActions
                  copy={t}
                  hasProgress={hasProgress}
                  onContinue={onContinue}
                  onOpenBook={onOpenBook}
                />
              </View>
            )}
          </View>

          <View style={s.plans}>
            <Text accessibilityRole="header" style={s.plansTitle}>
              {t.moreSubjects}
            </Text>
            <View style={s.shelfGrid}>
              {plannedBooks.map((book) => (
                <View
                  key={book.id}
                  style={[s.plannedSlot, { width: `${100 / plannedColumns}%` }]}
                >
                  <View style={s.plannedSpace}>
                    <View
                      testID="planned-cover"
                      style={[
                        s.book,
                        s.plannedCover,
                        {
                          width: futureWidth,
                          height: futureWidth * 1.5,
                          backgroundColor: book.color,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.plannedTitle,
                          {
                            color: book.pale,
                            fontSize: compact ? 18 : 26,
                            lineHeight: compact ? 25 : 34,
                          },
                        ]}
                      >
                        {t.books[book.id]}
                      </Text>
                      <Text
                        style={[
                          s.plannedSymbol,
                          { color: book.pale, fontSize: compact ? 40 : 64 },
                        ]}
                      >
                        {locale !== "ru" &&
                        (book.id === "reading" || book.id === "russian")
                          ? "Aa"
                          : book.symbol}
                      </Text>
                      <View pointerEvents="none" style={s.spine} />
                    </View>
                  </View>
                  <View style={s.shelfEdge} />
                  <Text style={s.plannedStatus}>{t.planned}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
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

function ShelfDoodle() {
  return (
    <View pointerEvents="none" aria-hidden style={s.doodle}>
      <Svg width={104} height={92} viewBox="0 0 104 92">
        <Circle cx="52" cy="45" r="25" fill={c.yellow} />
        <Ellipse
          cx="52"
          cy="45"
          rx="44"
          ry="12"
          rotation={-25}
          origin="52,45"
          fill="none"
          stroke={c.pen}
          strokeWidth="2"
        />
        <Path
          d="M87 8v12M81 14h12M12 69v10M7 74h10"
          stroke={c.coral}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Circle cx="75" cy="76" r="3" fill={c.pen} />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: c.paper },
  container: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    paddingBottom: CELL * 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: CELL,
    paddingVertical: CELL,
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
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.line,
    borderBottomColor: c.line,
    backgroundColor: c.card,
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonText: {
    fontFamily: f.bold,
    fontSize: 18,
    lineHeight: 26,
    color: c.ink,
    textAlign: "center",
  },
  headerCompact: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 16,
    paddingVertical: CELL,
  },
  brand: { flex: 1, gap: 8 },
  brandTitle: {
    fontFamily: f.heading,
    fontSize: 48,
    lineHeight: 56,
    color: c.ink,
  },
  subtitle: {
    fontFamily: f.regular,
    fontSize: 18,
    lineHeight: CELL,
    color: c.ink,
  },
  support: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: CELL,
    padding: CELL,
    backgroundColor: c.peach,
    borderRadius: 28,
  },
  supportCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 16,
    padding: 16,
  },
  supportTitle: {
    fontFamily: f.heading,
    fontSize: 32,
    lineHeight: 40,
    color: c.ink,
    flexShrink: 1,
  },
  supportAction: { gap: 8, alignItems: "stretch" },
  funding: { flex: 1, gap: 12, minWidth: 0 },
  fundingAmount: {
    fontFamily: f.bold,
    fontSize: 20,
    lineHeight: 28,
    color: c.ink,
  },
  fundingTrack: {
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#ffffffa6",
  },
  fundingFill: { height: "100%", borderRadius: 8, backgroundColor: c.pen },
  supportButton: { minHeight: 60 },
  note: {
    fontFamily: f.regular,
    fontSize: 16,
    lineHeight: CELL,
    color: c.muted,
  },
  shelves: { paddingBottom: CELL },
  availableBook: {
    marginTop: CELL,
    gap: CELL,
    padding: 32,
    backgroundColor: c.wash,
    borderRadius: 32,
  },
  availableBookCompact: { padding: 16, borderRadius: 24 },
  doodle: { position: "absolute", top: 22, right: 22, opacity: 0.8 },
  availableRow: { flexDirection: "row", alignItems: "center" },
  book: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 5,
    overflow: "hidden",
    boxShadow: "4px 5px 8px rgba(31, 36, 51, 0.15)",
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
    height: 10,
    borderTopWidth: 3,
    borderTopColor: "#ded0ee",
    borderBottomWidth: 2,
    borderBottomColor: "#a88bc7",
    backgroundColor: c.shelf,
    borderRadius: 3,
  },
  bookInfo: { flex: 1, minWidth: 0, gap: 12 },
  bookTitle: {
    fontFamily: f.heading,
    fontSize: 48,
    lineHeight: 56,
    color: c.ink,
  },
  mobileBookTitle: { fontSize: 28, lineHeight: 38 },
  grade: { fontFamily: f.regular, fontSize: 22, lineHeight: 32, color: c.ink },
  methodology: {
    fontFamily: f.regular,
    fontSize: 16,
    lineHeight: CELL,
    color: c.muted,
    maxWidth: 420,
  },
  desktopActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 12,
  },
  mobileActions: { gap: 12 },
  action: {
    backgroundColor: c.pen,
    borderRadius: 24,
    borderBottomWidth: 0,
    borderBottomColor: c.penDark,
    minHeight: 64,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
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
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  pressed: { opacity: 0.8 },
  secondaryPressed: { backgroundColor: c.wash },
  plans: { marginTop: CELL * 2 },
  plansTitle: {
    fontFamily: f.heading,
    fontSize: 32,
    lineHeight: 40,
    color: c.ink,
    marginBottom: CELL,
  },
  shelfGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: CELL },
  plannedSlot: { gap: 12 },
  plannedSpace: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 8,
  },
  plannedCover: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: "space-around",
    alignItems: "center",
  },
  plannedTitle: { fontFamily: f.bold, textAlign: "center", width: "100%" },
  plannedSymbol: { fontFamily: f.regular },
  shelfEdge: {
    marginTop: -12,
    height: 10,
    borderTopWidth: 3,
    borderTopColor: "#ded0ee",
    borderBottomWidth: 2,
    borderBottomColor: "#a88bc7",
    backgroundColor: c.shelf,
    borderRadius: 3,
  },
  plannedStatus: {
    fontFamily: f.regular,
    fontSize: 18,
    lineHeight: CELL,
    color: c.muted,
    textAlign: "center",
    alignSelf: "center",
    backgroundColor: c.wash,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
});
