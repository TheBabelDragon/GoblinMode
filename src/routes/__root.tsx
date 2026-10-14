import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router"
import { AuthProvider } from "@/lib/auth/provider"
import { PreviewHostBridge } from "@/components/preview-host-bridge"
import appCss from "../styles.css?url"

const APP_NAME = "Goblin Lab"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: "BabelPipe, an experimental cipher pipeline bench for BabelForge." },
      { name: "theme-color", content: "#1a1612" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,460;9..144,620&family=IBM+Plex+Mono:wght@400;500&family=Noto+Serif+Hebrew:wght@500;600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
})
