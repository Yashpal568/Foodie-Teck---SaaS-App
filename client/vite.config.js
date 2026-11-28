import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const STAGING_SUPABASE_REF = "mhkxdidwmycsibdjflxz"
const STAGING_ORIGIN_HOST = "staging-menu.servora.invalid"

function enforceProductionSupabaseBoundary(mode) {
  return {
    name: "servora-production-supabase-boundary",
    apply: "build",
    configResolved() {
      if (mode !== "production") return
      const env = loadEnv(mode, process.cwd(), "")
      const candidates = {
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
        VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
        VITE_APP_URL: env.VITE_APP_URL || process.env.VITE_APP_URL || "",
      }
      for (const [key, val] of Object.entries(candidates)) {
        const lower = String(val).toLowerCase()
        if (lower.includes(STAGING_SUPABASE_REF) || lower.includes(STAGING_ORIGIN_HOST)) {
          throw new Error(
            `[ENV BOUNDARY ABORT] Production build cannot use staging credential/host in ${key} (${STAGING_SUPABASE_REF}). Production builds must target Primary Supabase (oliuhzkbnxjiwkrdlcfv).`
          )
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), enforceProductionSupabaseBoundary(mode)],
  esbuild:
    mode === "production"
      ? {
          drop: ["console", "debugger"],
          legalComments: "none",
        }
      : undefined,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.{js,jsx}'],
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts'
            }
            if (id.includes('jspdf')) {
              return 'vendor-pdf'
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide'
            }
          }
        }
      }
    }
  }
}))
