import { useEffect } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import type { Route } from './+types/root';
// 一時的に global-loader を無効化中。
// import { GlobalLoader } from './components/features/Loader';
import UpdateToast from './components/features/Pwa/UpdateToast';
import { TrpcProvider } from './lib/trpc-provider';
import './global.css';

export const meta: Route.MetaFunction = () => {
  return [{ title: '雙峰祭 企画検索システム' }];
};

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
  { rel: 'icon', type: 'image/svg+xml', href: '/logo/square.svg' },
  { rel: 'manifest', href: '/manifest.webmanifest' },
  { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Noto+Sans+JP:wght@400;500;700&family=Yuji+Syuku&display=swap',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('debug-loader')) {
      return;
    }

    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.classList.add('fade-out');
      const timeout = setTimeout(() => {
        loader.remove();
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, []);

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-title" content="雙峰祭" />
        <Meta />
        <Links />
      </head>
      <body>
        {/* <GlobalLoader /> */}
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <TrpcProvider>
      <Outlet />
      <UpdateToast />
    </TrpcProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
