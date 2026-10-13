"use client";

import { useEffect, useRef } from "react";
import styles from "./Personal.module.scss";

// Branch-growth approach adapted from Anthony Fu's MIT-licensed ArtPlum.vue.
// https://github.com/antfu/antfu.me/blob/main/src/components/ArtPlum.vue
export function SketchBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let timer: ReturnType<typeof setTimeout>;
    let steps: (() => void)[] = [];
    let count = 0;
    let last = 0;
    let width = 0;
    let height = 0;
    let seed = 173;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const step = (x: number, y: number, angle: number, depth: number) => {
      const length = random() * 6 + 1;
      const nx = x + Math.cos(angle) * length;
      const ny = y + Math.sin(angle) * length;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      if (nx < -20 || nx > width + 20 || ny < -20 || ny > height + 20 || depth > 150) return;
      const rate = depth < 12 ? 0.66 : 0.49;
      if (random() < rate)
        steps.push(() => step(nx, ny, angle + (random() * Math.PI) / 10, depth + 1));
      if (random() < rate)
        steps.push(() => step(nx, ny, angle - (random() * Math.PI) / 10, depth + 1));
    };
    const batch = () => {
      const previous = steps;
      steps = [];
      previous.forEach((fn) => fn());
      count++;
    };
    const draw = (time: number) => {
      if (time - last > 32) {
        batch();
        last = time;
      }
      if (steps.length && count < 180) frame = requestAnimationFrame(draw);
      else frame = 0;
    };
    const start = () => {
      cancelAnimationFrame(frame);
      seed = 173;
      count = 0;
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = getComputedStyle(canvas).color;
      ctx.lineWidth = 0.7;
      steps = [
        () => step(-4, height * 0.24, 0.12, 0),
        () => step(-4, height * 0.76, -0.15, 0),
        () => step(width + 4, height * 0.3, Math.PI - 0.1, 0),
        () => step(width * 0.85, height + 4, -Math.PI / 2, 0),
        () => step(width * 0.18, -4, Math.PI / 2, 0),
      ];
      if (width < 640) steps = steps.slice(3);
      if (reduced.matches) {
        while (steps.length && count < 180) batch();
      } else frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      clearTimeout(timer);
      timer = setTimeout(start, 160);
    };
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (steps.length && !frame && !reduced.matches) frame = requestAnimationFrame(draw);
    };
    const observer = new MutationObserver(start);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    start();
    addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", start);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      observer.disconnect();
      removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", start);
    };
  }, []);
  return <canvas ref={ref} className={styles.sketch} aria-hidden="true" />;
}

// Bento's 12-cell fading cursor trail, reinterpreted in monochrome on canvas.
// https://github.com/Ladvace/astro-bento-portfolio/blob/master/src/lib/card-grids.ts
export function PointerTrail() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const fine = matchMedia("(pointer: fine)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let trail: { x: number; y: number; time: number }[] = [];
    let color = "";
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      color = getComputedStyle(canvas).color;
    };
    const draw = (now: number) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      trail = trail.filter((p) => now - p.time < 440);
      ctx.fillStyle = color;
      trail.forEach((p, i) => {
        ctx.globalAlpha = Math.max(0, 1 - (now - p.time) / 440) * (1 - i / 13) * 0.2;
        ctx.fillRect(p.x + 1, p.y + 1, 8, 8);
      });
      ctx.globalAlpha = 1;
      if (trail.length) frame = requestAnimationFrame(draw);
      else frame = 0;
    };
    const move = (event: PointerEvent) => {
      if (!fine.matches || reduced.matches || event.pointerType === "touch") return;
      const now = performance.now();
      const gx = Math.floor(event.clientX / 10) * 10,
        gy = Math.floor(event.clientY / 10) * 10;
      if (!trail[0] || trail[0].x !== gx || trail[0].y !== gy) {
        trail = [
          { x: gx, y: gy, time: now },
          ...trail.filter((p) => p.x !== gx || p.y !== gy),
        ].slice(0, 12);
      }
      if (!frame) {
        frame = requestAnimationFrame(draw);
      }
    };
    const clear = () => {
      trail = [];
      cancelAnimationFrame(frame);
      frame = 0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    const themeObserver = new MutationObserver(() => {
      color = getComputedStyle(canvas).color;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    resize();
    addEventListener("resize", resize);
    addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", clear);
    addEventListener("blur", clear);
    reduced.addEventListener("change", clear);
    fine.addEventListener("change", clear);
    return () => {
      clear();
      themeObserver.disconnect();
      removeEventListener("resize", resize);
      removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", clear);
      removeEventListener("blur", clear);
      reduced.removeEventListener("change", clear);
      fine.removeEventListener("change", clear);
    };
  }, []);
  return (
    <canvas ref={ref} className={styles.pointer} aria-hidden="true" data-testid="pointer-trail" />
  );
}
