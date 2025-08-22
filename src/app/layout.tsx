import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "./redux/provider";



export const metadata: Metadata = {
  title: "Slack Clone",
  description: "Chat app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var saved = localStorage.getItem('theme');
    var dark = saved ? saved === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
          `,
          }}
        />
      </head>
      <body
        className="antialiased"
      >
       <Providers>{children}</Providers>
      </body>
    </html>
  );
}
