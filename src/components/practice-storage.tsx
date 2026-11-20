"use client";

import { createContext, useContext } from "react";
import type { PracticeStorage } from "@/lib/account-sync";

export const guestStorage: PracticeStorage = {
  getItem(key) {
    return window.localStorage.getItem(key);
  },
  setItem(key, value) {
    window.localStorage.setItem(key, value);
  },
};

export const StorageContext = createContext<PracticeStorage>(guestStorage);

export function usePracticeStorage() {
  return useContext(StorageContext);
}
