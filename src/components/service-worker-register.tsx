"use client";

import { useEffect } from "react";
import { isMobileDevice } from "@/lib/device";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (!isMobileDevice()) {
        void navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) void registration.unregister();
        });
        return;
      }
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[SW] Registered:", reg.scope);
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "activated") {
                  console.log("[SW] Updated and active");
                }
              });
            }
          });
        })
        .catch((err) => console.warn("[SW] Registration failed:", err));
    }
  }, []);

  return null;
}
