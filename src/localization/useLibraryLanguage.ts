import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LANGUAGE_STORAGE_KEY,
  libraryCopy,
  libraryLocale,
  type LibraryLocale,
} from "./library";

let writes: Promise<void> = Promise.resolve();
export function useLibraryLanguage(onLibrary: boolean) {
  const [locale, setLocale] = useState<LibraryLocale>("ru");
  const [saveError, setSaveError] = useState(false);
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((value) => {
        if (active && revision.current === 0) setLocale(libraryLocale(value));
      })
      .catch(() => {
        if (active) setSaveError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = onLibrary ? locale : "ru";
      document.title = onLibrary
        ? libraryCopy[locale].title
        : "Арифметика · 1 класс";
    }
  }, [locale, onLibrary]);
  function chooseLocale(value: LibraryLocale) {
    const current = ++revision.current;
    setLocale(value);
    setSaveError(false);
    writes = writes
      .catch(() => {})
      .then(() => AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, value));
    writes.catch(() => {
      if (revision.current === current) setSaveError(true);
    });
  }
  return { locale, chooseLocale, saveError, copy: libraryCopy[locale] };
}
