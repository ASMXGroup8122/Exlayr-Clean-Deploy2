import AuthLayout from '@/layouts/AuthLayout';

export default function AuthRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthLayout>{children}</AuthLayout>;
} 
