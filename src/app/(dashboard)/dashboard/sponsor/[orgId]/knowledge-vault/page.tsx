'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import { BookOpen, Plus, File, Download, Trash2, CheckCircle, Search, Filter, Pencil, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from '@/components/ui/use-toast';

type DocumentCategory = 
    | 'sponsor_guidelines'
    | 'compliance_docs'
    | 'due_diligence'
    | 'templates'
    | 'procedures'
    | 'regulations'
    | 'training'
    | 'other';

interface ToneOfVoice {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  organization_id: string;
}

export default function SponsorKnowledgeVaultPage() {
    const { user } = useAuth();
    const supabase = getSupabaseClient();
    const [showUpload, setShowUpload] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('other');
    const [searchQuery, setSearchQuery] = useState('');
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("documents");
    
    // Tone of Voice states
    const [tones, setTones] = useState<ToneOfVoice[]>([]);
    const [loadingTones, setLoadingTones] = useState(false);
    const [showToneDialog, setShowToneDialog] = useState(false);
    const [editingTone, setEditingTone] = useState<ToneOfVoice | null>(null);
    const [newTone, setNewTone] = useState({ name: '', description: '', shortDescription: '' });
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // AI-assisted tone generation with real API
    const generateToneWithAI = async () => {
        if (!newTone.name.trim()) {
            toast({
                title: "Name Required",
                description: "Please enter a tone name first to generate a description",
                variant: "destructive"
            });
            return;
        }
        
        setIsGeneratingAI(true);
        
        try {
            // Call our API endpoint to generate a tone description with OpenAI
            const response = await fetch('/api/ai/generate-tone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newTone.name,
                    description: newTone.shortDescription
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate description');
            }
            
            const data = await response.json();
            
            setNewTone(prev => ({
                ...prev,
                description: data.description
            }));
            
            toast({
                title: "AI Description Generated",
                description: "We've created a tone description. Feel free to edit it to better match your needs.",
            });
        } catch (err: any) {
            console.error('Error generating AI tone:', err);
            toast({
                title: "Generation Failed",
                description: err.message || "Could not generate an AI description. Please try again or enter one manually.",
                variant: "destructive"
            });
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // Fetch documents
    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('knowledge_vault_documents')
                .select('*')
                .eq('organization_id', user?.organization_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (err) {
            console.error('Error fetching documents:', err);
        } finally {
            setLoading(false);
        }
    };
    
    // Fetch tones of voice
    const fetchTones = async () => {
        if (!user?.organization_id) return;
        
        try {
            setLoadingTones(true);
            const { data, error } = await supabase
                .from('tone_of_voice')
                .select('*')
                .eq('organization_id', user.organization_id)
                .order('name', { ascending: true });
                
            if (error) throw error;
            setTones(data || []);
        } catch (err) {
            console.error('Error fetching tones of voice:', err);
            toast({
                title: "Error",
                description: "Failed to load tones of voice",
                variant: "destructive"
            });
        } finally {
            setLoadingTones(false);
        }
    };
    
    // Save new tone of voice
    const saveTone = async () => {
        if (!user?.organization_id || !newTone.name.trim()) {
            toast({
                title: "Validation Error",
                description: "Tone name is required",
                variant: "destructive"
            });
            return;
        }
        
        try {
            const toneData = {
                name: newTone.name.trim(),
                description: newTone.description.trim(),
                user_id: user.id,
                organization_id: user.organization_id,
            };
            
            let response;
            
            if (editingTone) {
                // Update existing tone
                response = await supabase
                    .from('tone_of_voice')
                    .update(toneData)
                    .eq('id', editingTone.id);
            } else {
                // Insert new tone
                response = await supabase
                    .from('tone_of_voice')
                    .insert(toneData);
            }
            
            if (response.error) throw response.error;
            
            // Reset form and refresh list
            setNewTone({ name: '', description: '', shortDescription: '' });
            setEditingTone(null);
            setShowToneDialog(false);
            fetchTones();
            
            toast({
                title: editingTone ? "Tone Updated" : "Tone Created",
                description: editingTone 
                    ? `"${newTone.name}" has been updated` 
                    : `"${newTone.name}" has been added to your tones of voice`,
            });
        } catch (err: any) {
            console.error('Error saving tone of voice:', err);
            toast({
                title: "Error",
                description: err.message || "Failed to save tone of voice",
                variant: "destructive"
            });
        }
    };
    
    // Delete tone of voice
    const deleteTone = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete the tone "${name}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const { error } = await supabase
                .from('tone_of_voice')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            // Remove from list
            setTones(tones.filter(tone => tone.id !== id));
            
            toast({
                title: "Tone Deleted",
                description: `"${name}" has been removed from your tones of voice`,
            });
        } catch (err: any) {
            console.error('Error deleting tone of voice:', err);
            toast({
                title: "Error",
                description: err.message || "Failed to delete tone of voice",
                variant: "destructive"
            });
        }
    };
    
    // Edit tone of voice
    const handleEditTone = (tone: ToneOfVoice) => {
        setEditingTone(tone);
        setNewTone({
            name: tone.name,
            description: tone.description,
            shortDescription: tone.description.split('.').slice(0, 3).join('.') + '.'
        });
        setShowToneDialog(true);
    };

    useEffect(() => {
        if (user?.organization_id) {
            fetchDocuments();
            fetchTones();
        }
    }, [user]);

    return (
        <div className="p-4 md:p-6">
            {/* Responsive Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-bold">Knowledge Vault</h1>
            </div>
            
            <Tabs defaultValue="documents" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="tones-of-voice">Tones of Voice</TabsTrigger>
                </TabsList>
                
                {/* Documents Tab */}
                <TabsContent value="documents">
                    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                type="text"
                                placeholder="Search documents..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 h-9 text-sm w-full"
                            />
                        </div>
                        <Button
                            onClick={() => setShowUpload(!showUpload)}
                            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm h-9 w-full sm:w-auto"
                        >
                            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Add Document
                        </Button>
                    </div>

                    {showUpload && user?.organization_id && (
                        <div className="mb-6 p-4 bg-white rounded-lg shadow">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Document Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="sponsor_guidelines">Sponsor Guidelines</option>
                                    <option value="compliance_docs">Compliance Documents</option>
                                    <option value="due_diligence">Due Diligence Templates</option>
                                    <option value="templates">Document Templates</option>
                                    <option value="procedures">Procedures</option>
                                    <option value="regulations">Regulations</option>
                                    <option value="training">Training Materials</option>
                                    <option value="other">Other Documents</option>
                                </select>
                            </div>
                            <DocumentUpload
                                category={selectedCategory}
                                organizationId={user.organization_id}
                                onUploadComplete={() => {
                                    setShowUpload(false);
                                    fetchDocuments();
                                }}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            <div className="col-span-full flex justify-center items-center py-12">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-2 text-gray-500">Loading documents...</p>
                                </div>
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                                <p className="mt-1 text-sm text-gray-500">Get started by adding some documents.</p>
                            </div>
                        ) : (
                            documents
                                .filter(doc => 
                                    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map(doc => (
                                    <div key={doc.id} className="bg-white p-4 rounded-lg shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center">
                                                <File className="h-6 w-6 text-blue-500 mr-2" />
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-900">{doc.name}</h3>
                                                    <p className="text-sm text-gray-500">{doc.category}</p>
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => window.open(doc.url, '_blank')}
                                                    className="text-gray-400 hover:text-gray-500"
                                                >
                                                    <Download className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        // Add delete functionality
                                                    }}
                                                    className="text-gray-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </TabsContent>
                
                {/* Tones of Voice Tab */}
                <TabsContent value="tones-of-voice">
                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                            <div className="flex-1 max-w-full sm:max-w-xl">
                                <p className="text-sm text-gray-600">
                                    Create custom tones of voice that can be selected when creating social media posts. 
                                    Each tone helps AI generate content with a specific personality and writing style.
                                </p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    onClick={() => {
                                        setEditingTone(null);
                                        setNewTone({ name: '', description: '', shortDescription: '' });
                                        setShowToneDialog(true);
                                    }}
                                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm h-10 w-full sm:w-auto"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Tone
                                </Button>
                            </div>
                        </div>
                        
                        {/* Info card */}
                        <Card className="mb-8 bg-blue-50 border-blue-200">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-start">
                                    <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-blue-900 mb-2">Tone of Voice Tips</h4>
                                        <p className="text-sm text-blue-700 leading-relaxed">
                                            Describe your tone in detail for best results. For example: "Professional but warm, 
                                            uses simple language and avoids jargon. Friendly and approachable while maintaining 
                                            industry expertise. Uses short sentences and occasional questions to engage readers."
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tones of Voice List */}
                        <div className="space-y-4 sm:space-y-5">
                            {loadingTones ? (
                                <div className="flex justify-center items-center py-16">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-4 text-gray-500 font-medium">Loading tones of voice...</p>
                                    </div>
                                </div>
                            ) : tones.length === 0 ? (
                                <Card className="text-center py-16 border-dashed">
                                    <CardContent className="pt-6">
                                        <div className="mx-auto rounded-full w-16 h-16 flex items-center justify-center bg-gray-100">
                                            <AlertTriangle className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="mt-6 text-lg font-medium text-gray-900">No tones of voice</h3>
                                        <p className="mt-2 text-base text-gray-500 max-w-md mx-auto">
                                            Get started by adding your first tone of voice to enhance your social media content.
                                        </p>
                                        <Button
                                            onClick={() => {
                                                setEditingTone(null);
                                                setNewTone({ name: '', description: '', shortDescription: '' });
                                                setShowToneDialog(true);
                                            }}
                                            className="mt-6 bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Your First Tone
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                                    {tones.map(tone => (
                                        <Card key={tone.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-2 p-4 sm:p-5">
                                                <CardTitle className="text-lg">{tone.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pb-2 px-4 sm:px-5">
                                                {tone.description ? (
                                                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">{tone.description}</p>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">No description provided</p>
                                                )}
                                            </CardContent>
                                            <CardFooter className="flex justify-end gap-2 p-4 sm:p-5 pt-2 border-t">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="h-9"
                                                    onClick={() => handleEditTone(tone)}
                                                >
                                                    <Pencil className="h-4 w-4 mr-1.5" />
                                                    Edit
                                                </Button>
                                                <Button 
                                                    variant="destructive" 
                                                    size="sm"
                                                    className="h-9"
                                                    onClick={() => deleteTone(tone.id, tone.name)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1.5" />
                                                    Delete
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            
            {/* Tone of Voice Dialog */}
            <Dialog open={showToneDialog} onOpenChange={setShowToneDialog}>
                <DialogContent className="sm:max-w-md max-w-[95%] w-full rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{editingTone ? 'Edit Tone of Voice' : 'Add Tone of Voice'}</DialogTitle>
                        <DialogDescription className="text-gray-600 pt-1.5">
                            {editingTone 
                                ? 'Modify this tone of voice for your social media posts.' 
                                : 'Create a new tone of voice for your social media posts.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2.5">
                            <Label htmlFor="name" className="text-base">Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                placeholder="e.g., Professional, Casual, Energetic"
                                value={newTone.name}
                                onChange={(e) => setNewTone({...newTone, name: e.target.value})}
                                className="h-10"
                            />
                        </div>
                        
                        {!editingTone && (
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="shortDescription" className="text-base">
                                        Short Description for AI
                                        <span className="ml-1.5 text-xs text-gray-500 font-normal">(optional)</span>
                                    </Label>
                                </div>
                                <Input
                                    id="shortDescription"
                                    placeholder="e.g., Professional but friendly, for financial content"
                                    value={newTone.shortDescription}
                                    onChange={(e) => setNewTone({...newTone, shortDescription: e.target.value})}
                                    className="h-10"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This helps guide the AI in generating a more accurate tone description
                                </p>
                            </div>
                        )}
                        
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="description" className="flex items-center gap-1 text-base">
                                    Full Description
                                    <span className="text-xs text-gray-500 font-normal">(recommended)</span>
                                </Label>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={generateToneWithAI}
                                    disabled={isGeneratingAI || !newTone.name.trim()}
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {isGeneratingAI ? 'Generating...' : 'Generate with AI'}
                                </Button>
                            </div>
                            <Textarea
                                id="description"
                                placeholder="Describe the tone in detail for best results..."
                                value={newTone.description}
                                onChange={(e) => setNewTone({...newTone, description: e.target.value})}
                                rows={5}
                                className="min-h-[120px] text-base"
                            />
                            {isGeneratingAI && (
                                <div className="flex items-center justify-center py-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                                    <span className="text-sm text-gray-600">AI is generating your tone description...</span>
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1.5">
                                Include style, formality level, and specific language patterns
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowToneDialog(false)}
                            className="w-full sm:w-auto h-10"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            onClick={saveTone} 
                            className="w-full sm:w-auto h-10 bg-blue-600 hover:bg-blue-700"
                        >
                            {editingTone ? 'Save Changes' : 'Create Tone'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 