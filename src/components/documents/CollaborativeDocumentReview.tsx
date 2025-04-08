'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    CheckCircle,
    Check,
    XCircle,
    MessageCircle,
    FileText,
    File,
    Loader2,
    AlertTriangle,
    Users,
    Edit,
    Lock,
    Unlock,
    List,
    ChevronDown,
    ArrowRightCircle,
    Sparkles,
    X,
    MessageSquare,
    Download,
    Share2,
    Eye,
    ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useDocumentAnalysis, DocumentAnalysisContextType } from '@/contexts/DocumentAnalysisContext';
import { DocumentAnalysisProvider } from '@/contexts/DocumentAnalysisContext';
import DocumentAnalysisButton from './DocumentAnalysisButton';

// Types
interface Comment {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: string;
    status: 'open' | 'resolved' | 'needs clarification';
}

interface Section {
    id: string;
    title: string;
    content: string;
    status: 'pending' | 'approved' | 'rejected' | 'analyzing';
    lastUpdatedBy: string;
    lastUpdatedByName: string;
    comments: Comment[];
}

interface User {
    id: string;
    name: string;
    initials: string;
    avatarUrl?: string;
}

// Mock data (replace with actual data from your backend)
const mockUsers: User[] = [
    { id: 'user1', name: 'Alice Smith', initials: 'AS', avatarUrl: 'https://placehold.co/40x40/000/FFF?text=AS' },
    { id: 'user2', name: 'Bob Johnson', initials: 'BJ', avatarUrl: 'https://placehold.co/40x40/EEE/333?text=BJ' },
    { id: 'user3', name: 'Charlie Brown', initials: 'CB', avatarUrl: 'https://placehold.co/40x40/888/FFF?text=CB' },
    { id: 'user4', name: 'Dana White', initials: 'DW', avatarUrl: 'https://placehold.co/40x40/469990/FFF?text=DW' },
];

// Helper functions
const getStatusColor = (status: Section['status']) => {
    switch (status) {
        case 'pending':
            return 'bg-gray-500';
        case 'approved':
            return 'bg-green-500';
        case 'rejected':
            return 'bg-red-500';
        case 'analyzing':
            return 'bg-blue-500';
        default:
            return 'bg-gray-500';
    }
};

const getStatusIcon = (status: Section['status']) => {
    switch (status) {
        case 'pending':
            return <AlertTriangle className="w-4 h-4" />;
        case 'approved':
            return <Check className="w-4 h-4" />;
        case 'rejected':
            return <X className="w-4 h-4" />;
        case 'analyzing':
            return <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />;
        default:
            return <AlertTriangle className="w-4 h-4" />;
    }
};

// Components
const UserAvatar = ({ user }: { user: User | undefined }) => {
    if (!user) {
        return <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">?</div>;
    }
    if (user.avatarUrl) {
        return <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />;
    }
    return <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">{user.initials}</div>;
};

const CommentComponent = ({ comment }: { comment: Comment }) => {
    const user = mockUsers.find(u => u.id === comment.userId);

    return (
        <div className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
            <UserAvatar user={user} />
            <div className="flex-1">
                <p className="text-sm text-gray-700">{comment.text}</p>
                <span className="text-xs text-gray-500">{comment.timestamp}</span>
            </div>
        </div>
    );
};

