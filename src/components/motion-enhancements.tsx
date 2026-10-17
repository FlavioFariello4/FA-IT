"use client";

import { useEffect } from "react";

export function MotionEnhancements() {
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    document.documentElement.classList.add("motion-ready");

    if (motionQuery.matches) {
      return () => document.documentElement.classList.remove("motion-ready");
    }

    const revealSelector = [
      "[data-reveal]",
      ".section-heading",
      ".service-row",
      ".service-detail",
      ".portfolio-preview-copy",
      ".portfolio-art",
      ".join-band > *",
      ".contact-cta h2",
      ".inner-hero > *",
      ".studio-story-grid > *",
      ".value-card",
      ".careers-note > *",
      ".open-role",
      ".form-aside",
      ".contact-form",
      ".portfolio-empty > *",
      ".legal-content > section",
      ".admin-card",
      ".admin-page-heading > *",
    ].join(",");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );

    const observedElements = new WeakSet<Element>();
    const observeReveals = (root: ParentNode) => {
      if (root instanceof Element && root.matches(revealSelector) && !observedElements.has(root)) {
        root.setAttribute("data-scroll-reveal", "");
        observedElements.add(root);
        observer.observe(root);
      }
      root.querySelectorAll(revealSelector).forEach((element) => {
        if (observedElements.has(element)) {
          return;
        }
        const siblings = Array.from(element.parentElement?.children ?? []);
        const siblingIndex = siblings.filter((sibling) => sibling.matches(revealSelector)).indexOf(element);
        element.setAttribute("data-scroll-reveal", "");
        if (element instanceof HTMLElement) {
          element.style.setProperty("--reveal-delay", `${Math.min(siblingIndex, 5) * 75}ms`);
        }
        observedElements.add(element);
        observer.observe(element);
      });
    };

    observeReveals(document);
    const pageObserver = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            observeReveals(node);
          }
        });
      }
    });
    pageObserver.observe(document.querySelector("#contenuto") ?? document.body, {
      childList: true,
      subtree: true,
    });

    const cursor = document.querySelector<HTMLElement>(".cursor-orb");
    const finePointer = window.matchMedia("(pointer: fine)");
    if (cursor && finePointer.matches) {
      document.documentElement.classList.add("custom-cursor-active");
    }

    let targetX = -100;
    let targetY = -100;
    let currentX = targetX;
    let currentY = targetY;
    let cursorFrame = 0;
    const animateCursor = () => {
      if (!cursor) {
        cursorFrame = 0;
        return;
      }
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      if (Math.abs(targetX - currentX) > 0.15 || Math.abs(targetY - currentY) > 0.15) {
        cursorFrame = window.requestAnimationFrame(animateCursor);
      } else {
        cursorFrame = 0;
      }
    };
    const moveCursor = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      cursor?.classList.add("is-visible");
      if (cursor && cursorFrame === 0) {
        cursorFrame = window.requestAnimationFrame(animateCursor);
      }
    };
    const leaveWindow = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        cursor?.classList.remove("is-visible");
      }
    };
    const onScroll = () => {
      if (cursorFrame === 0 && cursor?.classList.contains("is-visible")) {
        cursorFrame = window.requestAnimationFrame(animateCursor);
      }
      const progressBar = document.querySelector<HTMLElement>(".scroll-progress");
      if (progressBar) {
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
        progressBar.style.transform = `scaleX(${progress})`;
      }
      const heroArtwork = document.querySelector<HTMLElement>(".hero-art");
      if (heroArtwork) {
        heroArtwork.style.setProperty(
          "--hero-scroll-shift",
          `${Math.min(window.scrollY * 0.12, 115)}px`,
        );
      }
    };
    const updateCursorTarget = (event: PointerEvent) => {
      if (!cursor || !(event.target instanceof Element)) {
        return;
      }
      cursor.classList.toggle(
        "is-over-interactive",
        Boolean(event.target.closest("a, button, summary, input, textarea, select, label")),
      );
    };
    window.addEventListener("pointermove", moveCursor, { passive: true });
    document.addEventListener("pointerover", updateCursorTarget, { passive: true });
    window.addEventListener("pointerout", leaveWindow);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      pageObserver.disconnect();
      if (cursorFrame) {
        window.cancelAnimationFrame(cursorFrame);
      }
      window.removeEventListener("pointermove", moveCursor);
      document.removeEventListener("pointerover", updateCursorTarget);
      window.removeEventListener("pointerout", leaveWindow);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.classList.remove("custom-cursor-active");
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  return (
    <>
      <span aria-hidden="true" className="scroll-progress" />
      <span aria-hidden="true" className="cursor-orb" />
    </>
  );
}
