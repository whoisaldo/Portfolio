import { useSyncExternalStore } from "react";

// This store owns no document styles and never reads cinematic preferences.
const STORAGE_KEY = "aly.recruiters.theme.v1";
const CHANGE_EVENT = "recruiters-theme-change";
let sessionTheme;

export function getRecruiterTheme() {
  if (sessionTheme) return sessionTheme;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light"
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

export function setRecruiterTheme(theme) {
  if (theme !== "dark" && theme !== "light") return;
  sessionTheme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
    // Read persisted changes on remount, including changes made in another tab
    // while this tab was on the cinematic route and had no subscriber.
    sessionTheme = undefined;
  } catch {
    // The control still works when the browser disallows persistent storage.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(notify) {
  const onStorage = (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      sessionTheme = undefined;
      notify();
    }
  };
  window.addEventListener(CHANGE_EVENT, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, notify);
    window.removeEventListener("storage", onStorage);
  };
}

export function useRecruiterTheme() {
  return useSyncExternalStore(subscribe, getRecruiterTheme, () => "dark");
}
