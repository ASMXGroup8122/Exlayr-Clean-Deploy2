# Pinecone Integration Quick Reference

## Setup

### Environment Variables

Add to your `.env` file:

```
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX=your-pinecone-index-name
OPENAI_API_KEY=your-openai-api-key
```

### Pinecone Dashboard Setup

1. Create an account at [Pinecone](https://www.pinecone.io/)
2. Create a new index with the following settings:
   - Dimensions: 1536 (for OpenAI embeddings)
   - Metric: Cosine
   - Name: Match your `PINECONE_INDEX` environment variable

## API Endpoints

### Initialize Pinecone

```bash
# Initialize Pinecone with listing rules
curl -X POST http://localhost:3000/api/ai-assistant/initialize-pinecone
```

### Get Relevant Rules

```bash
# Get relevant rules for a document section
curl -X POST http://localhost:3000/api/ai-assistant/relevant-rules \
  -H "Content-Type: application/json" \
  -d '{"sectionContent": "Financial reporting requirements for listing"}'
```

### Test Pinecone Connection

```bash
# Test Pinecone connection
curl http://localhost:3000/api/ai-assistant/test-pinecone
```

### Check Pinecone Status

```bash
# Check Pinecone status
curl http://localhost:3000/api/ai-assistant/pinecone-status
```

## Key Functions

### Find Relevant Rules

```typescript
import { findRelevantRules } from '@/lib/ai/vectorSearch';

// Find relevant rules for a document section
const rules = await findRelevantRules('Financial reporting requirements for listing');
```

### Initialize Pinecone

```typescript
import { initializePineconeWithRules } from '@/lib/ai/vectorSearch';

// Initialize Pinecone with listing rules
await initializePineconeWithRules();
```

### Generate Embedding

```typescript
import { generateEmbedding } from '@/lib/ai/vectorSearch';

// Generate embedding for text
const embedding = await generateEmbedding('Financial reporting requirements for listing');
```

## Adding New Rules

Add new rules to the `mockListingRules` array in `src/lib/ai/vectorSearch.ts`:

```typescript
export const mockListingRules: ListingRule[] = [
  // Existing rules...
  {
    id: 'rule-16',
    title: 'New Rule Title',
    description: 'Detailed description of the new rule...',
    category: 'category',
    severity: 'high' | 'medium' | 'low',
  },
  // More new rules...
];
```

Then initialize Pinecone with the updated rules:

```bash
curl -X POST http://localhost:3000/api/ai-assistant/initialize-pinecone
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Check that `PINECONE_API_KEY` and `PINECONE_INDEX` are set in the `.env` file
   - Restart the server after updating environment variables

2. **Pinecone Index Does Not Exist**
   - Create the index in the Pinecone dashboard
   - Ensure the index name matches the `PINECONE_INDEX` environment variable

3. **OpenAI API Key Issues**
   - Check that `OPENAI_API_KEY` is set in the `.env` file
   - Verify that the OpenAI API key has access to the embedding model

### Debugging

Check the console logs for detailed information about:

1. Environment variables
2. Pinecone client initialization
3. Vector search process
4. Metadata structure
5. Initialization process

## Testing

### Test Pinecone Connection

```typescript
// Test Pinecone connection
const response = await fetch('/api/ai-assistant/test-pinecone');
const data = await response.json();
console.log(data); // { success: true, message: 'Pinecone connection successful' }
```

### Test Relevant Rules

```typescript
// Test getting relevant rules
const response = await fetch('/api/ai-assistant/relevant-rules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sectionContent: 'Financial reporting requirements for listing' }),
});
const data = await response.json();
console.log(data); // Array of relevant rules
```

## UI Integration

### Initialize Button

Add a button to initialize Pinecone:

```tsx
<Button
  onClick={async () => {
    const response = await fetch('/api/ai-assistant/initialize-pinecone', {
      method: 'POST',
    });
    const data = await response.json();
    console.log(data);
  }}
>
  Initialize Pinecone
</Button>
```

### Display Relevant Rules

Display relevant rules in your UI:

```tsx
const [relevantRules, setRelevantRules] = useState([]);

// Fetch relevant rules
useEffect(() => {
  async function fetchRelevantRules() {
    const response = await fetch('/api/ai-assistant/relevant-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionContent }),
    });
    const data = await response.json();
    setRelevantRules(data);
  }
  
  fetchRelevantRules();
}, [sectionContent]);

// Display relevant rules
return (
  <div>
    <h2>Relevant Rules</h2>
    {relevantRules.map(rule => (
      <div key={rule.id}>
        <h3>{rule.title}</h3>
        <p>{rule.description}</p>
        <p>Category: {rule.category}</p>
        <p>Severity: {rule.severity}</p>
      </div>
    ))}
  </div>
);
```

## Resources

- [Pinecone Documentation](https://docs.pinecone.io/)
- [OpenAI Embeddings Documentation](https://platform.openai.com/docs/guides/embeddings)
- [Next.js API Routes Documentation](https://nextjs.org/docs/api-routes/introduction)
- [Exlayr.AI Documentation](docs/ai-assistant-pinecone-integration.md) 