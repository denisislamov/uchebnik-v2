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
import { colors as c, fonts as f } from "../theme";
import {
  plannedBooks,
  PROJECT_PATREON_URL,
  PROJECT_FUNDING,
} from "../content/library";
import { libraryCover } from "../content/libraryCover";
import { HandFrame } from "./HandDrawn";
import { Button } from "./Controls";
import { CELL } from "../lib/grid";
import { LanguageWheel } from "./LanguageWheel";
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
  const url = PROJECT_PATREON_URL.trim();
  const { raised, goal } = PROJECT_FUNDING;
  const fraction = goal > 0 ? Math.max(0, Math.min(1, raised / goal)) : 0;
  const rubles = (amount: number) => `${amount.toLocaleString(locale)} ₽`;
  const amounts = { raised: rubles(raised), goal: rubles(goal) };
  return (
    <View
      testID="support-project"
      style={[s.support, compact && s.supportCompact]}
    >
      <HandFrame seed="library-support" color={c.line} />
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
          <Text style={s.actionText}>{t.support}</Text>
        </Pressable>
        {!url && <Text style={s.note}>{t.supportSoon}</Text>}
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
        <View style={[s.header, compact && s.headerCompact]}>
          <View style={s.brand}>
            <Text
              accessibilityRole="header"
              style={[
                s.brandTitle,
                compact && { fontSize: 34, lineHeight: 40 },
              ]}
            >
              {t.title}
            </Text>
            <Text style={s.subtitle}>{t.subtitle}</Text>
          </View>
          <View style={[s.headerTools, compact && { width: "100%" }]}>
            <LanguageWheel locale={locale} onChange={onLocaleChange} copy={t} />
            {languageSaveError && (
              <Text accessibilityRole="alert" style={s.note}>
                {t.languageSaveError}
              </Text>
            )}
            <Button
              testID="library-parents"
              secondary
              label={t.parentsLabel}
              onPress={onParents}
            >
              {t.parents}
            </Button>
          </View>
        </View>

        <SupportProject compact={width < 1000} copy={t} locale={locale} />

        <View style={s.shelves}>
          <View style={[s.availableBook, compact && { marginTop: CELL }]}>
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
                <Text
                  accessibilityRole="header"
                  style={[
                    s.bookTitle,
                    compact && {
                      fontSize: width < 360 ? 28 : 32,
                      lineHeight: 40,
                    },
                  ]}
                >
                  {t.arithmetic}
                </Text>
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
                            fontSize: compact ? 24 : 32,
                            lineHeight: compact ? 30 : 40,
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: CELL,
    paddingVertical: CELL * 2,
  },
  headerTools: { width: 280, gap: 16, alignItems: "flex-start" },
  headerCompact: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 16,
    paddingVertical: CELL,
  },
  brand: { flex: 1, gap: 8 },
  brandTitle: {
    fontFamily: f.hand,
    fontSize: 48,
    lineHeight: 56,
    color: c.pen,
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
    backgroundColor: c.paper,
  },
  supportCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 16,
    padding: 16,
  },
  supportTitle: {
    fontFamily: f.hand,
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
    backgroundColor: c.wash,
  },
  fundingFill: { height: "100%", borderRadius: 8, backgroundColor: c.pen },
  supportButton: { minHeight: 60 },
  note: {
    fontFamily: f.regular,
    fontSize: 16,
    lineHeight: CELL,
    color: c.muted,
  },
  shelves: { backgroundColor: c.paper, paddingBottom: CELL },
  availableBook: { marginTop: CELL * 2, gap: CELL },
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
    borderTopColor: "#e2d1b6",
    borderBottomWidth: 2,
    borderBottomColor: "#b6a68d",
    backgroundColor: "#d8c6a9",
  },
  bookInfo: { flex: 1, minWidth: 0, gap: 12 },
  bookTitle: { fontFamily: f.hand, fontSize: 48, lineHeight: 56, color: c.ink },
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
    borderRadius: 6,
    borderBottomWidth: 3,
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
    borderBottomWidth: 2,
    borderBottomColor: c.lip,
  },
  pressed: { opacity: 0.8 },
  secondaryPressed: { backgroundColor: c.wash },
  plans: { marginTop: CELL * 2 },
  plansTitle: {
    fontFamily: f.hand,
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
    padding: 16,
    justifyContent: "space-around",
    alignItems: "center",
  },
  plannedTitle: { fontFamily: f.hand, textAlign: "center", width: "100%" },
  plannedSymbol: { fontFamily: f.hand },
  shelfEdge: {
    marginTop: -12,
    height: 10,
    borderTopWidth: 3,
    borderTopColor: "#e2d1b6",
    borderBottomWidth: 2,
    borderBottomColor: "#b6a68d",
    backgroundColor: "#d8c6a9",
  },
  plannedStatus: {
    fontFamily: f.regular,
    fontSize: 18,
    lineHeight: CELL,
    color: c.muted,
    textAlign: "center",
  },
});
