"use client";

import { useEffect } from "react";

/**
 * Registers the CashBook PWA Service Worker to enable offline application boot.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });

          // Check for service worker updates periodically
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
    }
  }, []);

  return null;
}
