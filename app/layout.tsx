import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0C0C0C",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://brandex.pk"),
  title: {
    default: "Brandex Law Associates — Trademark & IP Records CMS",
    template: "%s | Brandex Law Associates",
  },
  description: "Official Trademark Application Generator, Document MailMerge and Intellectual Property Records CMS for Brandex Law Associates.",
  applicationName: "Brandex Workflow CMS",
  authors: [{ name: "Brandex Law Associates", url: "https://brandex.pk" }],
  keywords: [
    "Brandex Law Associates",
    "Trademark Application",
    "IPO Pakistan",
    "Intellectual Property",
    "TM-1 Generator",
    "TM-48 Authorization",
    "Trademark CMS",
    "Legal Records Workflow"
  ],
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/assets/brandex-favicon-20261003.png", sizes: "64x64", type: "image/png" },
      { url: "/assets/brandex-logo-20.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/assets/brandex-favicon-20261003.png",
    apple: [
      { url: "/assets/brandex-logo-12.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: "https://brandex.pk",
    siteName: "Brandex Law Associates CMS",
    title: "Brandex Law Associates — Trademark & IP Records CMS",
    description: "Official Trademark Application Generator, Document MailMerge and Intellectual Property Records CMS for Brandex Law Associates.",
    images: [
      {
        url: "/assets/brandex-social-preview-20261003.png",
        width: 1200,
        height: 630,
        alt: "Brandex Law Associates - Trademark CMS",
      },
      {
        url: "/assets/brandex-logo-14.png",
        width: 800,
        height: 600,
        alt: "Brandex Law Associates Wordmark Logo",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brandex Law Associates — Trademark & IP Records CMS",
    description: "Official Trademark Application Generator, Document MailMerge and Intellectual Property Records CMS for Brandex Law Associates.",
    images: ["/assets/brandex-social-preview-20261003.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LegalService",
  "name": "Brandex Law Associates",
  "url": "https://brandex.pk",
  "logo": "https://brandex.pk/assets/brandex-logo-12.png",
  "image": "https://brandex.pk/assets/brandex-social-preview-20261003.png",
  "description": "Intellectual property law consultancy providing trademark registration, copyright, patent, and legal document generation in Pakistan.",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "PK"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="theme-neobrutalism" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
