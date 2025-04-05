# Generate Document Page Documentation

## Overview
The Generate Document page is a complex component that allows users to generate and manage listing documents section by section. It follows the protected route pattern and relies on middleware for authentication.

## Key Features
1. Automatic content loading when selecting sections
2. Section-based document generation
3. Real-time content fetching and display
4. Progress tracking
5. Interactive content editing with database synchronization
6. Detailed debug logging
7. Individual field and batch update support

## Component Structure

### State Management
```typescript
// Core Selection States
const [selectedAssistant, setSelectedAssistant] = useState('Equity Listing Direct List');
const [selectedListing, setSelectedListing] = useState('');
const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState('');
const [selectedSection, setSelectedSection] = useState('');

// Content States
const [sectionTitle, setSectionTitle] = useState<string>('');
const [sectionFields, setSectionFields] = useState<string[]>([]);
const [sectionContent, setSectionContent] = useState<ListingDocumentContent | null>(null);

// Section States
const [sections, setSections] = useState<Section[]>([...]);
const [currentSectionTitles, setCurrentSectionTitles] = useState<Section[]>([]);
```

### Content Management Flow
1. User selects a listing
2. User selects a section
3. System automatically:
   - Gets section fields using `getSectionFields`
   - Fetches existing content from database
   - Maps content to UI fields
   - Updates section status
4. User can:
   - Edit content in text areas
   - Save individual fields
   - Lock/unlock sections
   - Regenerate content
   - View update status messages

### Database Update Implementation
```typescript
const handleUpdateSection = async (field: string) => {
    if (!selectedListing || !selectedSection || !sectionContent) {
        console.log('Missing required data for update');
        return;
    }

    try {
        // Create update object with only the field being updated
        const updateData = {
            [field]: sectionContent[field],
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('listingdocumentdirectlisting')
            .update(updateData)
            .eq('instrumentid', selectedListing)
            .select();

        if (error) throw error;

        // Update UI state and show success message
        setSections(prev => prev.map(section => 
            section.id === selectedSection
                ? { ...section, status: 'completed' }
                : section
        ));

        setMessages(prev => [...prev, {
            type: 'assistant',
            content: `Successfully updated ${getFieldLabel(field)}`
        }]);
    } catch (error) {
        console.error('Error updating section:', error);
        // Show error message to user
    }
};

// Batch update implementation for updating multiple fields
const handleBatchUpdate = async () => {
    if (!selectedListing || !selectedSection || !sectionContent) return;

    try {
        const fields = getSectionFields(selectedSection);
        const updateData = {
            ...fields.reduce((acc, field) => ({
                ...acc,
                [field]: sectionContent[field]
            }), {}),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('listingdocumentdirectlisting')
            .update(updateData)
            .eq('instrumentid', selectedListing)
            .select();

        if (error) throw error;

        // Update UI state and show success message
    } catch (error) {
        console.error('Error in batch update:', error);
        // Show error message to user
    }
};
```

### Automatic Content Loading Implementation
```typescript
const handleSectionSelect = useCallback(async (sectionNumber: string) => {
    // Set the selected section immediately
    setSelectedSection(sectionNumber);
    
    // Set the section title
    const sectionName = sections.find(s => s.id === sectionNumber)?.title;
    setSectionTitle(sectionName || `Section ${sectionNumber}`);

    // Get the fields for this section
    const fields = getSectionFields(sectionNumber);
    setSectionFields(fields);

    // Initialize empty content
    const initialContent: ListingDocumentContent = {};
    fields.forEach(field => {
        initialContent[field] = '';
    });
    setSectionContent(initialContent);

    // Automatically fetch content if listing is selected
    if (selectedListing) {
        try {
            const { data, error } = await supabase
                .from('listingdocumentdirectlisting')
                .select(fields.join(','))
                .eq('instrumentid', selectedListing)
                .single();

            if (data) {
                // Map database fields to content
                const typedData = data as Record<string, string | null>;
                const newContent: ListingDocumentContent = {};
                
                fields.forEach(field => {
                    newContent[field] = typedData[field] || '';
                });

                setSectionContent(newContent);
                
                // Update section status
                setSections(prev => prev.map(section => 
                    section.id === sectionNumber
                        ? { ...section, status: 'completed' }
                        : section
                ));
            }
        } catch (err) {
            console.error('Failed to fetch content:', err);
        }
    }
}, [selectedListing, sections, supabase]);
```

### Content Display Implementation
```typescript
const renderSectionContent = useCallback(() => {
    if (!selectedSection) return <div>Please select a section</div>;

    const fields = getSectionFields(selectedSection);

    if (!sectionContent) {
        return <div>Loading content...</div>;
    }

    return (
        <div className="space-y-6">
            <h3>{sectionTitle}</h3>
            <div className="space-y-4">
                {fields.map((field) => {
                    const isLocked = sections.find(s => s.id === selectedSection)?.isLocked;
                    const fieldContent = sectionContent[field] || '';
                    const fieldLabel = getFieldLabel(field);
                    
                    return (
                        <div key={field}>
                            <label>{fieldLabel}</label>
                            <textarea
                                value={fieldContent}
                                onChange={(e) => {
                                    setSectionContent(prev => ({
                                        ...prev,
                                        [field]: e.target.value
                                    }));
                                }}
                                disabled={isLocked}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}, [selectedSection, sectionTitle, sectionContent, sections]);
```

## Best Practices

### Content Management
1. Automatic content loading on section selection
2. Type-safe content handling with TypeScript
3. Proper state updates to trigger re-renders
4. Memoized callbacks for performance
5. Detailed debug logging
6. Individual field updates for better performance
7. Batch updates for efficiency
8. Optimistic UI updates with error handling

### Error Handling
```typescript
try {
    const { data, error } = await supabase.from('table').update(updateData).eq('id', id);
    if (error) {
        console.error('Update error:', error);
        // Revert optimistic update if needed
        return;
    }
    // Show success message
} catch (err) {
    console.error('Error:', err);
    // Show error message to user
}
```

### Debug System
The component includes comprehensive debug logging:
```typescript
console.log('=== UPDATE SECTION DEBUG START ===');
console.log('Updating field:', field);
console.log('Current content:', sectionContent[field]);
console.log('Update data:', updateData);
console.log('Update successful:', data);
```

## Future Improvements
1. Batch content updates with progress tracking
2. Offline support with sync queue
3. Real-time collaboration
4. Enhanced error recovery with retry mechanism
5. Content validation before updates
6. Auto-save functionality
7. Manual content refresh option
8. Conflict resolution for concurrent updates
9. Update history tracking

## Related Components
- ListingsClient.tsx
- RouteGuard
- AuthProvider
- MessageDisplay.tsx (for update notifications) 