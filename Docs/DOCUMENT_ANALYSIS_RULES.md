# Document Analysis System: Critical Rules & Requirements

## 1. Database Schema Rules
```sql
-- CRITICAL: These are the ONLY valid columns for document_interactions
id: uuid (NOT NULL)
document_id: uuid (NOT NULL)
section_id: text (NOT NULL)
review_cycle_id: uuid (NOT NULL)
type: enum (NOT NULL)  -- This is USER-DEFINED, must use exact values
content: text (NOT NULL)
version: integer (NOT NULL)
created_at: timestamptz (NOT NULL)
created_by: uuid (NOT NULL)  -- ⚠️ THIS IS THE CORRECT FIELD NAME, NOT submitted_by
metadata: jsonb (NULL allowed)

-- CRITICAL: Document Review Cycles Schema
document_review_cycles {
  id: uuid (NOT NULL)
  document_id: uuid (NOT NULL)
  cycle_number: integer (NOT NULL)
  submitted_by: uuid (NULL)  -- ⚠️ This is the correct field name, NOT created_by
  reviewed_by: uuid (NULL)
  status: text (NOT NULL)
  started_at: timestamptz (NULL)
  completed_at: timestamptz (NULL)
  ai_analysis_summary: jsonb (NULL)
}
```

## 2. CRITICAL FAILURE POINTS

### 2.1 Column Name Violations ❌
- NEVER use `submitted_by` - it does not exist
- ALWAYS use `created_by` - this is the correct field
- VIOLATION of this rule causes PGRST204 errors

### 2.2 Required Fields
ALL these fields MUST be provided in EVERY interaction:
```typescript
{
  document_id: uuid,    // REQUIRED
  section_id: string,   // REQUIRED
  review_cycle_id: uuid,// REQUIRED
  type: InteractionType,// REQUIRED - must be valid enum
  content: string,      // REQUIRED
  version: number,      // REQUIRED
  created_by: uuid      // REQUIRED - NOT submitted_by
}
```

### 2.3 Real-time Subscription Rules
1. Subscribe ONLY to relevant channels
2. Channel format: `document_interactions:document_id=eq.{documentId}`
3. NEVER subscribe to individual sections - always document level
4. ALWAYS unsubscribe on component unmount

## 3. State Management Requirements

### 3.1 Interaction Creation
```typescript
// CORRECT WAY:
const createInteraction = async () => {
  const { data, error } = await supabase
    .from('document_interactions')
    .insert({
      document_id: documentId,
      section_id: sectionId,
      review_cycle_id: cycleId,
      type: 'COMMENT',  // Must be valid enum value
      content: content,
      version: 1,
      created_by: userId  // ✅ CORRECT
    });
};

// WRONG WAY - Will ALWAYS Fail:
submitted_by: userId     // ❌ WRONG
```

### 3.2 State Updates
1. ALWAYS update through context
2. NEVER maintain duplicate state
3. ALWAYS use the document-level subscription
4. NEVER create section-level subscriptions

## 4. Error Prevention Checklist

Before ANY interaction with document_interactions:
- [ ] Using `created_by`, not `submitted_by`
- [ ] All required fields are present
- [ ] Valid interaction type from enum
- [ ] Document-level subscription only
- [ ] Proper error handling in place
- [ ] Context state management used

## 5. Testing Requirements

### 5.1 Required Test Cases
1. Creation with all required fields
2. Creation with invalid type
3. Creation with missing fields
4. Real-time update reception
5. State management sync
6. Error handling paths

### 5.2 Deployment Checks
- [ ] Schema validation
- [ ] Column name verification
- [ ] Enum type validation
- [ ] Subscription channel format
- [ ] Error handling coverage

## 6. Common Errors and Solutions

| Error Code | Cause | Solution |
|------------|-------|----------|
| PGRST204 | Using `submitted_by` | Change to `created_by` |
| 400 Bad Request | Missing required field | Check all required fields |
| Schema Cache | Column mismatch | Verify column names against schema |

## 7. ABSOLUTE REQUIREMENTS

1. NEVER deploy code using `submitted_by`
2. ALWAYS verify schema before changes
3. ALWAYS use document-level subscriptions
4. NEVER skip error handling
5. ALWAYS use context for state
6. ZERO TOLERANCE for column name mistakes

## 8. Change Management

Before ANY code changes:
1. Verify database schema
2. Check enum values
3. Validate column names
4. Test all error paths
5. Verify subscription patterns

## 9. FAILURE LOG & LESSONS LEARNED

### 2024-03-26 - Initial Critical Failures
1. `submitted_by` vs `created_by` column mismatch
   - Impact: System-wide 400 errors
   - Root Cause: Code/schema mismatch
   - Prevention: ALWAYS query schema first

2. Schema Cache Red Herring
   - Impact: Time wasted on wrong problem
   - Root Cause: Trusted error message without verification
   - Prevention: ALWAYS verify schema before trusting cache errors

3. State Management Fragmentation
   - Impact: Inconsistent UI updates
   - Root Cause: Multiple subscription points
   - Prevention: ALWAYS use document-level subscriptions only

