import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";

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
        <html lang="en">
            <body className={inter.className}>
                <AuthProvider>
                    <AIAssistantProvider>
                        {children}
                    </AIAssistantProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
