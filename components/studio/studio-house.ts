"use client";

import { useEffect, useState } from "react";

const storageKey = "memorai:studio:house";

/**
 * The House the family is working on: the `?house=` link wins and is remembered in this
 * browser, so the Studio home and Care pages work without passing the id around.
 */
export function useStudioHouseId(fromUrl: string | undefined) {
  const [houseId, setHouseId] = useState<string | null>(fromUrl ?? null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      if (fromUrl) localStorage.setItem(storageKey, fromUrl);
      else setHouseId(localStorage.getItem(storageKey));
    } catch {
      // Storage can be blocked; the link parameter still works.
    }
    setReady(true);
  }, [fromUrl]);
  return { houseId, ready };
}

export function forgetStudioHouse() {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Nothing to forget.
  }
}
