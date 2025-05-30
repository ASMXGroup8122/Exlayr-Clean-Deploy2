import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ListingRule } from '@/lib/ai/vectorSearch';

interface RuleRegenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: ListingRule | null;
  knowledgeBase: string;
  onRegenerate: (regeneratedRule: Partial<ListingRule>) => Promise<void>;
}

export default function RuleRegenerationModal({
  isOpen,
  onClose,
  rule,
  knowledgeBase,
  onRegenerate
}: RuleRegenerationModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState<'high' | 'medium' | 'low'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset form when rule changes
  useState(() => {
    if (rule) {
      setTitle(rule.title);
      setDescription(rule.description);
      setCategory(rule.category);
      setSeverity(rule.severity);
    }
  });
  
  const handleSubmit = async () => {
    if (!rule) return;
    
    setIsSubmitting(true);
    
    try {
      await onRegenerate({
        id: rule.id,
        title,
        description,
        category,
        severity
      });
      
      onClose();
    } catch (error) {
      console.error('Error regenerating rule:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Regenerate Listing Rule</DialogTitle>
          <DialogDescription>
            Improve this rule to make it more accurate or relevant. Your changes will be saved to the knowledge base.
          </DialogDescription>
        </DialogHeader>
        
        {rule && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Title</label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Rule title"
                maxLength={50}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rule description"
                className="min-h-[100px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="governance">Governance</SelectItem>
                    <SelectItem value="disclosure">Disclosure</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="severity" className="text-sm font-medium">Severity</label>
                <Select 
                  value={severity} 
                  onValueChange={(value) => setSeverity(value as 'high' | 'medium' | 'low')}
                >
                  <SelectTrigger id="severity">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Knowledge Base: {knowledgeBase}</p>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !title || !description || !category}
          >
            {isSubmitting ? 'Saving...' : 'Save Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
