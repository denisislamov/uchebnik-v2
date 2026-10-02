import React, { useEffect, useRef } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  libraryLanguages,
  type LibraryCopy,
  type LibraryLocale,
} from "../localization/library";
import { colors as c, fonts as f } from "../theme";

const ROW = 56;
export function LanguageWheel({
  locale,
  onChange,
  copy,
}: {
  locale: LibraryLocale;
  onChange: (locale: LibraryLocale) => void;
  copy: LibraryCopy;
}) {
  const scroll = useRef<ScrollView>(null);
  const mounted = useRef(true);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selected = libraryLanguages.findIndex(
    (language) => language.code === locale,
  );
  const latest = useRef({ selected, onChange });
  latest.current = { selected, onChange };
  const choose = (index: number) => {
    if (!mounted.current) return;
    clearTimeout(settle.current);
    const next = Math.max(0, Math.min(libraryLanguages.length - 1, index));
    scroll.current?.scrollTo({ y: next * ROW, animated: false });
    if (latest.current.selected !== next)
      latest.current.onChange(libraryLanguages[next].code);
  };
  useEffect(() => {
    clearTimeout(settle.current);
    scroll.current?.scrollTo({ y: selected * ROW, animated: false });
  }, [selected]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(settle.current);
    };
  }, []);
  return (
    <View testID="language-wheel" style={s.container}>
      <Text style={s.label}>{copy.language}</Text>
      <View style={s.row}>
        <View style={s.drum}>
          <View pointerEvents="none" style={s.selection} />
          <ScrollView
            ref={scroll}
            onLayout={() =>
              scroll.current?.scrollTo({ y: selected * ROW, animated: false })
            }
            testID="language-scroll"
            accessibilityRole="radiogroup"
            accessibilityLabel={copy.language}
            {...(Platform.OS === "web"
              ? {
                  tabIndex: 0,
                  "aria-activedescendant": `library-language-${locale}`,
                  onKeyDown: (event: React.KeyboardEvent) => {
                    const next =
                      event.key === "ArrowDown"
                        ? selected + 1
                        : event.key === "ArrowUp"
                          ? selected - 1
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? libraryLanguages.length - 1
                              : undefined;
                    if (next !== undefined) {
                      event.preventDefault();
                      choose(next);
                    }
                  },
                }
              : {})}
            style={s.scroll}
            contentContainerStyle={{ paddingVertical: ROW }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            snapToInterval={ROW}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={(event) => {
              // RN Web may emit a trailing scroll event after this view unmounts.
              if (!mounted.current) return;
              const index = Math.round(event.nativeEvent.contentOffset.y / ROW);
              clearTimeout(settle.current);
              settle.current = setTimeout(() => choose(index), 180);
            }}
          >
            {libraryLanguages.map((language, index) => (
              <Pressable
                key={language.code}
                id={`library-language-${language.code}`}
                testID={`language-${language.code}`}
                {...(Platform.OS === "web" ? { tabIndex: -1 } : {})}
                accessibilityRole="radio"
                accessibilityLabel={language.name}
                accessibilityState={{ checked: index === selected }}
                aria-checked={index === selected}
                onPress={() => {
                  choose(index);
                  if (Platform.OS === "web") {
                    scroll.current
                      ?.getScrollableNode()
                      ?.focus?.({ preventScroll: true });
                  }
                }}
                style={s.option}
              >
                <Text style={[s.name, index === selected && s.selectedName]}>
                  {language.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View style={s.arrows}>
          <Pressable
            testID="language-previous"
            accessibilityRole="button"
            accessibilityLabel={copy.previousLanguage}
            disabled={selected === 0}
            accessibilityState={{ disabled: selected === 0 }}
            onPress={() => choose(selected - 1)}
            style={[s.arrow, selected === 0 && s.disabled]}
          >
            <Text style={s.arrowText}>↑</Text>
          </Pressable>
          <Pressable
            testID="language-next"
            accessibilityRole="button"
            accessibilityLabel={copy.nextLanguage}
            disabled={selected === libraryLanguages.length - 1}
            accessibilityState={{
              disabled: selected === libraryLanguages.length - 1,
            }}
            onPress={() => choose(selected + 1)}
            style={[
              s.arrow,
              selected === libraryLanguages.length - 1 && s.disabled,
            ]}
          >
            <Text style={s.arrowText}>↓</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  container: { width: "100%", maxWidth: 320, gap: 8 },
  label: {
    fontFamily: f.regular,
    fontSize: 16,
    lineHeight: 24,
    color: c.muted,
  },
  row: { flexDirection: "row", gap: 8 },
  drum: {
    flex: 1,
    minWidth: 0,
    height: ROW * 3,
    borderRadius: 8,
    backgroundColor: c.wash,
  },
  scroll: { height: ROW * 3, borderRadius: 8 },
  selection: {
    position: "absolute",
    left: 4,
    right: 4,
    top: ROW,
    height: ROW,
    borderRadius: 6,
    backgroundColor: c.pen,
  },
  option: {
    height: ROW,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  name: { fontFamily: f.regular, fontSize: 22, lineHeight: 30, color: c.muted },
  selectedName: { fontFamily: f.bold, color: c.white },
  arrows: { justifyContent: "center", gap: 8 },
  arrow: {
    width: 48,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
  arrowText: { fontFamily: f.regular, fontSize: 28, color: c.pen },
  disabled: { opacity: 0.4 },
});
