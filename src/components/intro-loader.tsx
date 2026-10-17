"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site-config";

type LoaderState = "visible" | "exiting" | "hidden";

export function IntroLoader() {
  const [state, setState] = useState<LoaderState>("visible");

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const exitTimer = window.setTimeout(
      () => setState("exiting"),
      prefersReducedMotion ? 100 : 900,
    );
    const hideTimer = window.setTimeout(
      () => setState("hidden"),
      prefersReducedMotion ? 180 : 1550,
    );

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (state === "hidden") {
    return null;
  }

  return (
    <div
      aria-label={`Caricamento ${siteConfig.name}`}
      aria-live="polite"
      className={`intro-loader${state === "exiting" ? " is-exiting" : ""}`}
      role="status"
    >
      <div className="intro-loader-brand">
        <span aria-hidden="true" className="intro-loader-mark">FA</span>
        <span>{siteConfig.name}</span>
      </div>
      <div className="intro-loader-bottom">
        <span>Idee in movimento.</span>
        <span className="intro-loader-progress"><i /></span>
        <span>01 — 01</span>
      </div>
    </div>
  );
}
