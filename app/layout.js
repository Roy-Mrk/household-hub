import localFont from "next/font/local";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "household hub",
  description: "家計の収入と支出を管理するアプリ",
};

export default async function RootLayout({ children }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientLayout user={user}>{children}</ClientLayout>
      </body>
    </html>
  );
}
