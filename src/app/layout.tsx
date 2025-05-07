import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { Toaster } from "@/components/ui/toaster";
import dynamic from "next/dynamic";

const inter = Inter({ subsets: ["latin"] });

// Dynamically import ErrorBoundary to prevent it from affecting server components
const ErrorBoundary = dynamic(
    () => import("@/components/ui/error-boundary").then(mod => mod.ErrorBoundary),
    { ssr: false }
);

// Dynamically import ChunkErrorHandler
const ChunkErrorHandler = dynamic(
    () => import("@/components/ui/chunk-error-handler").then(mod => mod.ChunkErrorHandler),
    { ssr: false }
);

// Known problematic chunks that we want to preload
const CRITICAL_CHUNKS = ['4094']; // The chunk that's failing in production

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
        <html lang="en" className="h-full">
            <body className={`${inter.className} h-full overflow-x-hidden`}>
                {/* Initialize chunk error handling */}
                <ChunkErrorHandler chunkIds={CRITICAL_CHUNKS} />
                
                <AuthProvider>
                    <AIAssistantProvider>
                        <main className="min-h-screen bg-[#F8F9FA]">
                            <ErrorBoundary>
                                {children}
                            </ErrorBoundary>
                        </main>
                    </AIAssistantProvider>
                </AuthProvider>
                <Toaster />
            </body>
        </html>
    );
}
