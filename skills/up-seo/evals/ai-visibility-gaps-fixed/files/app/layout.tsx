export const metadata = {
  metadataBase: new URL("https://sunrise-bakery.example"),
  title: "Sunrise Bakery",
  description: "Neighbourhood bakery in Taipei",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
