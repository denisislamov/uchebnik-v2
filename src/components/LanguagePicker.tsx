import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  libraryLanguages,
  type LibraryCopy,
  type LibraryLocale,
} from "../localization/library";
import { libraryColors as c, libraryFonts as f } from "./libraryTheme";

const normalized = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
export function LanguagePicker({
  locale,
  onChange,
  copy,
}: {
  locale: LibraryLocale;
  onChange: (locale: LibraryLocale) => void;
  copy: LibraryCopy;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = libraryLanguages.find(
    (language) => language.code === locale,
  )!;
  const languages = libraryLanguages.filter((language) =>
    normalized(`${language.name} ${language.code}`).includes(normalized(query)),
  );
  return (
    <>
      <Pressable
        testID="language-picker"
        accessibilityRole="button"
        accessibilityLabel={`${copy.language}: ${selected.name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
        style={({ pressed }) => [s.trigger, pressed && s.pressed]}
      >
        <Text style={s.triggerText}>{selected.name}</Text>
        <Text aria-hidden style={s.chevron}>
          ⌄
        </Text>
      </Pressable>
      <Modal
        accessibilityLabel={copy.language}
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          style={s.shade}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            testID="language-dialog"
            accessibilityLabel={copy.language}
            style={s.panel}
          >
            <View style={s.heading}>
              <Text accessibilityRole="header" style={s.title}>
                {copy.language}
              </Text>
              <Pressable
                testID="language-close"
                accessibilityRole="button"
                accessibilityLabel={copy.closeLanguages}
                onPress={() => setOpen(false)}
                style={s.close}
              >
                <Text style={s.closeText}>×</Text>
              </Pressable>
            </View>
            <TextInput
              testID="language-search"
              accessibilityLabel={copy.searchLanguages}
              placeholder={copy.searchLanguages}
              placeholderTextColor={c.muted}
              value={query}
              onChangeText={setQuery}
              onKeyPress={(event) => {
                if (event.nativeEvent.key === "Escape") setOpen(false);
              }}
              autoCorrect={false}
              autoCapitalize="none"
              style={s.search}
            />
            <ScrollView
              testID="language-options"
              keyboardShouldPersistTaps="handled"
              style={s.list}
              contentContainerStyle={s.listContent}
            >
              {languages.map((language) => (
                <Pressable
                  key={language.code}
                  testID={`language-${language.code}`}
                  accessibilityRole="button"
                  accessibilityLabel={language.name}
                  accessibilityState={
                    Platform.OS === "web"
                      ? undefined
                      : { selected: language.code === locale }
                  }
                  aria-pressed={language.code === locale}
                  onPress={() => {
                    onChange(language.code);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    s.option,
                    language.code === locale && s.selected,
                    pressed && s.pressed,
                  ]}
                >
                  <Text
                    style={[
                      s.optionText,
                      language.code === locale && s.selectedText,
                    ]}
                  >
                    {language.name}
                  </Text>
                  {language.code === locale && (
                    <Text aria-hidden style={s.selectedText}>
                      ✓
                    </Text>
                  )}
                </Pressable>
              ))}
              {!languages.length && (
                <Text testID="language-empty" style={s.empty}>
                  {copy.noLanguages}
                </Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  trigger: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.line,
    borderBottomColor: c.line,
    backgroundColor: c.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  triggerText: {
    fontFamily: f.bold,
    fontSize: 18,
    lineHeight: 26,
    color: c.ink,
    flexShrink: 1,
  },
  chevron: {
    fontFamily: f.regular,
    fontSize: 22,
    lineHeight: 26,
    color: c.pen,
  },
  pressed: { backgroundColor: c.wash },
  shade: {
    flex: 1,
    backgroundColor: "#28263866",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  panel: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    backgroundColor: c.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.line,
    padding: 16,
    gap: 12,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: f.heading,
    fontSize: 30,
    lineHeight: 36,
    color: c.pen,
  },
  close: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: c.wash,
  },
  closeText: {
    fontFamily: f.regular,
    fontSize: 30,
    lineHeight: 36,
    color: c.ink,
  },
  search: {
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 14,
    backgroundColor: c.card,
    color: c.ink,
    fontFamily: f.regular,
    fontSize: 18,
    lineHeight: 26,
  },
  list: { flexShrink: 1 },
  listContent: { gap: 6 },
  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionText: {
    fontFamily: f.regular,
    fontSize: 20,
    lineHeight: 28,
    color: c.ink,
  },
  selected: { backgroundColor: c.wash },
  selectedText: {
    color: c.pen,
    fontFamily: f.bold,
    fontSize: 20,
    lineHeight: 28,
  },
  empty: {
    fontFamily: f.regular,
    fontSize: 18,
    lineHeight: 26,
    color: c.muted,
    paddingVertical: 16,
  },
});
