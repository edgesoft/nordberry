import { ClerkApp } from "@clerk/remix";
import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "@remix-run/react";
import { dark } from "@clerk/themes";
import { prisma } from "./utils/db.server";
import { rootAuthLoader } from "@clerk/remix/ssr.server";
import tailwindStylesheetUrl from "./tailwind.css?url";
import Header from "./components/header";
import NotFound from "./routes/_404";
import toast, { Toaster } from "react-hot-toast";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStylesheetUrl },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "icon",
    href: "/logo-slick.png", // Sökväg från roten eftersom den ligger i /public
    type: "image/png",
  },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous", // "true" är inte standard, använd "anonymous" eller ta bort
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const metaImage = `${data.baseUrl}/meta-og.png?v=${data.timestamp}`;
  return [
    { title: "Nordberry" },
    { name: "description", content: "Nordberry project manager" },

    { property: "og:title", content: "Nordberry project manager" },
    { property: "og:description", content: "Nordberry project manager" },
    {
      property: "og:url",
      content: data.baseUrl,
    },
    {
      property: "og:image",
      content: metaImage,
    },
    { property: "og:type", content: "website" },

    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Nordberry project manager" },
    { name: "twitter:description", content: "Beskrivning av sidan" },
    {
      name: "twitter:image",
      content: metaImage,
    },
  ];
};

export const loader: LoaderFunction = (args) => {
  return rootAuthLoader(args, async ({ request }) => {
    const { sessionId, userId, getToken } = request.auth;
    const url = new URL(request.url);
    const baseUrl =
      url.hostname === "localhost"
        ? `${url.protocol}//${url.host}`
        : `https://${url.host}`;

    const dbUser = userId
      ? await prisma.user.findUnique({
          where: { clerkUserId: userId },
        })
      : null;

    return {
      userId,
      sessionId,
      getToken,
      dbUser,
      baseUrl,
      timestamp: Date.now()
    };
  });
};

export function ErrorBoundary() {
  const error = useRouteError();
  if (error.status === 404) {
    return (
      <html lang="sv" className="bg-black">
        <head>
          <Meta />
          <Links />
        </head>
        <body>
          <div className="min-h-screen flex items-center justify-center">
            <NotFound />
          </div>
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    );
  }

  return (
    <html lang="sv">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="bg-black">
        <h1 className="text-white p-4">Något gick fel</h1>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function App() {
  return (
    <html lang="sv" className="bg-black">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-black">
        <div className="fixed top-0 left-0 right-0 z-50 bg-black">
          <Header />
        </div>
        <Outlet />
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default ClerkApp(App, {
  appearance: { baseTheme: dark },
});
