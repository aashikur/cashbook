"use client";

import { useEffect } from "react";

/**
 * Registers the CashBook PWA Service Worker in production only.
 * In development, unregisters any lingering Service Worker and purges dev caches
 * so Turbopack / HMR chunk updates are never served stale assets.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        })
        .catch(() => {});

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => {
            for (const key of keys) {
              if (key.startsWith("cashbook-")) {
                caches.delete(key);
              }
            }
          })
          .catch(() => {});
      }
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        registration.onupdatefound = () => {
          const installing = registration.installing;
          if (installing) {
            installing.onstatechange = () => {
              if (
                installing.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("[PWA] New version installed and ready on next reload.");
              }
            };
          }
        };
      } catch (error) {
        console.error("[PWA] Service Worker registration failed:", error);
      }
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, []);

  return null;
}
