import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
    message?: string;
    fullScreen?: boolean;
}

export function LoadingState({ message = 'Loading...', fullScreen = false }: LoadingStateProps) {
    const content = (
        <div className="flex flex-col items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-2 text-sm text-gray-600">{message}</p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
                {content}
            </div>
        );
    }

    return content;
}

export function AuthLoadingState() {
    return (
        <LoadingState 
            message="Checking authentication..." 
            fullScreen={true} 
        />
    );
}

export function SessionLoadingState() {
    return (
        <LoadingState 
            message="Loading session..." 
            fullScreen={true} 
        />
    );
}

export function DocumentLoadingState() {
    return (
        <LoadingState 
            message="Loading documents..." 
            fullScreen={false} 
        />
    );
} 