export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh-TW" }];
}

export default function LocaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
