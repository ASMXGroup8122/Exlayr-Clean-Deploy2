import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProviderDynamic } from "@/contexts/AuthContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Exlayr",
    description: "Exlayr Platform",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1.0,
    maximumScale: 1.0,
    userScalable: false
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="h-full" suppressHydrationWarning>
            <body className={`${inter.className} h-full overflow-x-hidden`} suppressHydrationWarning>
                <ErrorBoundary>
                    <AuthProviderDynamic>
                        <AIAssistantProvider>
                            <main className="min-h-screen bg-[#F8F9FA]">
                                {children}
                            </main>
                        </AIAssistantProvider>
                    </AuthProviderDynamic>
                </ErrorBoundary>
                <Toaster />
            </body>
        </html>
    );
}
