'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    ArrowRightCircle
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

// Types and interfaces
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
    status: 'draft' | 'ai reviewed' | 'approved' | 'locked';
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

// Mock data
const mockUsers: User[] = [
    { id: 'user1', name: 'Alice Smith', initials: 'AS', avatarUrl: 'https://placehold.co/40x40/000/FFF?text=AS' },
    { id: 'user2', name: 'Bob Johnson', initials: 'BJ', avatarUrl: 'https://placehold.co/40x40/EEE/333?text=BJ' },
    { id: 'user3', name: 'Charlie Brown', initials: 'CB', avatarUrl: 'https://placehold.co/40x40/888/FFF?text=CB' },
    { id: 'user4', name: 'Dana White', initials: 'DW', avatarUrl: 'https://placehold.co/40x40/469990/FFF?text=DW' },
];

const mockSections: Section[] = [
    {
        id: 'section1',
        title: 'Introduction',
        content: 'This is the introduction section. It provides an overview of the document.',
        status: 'draft',
        lastUpdatedBy: 'user1',
        lastUpdatedByName: 'Alice Smith',
        comments: [
            { id: 'comment1', userId: 'user2', userName: 'Bob Johnson', text: 'Great intro!', timestamp: '2024-07-24T10:00:00Z', status: 'open' },
        ],
    },
    {
        id: 'section2',
        title: 'Background',
        content: 'This section provides the background information for the topic.',
        status: 'ai reviewed',
        lastUpdatedBy: 'user2',
        lastUpdatedByName: 'Bob Johnson',
        comments: [],
    },
    {
        id: 'section3',
        title: 'Methods',
        content: 'This section describes the methods used in the study.',
        status: 'approved',
        lastUpdatedBy: 'user1',
        lastUpdatedByName: 'Alice Smith',
        comments: [
            { id: 'comment2', userId: 'user3', userName: 'Charlie Brown', text: 'Need more detail on data analysis.', timestamp: '2024-07-24T12:30:00Z', status: 'needs clarification' },
        ],
    },
    {
        id: 'section4',
        title: 'Results',
        content: 'This section presents the results of the study.',
        status: 'locked',
        lastUpdatedBy: 'user3',
        lastUpdatedByName: 'Charlie Brown',
        comments: [],
    },
    {
        id: 'section5',
        title: 'Discussion',
        content: 'This section discusses the implications of the results.',
        status: 'draft',
        lastUpdatedBy: 'user4',
        lastUpdatedByName: 'Dana White',
        comments: [],
    },
    {
        id: 'section6',
        title: 'Conclusion',
        content: 'This section concludes the document.',
        status: 'draft',
        lastUpdatedBy: 'user1',
        lastUpdatedByName: 'Alice Smith',
        comments: [],
    },
];

// Helper functions
const getStatusColor = (status: Section['status']) => {
    switch (status) {
        case 'draft':
            return 'text-gray-500';
        case 'ai reviewed':
            return 'text-blue-500';
        case 'approved':
            return 'text-green-500';
        case 'locked':
            return 'text-red-500';
        default:
            return 'text-gray-500';
    }
};

const getStatusIcon = (status: Section['status']) => {
    switch (status) {
        case 'draft':
            return <FileText className="w-4 h-4" />;
        case 'ai reviewed':
            return <CheckCircle className="w-4 h-4 text-blue-500" />;
        case 'approved':
            return <Check className="w-4 h-4 text-green-500" />;
        case 'locked':
            return <Lock className="w-4 h-4 text-red-500" />;
        default:
            return <FileText className="w-4 h-4" />;
    }
};

// Components
const AITooltip = () => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300">
                    AI Analyse
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Analyze this section with AI</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

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
        <div className="mb-2 p-2 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                <UserAvatar user={user} />
                <span className="ml-2 font-medium">{comment.userName}</span>
                <span className="ml-auto">{new Date(comment.timestamp).toLocaleString()}</span>
            </div>
            <p className="text-sm">{comment.text}</p>
            <div className="mt-1 flex items-center gap-2">
                {comment.status === 'open' && <span className="text-xs text-red-500">Open</span>}
                {comment.status === 'resolved' && <span className="text-xs text-green-500">Resolved</span>}
                {comment.status === 'needs clarification' && <span className="text-xs text-yellow-500">Needs Clarification</span>}
            </div>
        </div>
    );
};

