'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useDocumentAnalysis } from '@/contexts/DocumentAnalysisContext';
import { DocumentAnalysisProvider } from '@/contexts/DocumentAnalysisContext';
import DocumentAnalysisButton from './DocumentAnalysisButton';
import { getSupabaseClient } from '@/lib/supabase/client';

// Types
interface Comment {
    id: string;
    user_id: string;
    comment: string;
    created_at: string;
    status: 'open' | 'resolved' | 'needs_clarification';
}

interface Section {
    id: string;
    document_id: string;
    title: string;
    content: string;
    status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'in_progress';
    version: number;
    created_at: string;
    updated_at: string;
    group?: string;
}

interface User {
    id: string;
    email: string;
    full_name?: string;
}

// Helper functions
const getStatusColor = (status: Section['status']) => {
    switch (status) {
        case 'pending':
            return 'bg-yellow-500';
        case 'approved':
            return 'bg-green-500';
        case 'rejected':
            return 'bg-red-500';
        case 'needs_revision':
            return 'bg-orange-500';
        case 'in_progress':
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
            return <XCircle className="w-4 h-4" />;
        case 'needs_revision':
            return <Edit className="w-4 h-4" />;
        case 'in_progress':
            return <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />;
        default:
            return <AlertTriangle className="w-4 h-4" />;
    }
};

// Components
const UserAvatar = ({ userId }: { userId: string }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('users')
                .select('id, email, full_name')
                .eq('id', userId)
                .single();
            
            if (!error && data) {
                setUser(data);
            }
        };
        
        fetchUser();
    }, [userId]);

    if (!user?.full_name) {
        return <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">?</div>;
    }

    const initials = user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();

    return (
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
            {initials}
        </div>
    );
};

const CommentComponent = ({ comment }: { comment: Comment }) => {
    return (
        <div className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
            <UserAvatar userId={comment.user_id} />
            <div className="flex-1">
                <p className="text-sm text-gray-700">{comment.comment}</p>
                <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
            </div>
        </div>
    );
};

const SectionComponent = ({
    section,
    onStatusChange,
    documentId
}: {
    section: Section;
    onStatusChange: (id: string, status: Section['status']) => void;
    documentId: string;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [newComment, setNewComment] = useState('');
    const { state } = useDocumentAnalysis();
    const [comments, setComments] = useState<Comment[]>([]);
    const supabase = getSupabaseClient();

    useEffect(() => {
        const fetchComments = async () => {
            const { data, error } = await supabase
                .from('section_comments')
                .select('*')
                .eq('section_id', section.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setComments(data);
            }
        };

        fetchComments();
    }, [section.id]);

    const handleStatusChange = async () => {
        const newStatus = section.status === 'pending' ? 'in_progress' : 'pending';
        const { error } = await supabase
            .from('document_sections')
            .update({ status: newStatus })
            .eq('id', section.id);

        if (!error) {
            onStatusChange(section.id, newStatus);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) return;

        const { error } = await supabase
            .from('section_comments')
            .insert({
                section_id: section.id,
                user_id: userData.user.id,
                comment: newComment,
                status: 'open'
            });

        if (!error) {
            setNewComment('');
            // Refresh comments
            const { data: updatedComments } = await supabase
                .from('section_comments')
                .select('*')
                .eq('section_id', section.id)
                .order('created_at', { ascending: false });

            if (updatedComments) {
                setComments(updatedComments);
            }
        }
    };

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
                        <div className="prose prose-sm max-w-none mb-4">
                            {section.content}
                        </div>
                        <div className="space-y-3">
                            {comments.map((comment) => (
                                <CommentComponent key={comment.id} comment={comment} />
                            ))}
                            <div className="flex space-x-2">
                                <Input
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1"
                                />
                                <Button onClick={handleAddComment}>
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Comment
                                </Button>
                            </div>
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
            <ScrollArea className="h-[calc(100vh-8rem)]">
                <div className="space-y-2">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => onSectionSelect(section.id)}
                            className={cn(
                                "w-full text-left p-2 rounded hover:bg-gray-100",
                                currentSection === section.id && "bg-gray-100"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm truncate">{section.title}</span>
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(section.status)}`} />
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>
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
            <SheetContent side="right" className="w-[600px] sm:w-[800px]">
                <SheetHeader>
                    <SheetTitle>Full Document</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
                    <div className="space-y-8">
                        {sections.map((section) => (
                            <div key={section.id}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">{section.title}</h3>
                                    <div className={`w-3 h-3 rounded-full ${getStatusColor(section.status)}`} />
                                </div>
                                <div className="prose prose-sm max-w-none">
                                    {section.content}
                                </div>
                                <Separator className="mt-8" />
                            </div>
                        ))}
                    </div>
                </ScrollArea>
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
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const supabase = getSupabaseClient();

    const fetchSections = async () => {
        const { data, error } = await supabase
            .from('document_sections')
            .select('*')
            .eq('document_id', documentId)
            .order('created_at');

        if (!error && data) {
            setSections(data);
        }
    };

    useEffect(() => {
        fetchSections();
    }, [documentId]);

    const handleSectionClick = (id: string) => {
        setActiveSectionId(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleStatusChange = async (id: string, newStatus: Section['status']) => {
        setSections(prevSections =>
            prevSections.map(section =>
                section.id === id ? { ...section, status: newStatus } : section
            )
        );
    };

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