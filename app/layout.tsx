import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mizo Mastery",
  description: "Journeyman exam prep for electricians",
};

function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/30 px-6 py-8 text-sm text-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
        <div>
          <div>© 2026 Mizo Mastery · A product of INM Unlimited LLC</div>
          <div className="mt-1">Contact: inm.unlimited.llc@gmail.com</div>
          <div className="mt-1">
            Mizo Mastery is an educational training platform and is not affiliated
            with NEC, NFPA, PSI, or any licensing authority.
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="/terms" className="transition hover:text-white">Terms</a>
          <a href="/privacy" className="transition hover:text-white">Privacy</a>
          <a href="/refund" className="transition hover:text-white">Refund</a>
          <a href="/contact" className="transition hover:text-white">Contact</a>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
