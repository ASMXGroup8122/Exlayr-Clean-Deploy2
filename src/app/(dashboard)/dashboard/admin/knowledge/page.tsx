'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Search,
    Upload,
    FolderOpen,
    FileText,
    Book,
    Briefcase,
    Scale,
    Building2,
    Tags,
    Plus,
    MoreVertical,
    ChevronDown,
    FileJson,
    File,
    FileSpreadsheet
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Mock data for documents
const documents = [
    {
        id: '1',
        title: 'Exchange Listing Requirements 2024',
        type: 'pdf',
        category: 'exchange',
        tags: ['listing', 'requirements', 'policy'],
        lastModified: '2024-03-15',
        size: '2.4 MB'
    },
    {
        id: '2',
        title: 'Compliance Guidelines Q1 2024',
        type: 'doc',
        category: 'compliance',
        tags: ['compliance', 'guidelines'],
        lastModified: '2024-03-10',
        size: '1.8 MB'
    },
    {
        id: '3',
        title: 'Market Data Integration Guide',
        type: 'pdf',
        category: 'technical',
        tags: ['integration', 'api', 'market-data'],
        lastModified: '2024-03-08',
        size: '3.2 MB'
    },
    // Add more mock documents...
];

// Document categories with icons
const categories = [
    { id: 'all', name: 'All Documents', icon: FileText },
    { id: 'exchange', name: 'Exchange Rules', icon: Building2 },
    { id: 'compliance', name: 'Compliance', icon: Scale },
    { id: 'technical', name: 'Technical Docs', icon: FileJson },
    { id: 'business', name: 'Business', icon: Briefcase },
    { id: 'knowledge', name: 'Knowledge Base', icon: Book },
];

function DocumentCard({ doc }: { doc: typeof documents[0] }) {
    const getIcon = (type: string) => {
        switch (type) {
            case 'pdf':
                return <File className="w-5 h-5 text-red-500" />;
            case 'doc':
                return <FileText className="w-5 h-5 text-blue-500" />;
            case 'spreadsheet':
                return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
            default:
                return <FileText className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3 min-w-0">
                    {getIcon(doc.type)}
                    <div className="min-w-0">
                        <h3 className="font-medium truncate pr-8">{doc.title}</h3>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-500">
                                {doc.lastModified}
                            </span>
                            <span className="text-xs text-gray-500">
                                {doc.size}
                            </span>
                            <div className="flex gap-1">
                                {doc.tags.slice(0, 2).map(tag => (
                                    <span 
                                        key={tag}
                                        className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                                    >
                                        {tag}
                                    </span>
                                ))}
                                {doc.tags.length > 2 && (
                                    <span className="text-xs text-gray-500">
                                        +{doc.tags.length - 2}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                            Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            Share
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            Edit Tags
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Card>
    );
}

function CategoryButton({ category, isSelected, onClick }: { 
    category: typeof categories[0],
    isSelected: boolean,
    onClick: () => void
}) {
    const Icon = category.icon;
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-colors",
                isSelected ? "bg-gray-100" : "hover:bg-gray-50"
            )}
        >
            <Icon className="w-5 h-5" />
            <span className="text-sm font-medium">{category.name}</span>
        </button>
    );
}

export default function KnowledgeBasePage() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredDocs = documents.filter(doc => 
        (selectedCategory === 'all' || doc.category === selectedCategory) &&
        (doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    return (
        <div className="h-[calc(100vh-4rem)] pt-6">
            <div className="container h-full">
                <div className="flex h-full gap-6">
                    {/* Left Sidebar */}
                    <div className="w-64 flex-shrink-0">
                        <div className="mb-6">
                            <Button className="w-full" size="lg">
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Document
                            </Button>
                        </div>
                        <div className="space-y-1">
                            {categories.map(category => (
                                <CategoryButton
                                    key={category.id}
                                    category={category}
                                    isSelected={selectedCategory === category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col">
                        <div className="mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex-1 relative">
                                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <Input
                                        placeholder="Search documents..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9"
                                    />
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            Sort By
                                            <ChevronDown className="w-4 h-4 ml-2" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            Date Modified
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            Name
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            Size
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            Type
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="outline">
                                    <Tags className="w-4 h-4 mr-2" />
                                    Filter
                                </Button>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="grid grid-cols-1 gap-2 pb-6">
                                {filteredDocs.map(doc => (
                                    <DocumentCard key={doc.id} doc={doc} />
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </div>
        </div>
    );
} 