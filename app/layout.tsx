import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ToastProvider } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'Lootube',
  description: 'A YouTube-like application',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
      {
        url: '/brand/logo.svg',
        type: 'image/svg+xml',
        sizes: 'any'
      }
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="grammarly-disable" strategy="beforeInteractive">
          {`
            window.Grammarly = {
              _isDisabled: true,
              _isOn: false,
              _isInitialized: true,
              _listen: function() {},
              _getDocumentUID: function() { return null; }
            };
          `}
        </Script>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var storedTheme = localStorage.getItem('theme');
                var systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : storedTheme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : (systemPrefersDark ? 'dark' : 'light');
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(theme);
              } catch (error) {
                var fallbackTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                document.documentElement.classList.add(fallbackTheme);
              }
            })();
          `}
        </Script>
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
