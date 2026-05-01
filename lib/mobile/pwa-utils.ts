// Progressive Web App utilities for mobile offline support
export function setupPWA() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("[v0] SW registration failed:", error)
    })
  }
}

// Detect if app is running as PWA
export function isRunningAsPWA(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  )
}

// Store data for offline use
export async function cacheDataForOffline(key: string, data: any) {
  try {
    if ("caches" in window) {
      const cache = await caches.open("nexus-erp-v1")
      const response = new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      })
      await cache.put(`/offline/${key}`, response)
    }
  } catch (error) {
    console.error("[v0] Cache failed:", error)
  }
}

// Sync data when connection restored
export async function syncOnlineData() {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SYNC_DATA" })
  }
}