const SectionComponent = ({
    section,
    onUpdateSection,
    onLockSection,
    onAddComment,
    isEditing,
    user
}: {
    section: Section;
    onUpdateSection: (id: string, updates: Partial<Section>) => void;
    onLockSection: (id: string) => void;
    onAddComment: (sectionId: string, comment: Omit<Comment, 'id'>) => void;
    isEditing: boolean;
    user: User | undefined;
}) => {
    const [localContent, setLocalContent] = useState(section.content);
    const [isAILoading, setIsAILoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setLocalContent(section.content);
    }, [section.content]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [localContent]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalContent(e.target.value);
    };

    const handleSave = () => {
        onUpdateSection(section.id, { content: localContent });
    };

    const handleAIAnalysis = async () => {
        setIsAILoading(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        onUpdateSection(section.id, { status: 'ai reviewed' });
        setIsAILoading(false);
    };

    const handleLock = () => {
        onLockSection(section.id);
    };

    const handleAddComment = () => {
        if (newComment.trim() && user) {
            const comment: Omit<Comment, 'id'> = {
                userId: user.id,
                userName: user.name,
                text: newComment,
                timestamp: new Date().toISOString(),
                status: 'open',
            };
            onAddComment(section.id, comment);
            setNewComment('');
        }
    };

    const lastUpdatedUser = mockUsers.find(u => u.id === section.lastUpdatedBy);

    return (
        <Card className="mb-6 shadow-md transition-shadow hover:shadow-lg">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(section.status)}
                        {section.title}
                        <span className={cn("text-sm", getStatusColor(section.status))}>
                            ({section.status.charAt(0).toUpperCase() + section.status.slice(1)})
                        </span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {lastUpdatedUser && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                            <UserAvatar user={lastUpdatedUser} />
                                            <span>{lastUpdatedUser.name}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Last updated by {lastUpdatedUser.name}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {isEditing && section.status !== 'locked' && (
                            <>
                                <AITooltip />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLock}
                                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                >
                                    {section.status === 'locked' ? 'Unlock' : 'Lock'}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                <CardDescription>Edit and collaborate on this section.</CardDescription>
            </CardHeader>
            <CardContent>
                {isEditing && section.status !== 'locked' ? (
                    <>
                        <Textarea
                            ref={textareaRef}
                            value={localContent}
                            onChange={handleContentChange}
                            className="w-full min-h-[100px] mb-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="Start writing here..."
                            disabled={section.status === 'locked'}
                        />
                        <Button
                            onClick={handleSave}
                            className="mb-4 bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-400"
                        >
                            Save Changes
                        </Button>
                    </>
                ) : (
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{section.content}</p>
                )}
                {isAILoading && (
                    <div className="flex items-center text-blue-500">
                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                        Analyzing with AI...
                    </div>
                )}
                {section.status === 'ai reviewed' && (
                    <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-md">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">AI Feedback:</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            This section has been reviewed by AI. Consider these suggestions:
                            <ul className="list-disc list-inside">
                                <li>Check for grammar and spelling errors.</li>
                                <li>Ensure the content is clear and concise.</li>
                                <li>Consider adding more details to support your claims.</li>
                            </ul>
                        </p>
                    </div>
                )}

                <div className="mt-6">
                    <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Comments ({section.comments.length})
                    </h5>
                    {section.comments.map(comment => (
                        <CommentComponent key={comment.id} comment={comment} />
                    ))}
                    {isEditing && section.status !== 'locked' && user && (
                        <div className="mt-4 flex gap-2">
                            <Textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            />
                            <Button
                                onClick={handleAddComment}
                                className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-blue-400"
                                disabled={!newComment.trim()}
                            >
                                Post
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const TableOfContents = ({
    sections,
    onSectionClick,
    user,
    isEditing
}: {
    sections: Section[];
    onSectionClick: (id: string) => void;
    user: User | undefined;
    isEditing: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(true);

    const hasUnresolvedComments = (section: Section) => {
        return section.comments.some(comment => comment.status !== 'resolved');
    };

    return (
        <Card className="w-full md:w-64 shadow-md transition-shadow hover:shadow-lg">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <List className="w-4 h-4" />
                        Table of Contents
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(!isOpen)}
                        className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen ? "rotate-180" : "rotate-0")} />
                    </Button>
                </div>
            </CardHeader>
            <AnimatePresence>
                {isOpen && (
                    <CardContent>
                        <ScrollArea className="h-72">
                            <div className="space-y-2">
                                {sections.map(section => (
                                    <div
                                        key={section.id}
                                        className={cn(
                                            "p-2 rounded-md cursor-pointer transition-colors flex items-center justify-between",
                                            "hover:bg-gray-100 dark:hover:bg-gray-800",
                                        )}
                                        onClick={() => onSectionClick(section.id)}
                                    >
                                        <span className="truncate">{section.title}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs", getStatusColor(section.status))}>
                                                ({section.status.charAt(0).toUpperCase() + section.status.slice(1)})
                                            </span>
                                            {hasUnresolvedComments(section) && (
                                                <MessageCircle className="w-4 h-4 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                )}
            </AnimatePresence>
        </Card>
    );
};

const ExportOptions = () => {
    const [isExportOpen, setIsExportOpen] = useState(false);

    return (
        <div className="relative inline-block">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            onClick={() => setIsExportOpen(!isExportOpen)}
                            className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            Export
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Export Document</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <AnimatePresence>
                {isExportOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10"
                    >
                        <div className="py-1">
                            <button
                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => {
                                    console.log('Exporting to Word...');
                                    setIsExportOpen(false);
                                }}
                            >
                                <File className="w-4 h-4 mr-2 inline-block" />
                                Word (.docx)
                            </button>
                            <button
                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => {
                                    console.log('Exporting to Google Docs...');
                                    setIsExportOpen(false);
                                }}
                            >
                                <File className="w-4 h-4 mr-2 inline-block" />
                                Google Docs
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ViewFullDocumentModal = ({ sections }: { sections: Section[] }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                variant="outline"
                onClick={() => setIsOpen(true)}
                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
                View Full Document
            </Button>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent className="max-w-2xl sm:max-w-3xl lg:max-w-4xl h-full sm:h-[80%]">
                    <SheetHeader>
                        <SheetTitle>Full Document View</SheetTitle>
                        <SheetDescription>
                            View the entire document as a single, stitched-together piece.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-6 overflow-y-auto h-[calc(100vh-12rem)]">
                        {sections.map(section => (
                            <div key={section.id}>
                                <h2 className="text-2xl font-semibold mb-2">{section.title}</h2>
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{section.content}</p>
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
};

interface CollaborativeDocumentReviewProps {
    documentId: string;
}

const CollaborativeDocumentReview = ({ documentId }: CollaborativeDocumentReviewProps) => {
    const [sections, setSections] = useState<Section[]>(mockSections);
    const [user, setUser] = useState<User | undefined>(mockUsers[0]);
    const [isEditing, setIsEditing] = useState(true);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    const handleSectionClick = (id: string) => {
        setActiveSectionId(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleUpdateSection = (id: string, updates: Partial<Section>) => {
        setSections(prevSections =>
            prevSections.map(section =>
                section.id === id ? { ...section, ...updates, lastUpdatedBy: user?.id, lastUpdatedByName: user?.name } : section
            )
        );
    };

    const handleLockSection = (id: string) => {
        setSections(prevSections =>
            prevSections.map(section =>
                section.id === id ? { ...section, status: section.status === 'locked' ? 'draft' : 'locked' } : section
            )
        );
    };

    const handleAddComment = (sectionId: string, comment: Omit<Comment, 'id'>) => {
        setSections(prevSections =>
            prevSections.map(section =>
                section.id === sectionId ? { ...section, comments: [...section.comments, { ...comment, id: `comment-${section.comments.length + 1}` }] } : section
            )
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <div className="container mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Collaborative Review
                    </h1>
                    <div className="flex gap-2">
                        <ViewFullDocumentModal sections={sections} />
                        <ExportOptions />
                        {isEditing && (
                            <Select onValueChange={(value) => {
                                const selectedUser = mockUsers.find((u) => u.id === value);
                                setUser(selectedUser);
                            }} value={user?.id}>
                                <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                    <SelectValue placeholder="Select User" />
                                </SelectTrigger>
                                <SelectContent>
                                    {mockUsers.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    <TableOfContents
                        sections={sections}
                        onSectionClick={handleSectionClick}
                        user={user}
                        isEditing={isEditing}
                    />
                    <div className="flex-1">
                        {sections.map(section => (
                            <section id={section.id} key={section.id}>
                                <SectionComponent
                                    section={section}
                                    onUpdateSection={handleUpdateSection}
                                    onLockSection={handleLockSection}
                                    onAddComment={handleAddComment}
                                    isEditing={isEditing}
                                    user={user}
                                />
                            </section>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollaborativeDocumentReview; 