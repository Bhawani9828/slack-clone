// app/RootLayout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./redux/provider";
import { FCMProvider } from "@/components/FCMProvider";
import { DebugFCM } from "@/components/DebugFCM";
import { SnackbarProvider } from "@/hooks/SnackbarProvider";



export const metadata: Metadata = {
  title: "Slack Clone",
  description: "Chat app",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
      <body className="antialiased">
          <Providers>
             <SnackbarProvider>
            <FCMProvider>
            {children}
             {/* Development में debug panel show करें */}
          {process.env.NODE_ENV === 'development' && <DebugFCM />}
            </FCMProvider>
            </SnackbarProvider>
            </Providers>
        
      </body>
    </html>
  );
}
