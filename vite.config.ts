import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3009,
      host: "0.0.0.0",
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon.svg", "icon.png"],
        manifest: {
          name: "Tiệm bánh Cúc Quy",
          short_name: "CucQuy",
          description:
            "Hệ thống quản lý đơn hàng thông minh cho Tiệm bánh Cúc Quy",
          theme_color: "#ea580c",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait-primary",
          start_url: "/",
          icons: [
            {
              src: "./icon.svg",
              sizes: "any",
              type: "image/svg+xml",
            },
          ],
        },
        workbox: {
          // Tăng giới hạn file size để precache (mặc định 2 MB)
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
          // Precache offline.html
          additionalManifestEntries: [{ url: "/offline.html", revision: null }],
          // Fallback về offline.html chỉ khi không có trong precache và network fail
          navigateFallback: "/offline.html",
          navigateFallbackDenylist: [/^\/api/, /^\/offline\.html$/, /\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/],
          // Runtime caching strategies
          runtimeCaching: [
            {
              // Root path và index.html - NetworkFirst với fallback về offline.html
              urlPattern: ({ url }) => {
                return url.pathname === '/' || url.pathname === '/index.html';
              },
              handler: 'NetworkFirst',
              options: {
                cacheName: 'root-cache',
                networkTimeoutSeconds: 10, // Đợi network 10 giây
                cacheableResponse: {
                  statuses: [0, 200]
                },
                expiration: {
                  maxEntries: 1,
                  maxAgeSeconds: 60 // 1 phút
                },
                matchOptions: {
                  ignoreSearch: false
                }
              }
            },
            {
              // Navigation requests - NetworkFirst với fallback
              urlPattern: ({ request }) => {
                return request.mode === 'navigate';
              },
              handler: 'NetworkFirst',
              options: {
                cacheName: 'navigation-cache',
                networkTimeoutSeconds: 10, // Đợi network 10 giây
                cacheableResponse: {
                  statuses: [0, 200]
                },
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 5 // 5 phút
                }
              }
            },
            {
              // HTML files (trừ offline.html) - NetworkFirst
              urlPattern: ({ url }) => {
                return /\.html$/.test(url.pathname) && url.pathname !== '/offline.html';
              },
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
                networkTimeoutSeconds: 10,
                cacheableResponse: {
                  statuses: [0, 200]
                },
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 // 1 giờ
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: "module",
        },
      }),
    ],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.FIREBASE_API_KEY": JSON.stringify(env.FIREBASE_API_KEY),
      "process.env.FIREBASE_AUTH_DOMAIN": JSON.stringify(
        env.FIREBASE_AUTH_DOMAIN
      ),
      "process.env.FIREBASE_PROJECT_ID": JSON.stringify(
        env.FIREBASE_PROJECT_ID
      ),
      "process.env.FIREBASE_STORAGE_BUCKET": JSON.stringify(
        env.FIREBASE_STORAGE_BUCKET
      ),
      "process.env.FIREBASE_MESSAGING_SENDER_ID": JSON.stringify(
        env.FIREBASE_MESSAGING_SENDER_ID
      ),
      "process.env.FIREBASE_APP_ID": JSON.stringify(env.FIREBASE_APP_ID),
      "process.env.FIREBASE_MEASUREMENT_ID": JSON.stringify(
        env.FIREBASE_MEASUREMENT_ID
      ),
      "process.env.ZALO_SHOP_CODE": JSON.stringify(env.ZALO_SHOP_CODE),
      "process.env.ZALO_TOKEN": JSON.stringify(env.ZALO_TOKEN),
      "process.env.ZALO_URL": JSON.stringify(env.ZALO_URL),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
