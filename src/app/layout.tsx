import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Exlayr",
    description: "Exlayr Platform",
    viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="h-full">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
            </head>
            <body className={`${inter.className} h-full`}>
                <AuthProvider>
                    <AIAssistantProvider>
                        <main className="min-h-screen bg-[#F8F9FA]">
                            {children}
                        </main>
                    </AIAssistantProvider>
                </AuthProvider>
                <Toaster />
            </body>
        </html>
    );
}
