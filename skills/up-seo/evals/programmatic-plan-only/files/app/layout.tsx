export const metadata = {
  metadataBase: new URL("https://sunrise-bakery.example"),
  title: "Sunrise Bakery",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
