import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://brandex.pk"),
  title: "Brandex Law Associates CMS",
  description: "Trademark Application Generator, Document MailMerge and Records CMS for Brandex Law Associates",
  icons: {
    icon: "/assets/brandex-favicon-20261003.png",
    apple: "/assets/brandex-logo-12.png",
  },
  openGraph: {
    title: "Brandex Law Associates CMS",
    description: "Trademark Application Generator, Document MailMerge and Records CMS for Brandex Law Associates",
    images: ["/assets/brandex-social-preview-20261003.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="theme-neobrutalism" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
