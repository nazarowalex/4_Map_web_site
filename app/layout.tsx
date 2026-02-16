
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <div className="header">
          <b>Dry Bulk Operational Hub</b>
          <a href="/">Home</a>
          <a href="/map">Map</a>
        </div>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