const SectionComponent = ({
    section,
    onStatusChange,
    isEditing,
    user,
    documentId
}: {
    section: Section;
    onStatusChange: (id: string, status: Section['status']) => void;
    isEditing: boolean;
    user: User | undefined;
    documentId: string;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [newComment, setNewComment] = useState('');
    const { state } = useDocumentAnalysis();

    const handleStatusChange = () => {
        onStatusChange(section.id, section.status === 'approved' ? 'rejected' : 'approved');
    };

    const lastUpdatedUser = mockUsers.find(u => u.id === section.lastUpdatedBy);

    // Get AI analysis results for this section
    const sectionAnalysis = state?.sectionStates?.[section.id]?.result;

    return (
        <div className="border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <ChevronRight
                            className={`w-4 h-4 transform transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                            }`}
                        />
                    </button>
                    <h3 className="font-medium">{section.title}</h3>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(section.status)}`} />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStatusChange}
                    >
                        {getStatusIcon(section.status)}
                    </Button>
                </div>
            </div>
            
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4"
                    >
                        <p className="text-gray-700 mb-4">{section.content}</p>
                        <div className="space-y-3">
                            {section.comments.map((comment) => (
                                <CommentComponent key={comment.id} comment={comment} />
                            ))}
                            {isEditing && user && (
                                <div className="flex space-x-2">
                                    <Input
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="flex-1"
                                    />
                                    <Button onClick={() => setNewComment('')}>
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Comment
                                    </Button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TableOfContents = ({
    sections,
    currentSection,
    onSectionSelect
}: {
    sections: Section[];
    currentSection: string | null;
    onSectionSelect: (id: string) => void;
}) => {
    return (
        <div className="w-64 border-r p-4">
            <h2 className="font-semibold mb-4">Table of Contents</h2>
            <div className="space-y-2">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => onSectionSelect(section.id)}
                        className={`w-full text-left p-2 rounded hover:bg-gray-100 ${
                            currentSection === section.id ? 'bg-gray-100' : ''
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm">{section.title}</span>
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(section.status)}`} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const ViewFullDocumentModal = ({ sections }: { sections: Section[] }) => {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    View Full Document
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[600px]">
                <SheetHeader>
                    <SheetTitle>Full Document</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                    {sections.map((section) => (
                        <div key={section.id} className="prose">
                            <h3>{section.title}</h3>
                            <p>{section.content}</p>
                            <Separator className="my-4" />
                        </div>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    );
};

const ExportOptions = () => {
    return (
        <div className="flex space-x-2">
            <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
            </Button>
            <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
            </Button>
            <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview
            </Button>
        </div>
    );
};

interface CollaborativeDocumentReviewProps {
    documentId: string;
}

const CollaborativeDocumentReview = ({ documentId }: CollaborativeDocumentReviewProps) => {
    const [sections, setSections] = useState<Section[]>([]);
    const [user, setUser] = useState<User | undefined>(mockUsers[0]);
    const [isEditing, setIsEditing] = useState(true);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const { isAnalyzing, analysisResult, startAnalysis } = useDocumentAnalysis();

    const handleSectionClick = (id: string) => {
        setActiveSectionId(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleStatusChange = (id: string, newStatus: Section['status']) => {
        setSections(prevSections =>
            prevSections.map(section =>
                section.id === id ? { ...section, status: newStatus } : section
            )
        );
    };

    // Fetch initial data
    useEffect(() => {
        // TODO: Replace with actual API call
        const mockSections: Section[] = [
            {
                id: 'section1',
                title: 'Introduction',
                content: 'This is the introduction section. It provides an overview of the document.',
                status: 'pending',
                lastUpdatedBy: 'user1',
                lastUpdatedByName: 'Alice Smith',
                comments: [
                    {
                        id: 'comment1',
                        userId: 'user2',
                        userName: 'Bob Johnson',
                        text: 'Great intro!',
                        timestamp: '2024-07-24T10:00:00Z',
                        status: 'open'
                    },
                ],
            },
            // Add more mock sections as needed
        ];
        setSections(mockSections);
    }, [documentId]);

    return (
        <DocumentAnalysisProvider documentId={documentId}>
            <div className="flex h-screen">
                <TableOfContents
                    sections={sections}
                    currentSection={activeSectionId}
                    onSectionSelect={handleSectionClick}
                />
                <div className="flex-1 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">Document Review</h1>
                        <div className="flex space-x-4">
                            <ExportOptions />
                            <ViewFullDocumentModal sections={sections} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        {sections.map((section) => (
                            <section id={section.id} key={section.id}>
                                <SectionComponent
                                    section={section}
                                    onStatusChange={handleStatusChange}
                                    isEditing={isEditing}
                                    user={user}
                                    documentId={documentId}
                                />
                            </section>
                        ))}
                    </div>
                </div>
            </div>
        </DocumentAnalysisProvider>
    );
};

export default CollaborativeDocumentReview; 