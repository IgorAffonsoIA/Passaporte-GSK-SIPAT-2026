import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Passaporte SIPAT", description: "Seu passaporte digital para as atividades do evento GSK.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
