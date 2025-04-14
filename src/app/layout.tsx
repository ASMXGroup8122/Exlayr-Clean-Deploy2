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
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="h-full">
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
