export const metadata = {
  title: "Proformă + Notă de comandă",
  description: "Generator PDF – Proformă și Notă de comandă",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
