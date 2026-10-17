"use client";

// Presenter tools (the Demos panel, the coach card and the D shortcut) are off by default.
// Opening any page with ?presenter=1 turns them on for this browser tab; ?presenter=0 turns them off.
import { useEffect, useState } from "react";

const KEY = "mad_presenter";

export function usePresenter() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("presenter");
      if (p === "1") sessionStorage.setItem(KEY, "1");
      if (p === "0") sessionStorage.removeItem(KEY);
      setTimeout(() => setOn(sessionStorage.getItem(KEY) === "1"), 0);
    } catch {
      setOn(false);
    }
  }, []);
  return on;
}
