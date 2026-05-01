const CACHE_NAME = "nexus-erp-v1"
const urlsToCache = ["/", "/dashboard", "/offline.html", "/css/offline.css"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => {
        console.log("[v0] Some assets could not be cached")
      })
    }),
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        if (response) return response

        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
      })
      .catch(() => {
        return new Response("Offline - No cached data available", { status: 503 })
      }),
  )
})