4. Document Review Cycles Schema Mismatch
   - Impact: Review cycle creation fails
   - Root Cause: Code uses `created_by` but schema uses `submitted_by`
   - Prevention: Add schema validation to rules document

5. Version Field Missing
   - Impact: Interaction creation fails with 23502 error
   - Root Cause: Not providing required version field in interactions
   - Prevention: Add version field validation to pre-commit checks
   - Required Fix: ALWAYS include version field (integer, NOT NULL) in ALL interaction inserts

6. Analysis Interruption Handling
   - Impact: Orphaned review cycles and inconsistent UI state
   - Root Cause: No cleanup on manual interruption
   - Prevention: Implement proper cleanup
   - Required Fix:
     1. Mark interrupted review cycles as 'cancelled'
     2. Clear all pending operations
     3. Reset UI state properly
     4. Add interruption status to review_cycles schema

7. Review Cycle Number Uniqueness
   - Impact: Review cycle creation fails with error 23505
   - Root Cause: Attempting to create cycles with duplicate numbers
   - Prevention: ALWAYS fetch max cycle number before creating new cycle
   - Required Fix:
     ```typescript
     // CORRECT WAY:
     const createReviewCycle = async () => {
       // First get the max cycle number
       const { data: maxCycleData } = await supabase
         .from('document_review_cycles')
         .select('cycle_number')
         .eq('document_id', documentId)
         .order('cycle_number', { ascending: false })
         .limit(1)
         .single();

       const nextCycleNumber = (maxCycleData?.cycle_number || 0) + 1;

       // Then create the new cycle with incremented number
       const { data, error } = await supabase
         .from('document_review_cycles')
         .insert({
           document_id: documentId,
           cycle_number: nextCycleNumber,  // ✅ Use incremented number
           status: 'in_progress',
           submitted_by: userId
         });
     };

     // WRONG WAY - Will fail with duplicate key error:
     cycle_number: 1  // ❌ Hard-coded number
     ```

8. UI Update Failure
   - Impact: Users can't see analysis progress
   - Root Cause: 
     1. Animation CSS not properly applied
     2. State updates not triggering re-renders
     3. Real-time subscription not working
   - Prevention: Add UI update verification checklist
   - Required Fix:
     ```typescript
     // 1. Animation must use proper Tailwind classes
     className={cn(
       "w-2 h-2 rounded-full",
       {
         "animate-pulse": isAnalyzing,  // Use Tailwind's built-in animation
         "bg-blue-500": isAnalyzing,
         "duration-300": true  // Ensure transitions are visible
       }
     )}

     // 2. State updates must be atomic and trigger re-renders
     const [progress, setProgress] = useState(0);
     useEffect(() => {
       if (progress > 0) {
         // Force re-render on progress change
         dispatch({ type: 'SET_PROGRESS', payload: progress });
       }
     }, [progress]);

     // 3. Real-time subscriptions must be at document level
     useEffect(() => {
       const channel = supabase
         .channel(`document_interactions:document_id=eq.${documentId}`)
         .on('INSERT', (payload) => {
           // Force UI update on new interaction
           dispatch({ type: 'ADD_INTERACTION', payload });
         })
         .subscribe();

       return () => channel.unsubscribe();
     }, [documentId]);
     ```

### UI Update Checklist
1. Animation Requirements:
   - [ ] Use Tailwind's built-in animations
   - [ ] Verify animation classes are applied
   - [ ] Test animation visibility in all states

2. State Management Requirements:
   - [ ] All state updates must be atomic
   - [ ] State changes must trigger re-renders
   - [ ] Use React DevTools to verify state updates

3. Real-time Update Requirements:
   - [ ] Subscribe at document level
   - [ ] Verify subscription channel is active
   - [ ] Test subscription with network tab open

### Common Error Codes
| Code | Meaning | Prevention |
|------|----------|------------|
| 23502 | NOT NULL violation | Check schema requirements before insert |
| PGRST204 | Column not found | Verify column names against schema |
| ERR_CONNECTION_RESET | Network timeout | Implement proper retry logic and timeouts |
| ERR_CONNECTION_RESET | Manual interruption | Implement proper cleanup handlers |
| 55P04 | Unsafe enum value use | Must commit enum changes in isolation |

9. Enum Type Changes
   - Impact: Cannot modify enum and use it in same transaction
   - Root Cause: PostgreSQL requires enum changes to be committed before use
   - Prevention: Split enum changes into separate migrations
   - Required Fix:
     ```sql
     -- 1. First migration: ONLY add enum value
     ALTER TYPE interaction_type ADD VALUE 'ai_suggestion';

     -- 2. Second migration: Add constraints/indexes
     -- Run these AFTER first migration is committed
     ALTER TABLE document_interactions 
     ADD CONSTRAINT ai_suggestion_metadata_check 
     CHECK (type != 'ai_suggestion' OR (type = 'ai_suggestion' AND metadata ? 'score'));

     CREATE INDEX IF NOT EXISTS idx_ai_suggestions 
     ON document_interactions (document_id, type) 
     WHERE type = 'ai_suggestion';
     ```

---

**IMPORTANT**: This document MUST be referenced before any changes to the document analysis system. Any violations WILL cause system failures. Update this document with new failures and lessons learned as they are discovered. 