import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brandex Law Associates CMS",
  description: "Trademark Application Generator, Document MailMerge and Records CMS for Brandex Law Associates",
  openGraph: {
    images: ["/assets/brandex-social-preview-20261003.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="theme-neobrutalism">
      <head>
        <link rel="icon" type="image/png" href="/assets/brandex-favicon-20261003.png" />
        <link rel="apple-touch-icon" href="/assets/brandex-logo-12.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;700&family=DM+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
