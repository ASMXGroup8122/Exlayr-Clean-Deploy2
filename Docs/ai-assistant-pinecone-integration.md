# AI Assistant Pinecone Integration

## Overview

The AI Assistant uses Pinecone vector database to store and retrieve relevant listing rules for document sections. This document explains how the Pinecone integration works, how it was implemented, and how to maintain it.

## Architecture

The Pinecone integration consists of the following components:

1. **Configuration**: Environment variables and client initialization in `src/lib/ai/config.ts`
2. **Vector Search**: Functions for finding relevant rules in `src/lib/ai/vectorSearch.ts`
3. **API Endpoints**: Next.js API routes for initializing Pinecone and retrieving relevant rules
4. **UI Component**: React component for displaying relevant rules in `src/components/ai-assistant/ListingAIAssistant.tsx`

## Environment Variables

The following environment variables are required for Pinecone integration:

```
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX=your-pinecone-index-name
```

These variables should be set in the `.env` file at the root of the project.

## Initialization Process

The Pinecone index is initialized with listing rules using the `initializePineconeWithRules` function in `src/lib/ai/vectorSearch.ts`. This function:

1. Checks if the environment variables are set
2. Verifies that the Pinecone index exists
3. Deletes any existing vectors with the same IDs
4. Generates embeddings for each rule using OpenAI
5. Upserts the embeddings and metadata to Pinecone
6. Verifies the initialization by querying for a rule

The initialization can be triggered by calling the `/api/ai-assistant/initialize-pinecone` API endpoint.

## Vector Search Process

The `findRelevantRules` function in `src/lib/ai/vectorSearch.ts` is used to find relevant rules for a document section. This function:

1. Checks if running in a browser environment (falls back to mock rules if true)
2. Generates an embedding for the section content using OpenAI
3. Queries Pinecone for similar vectors
4. Extracts rules from the query response
5. Falls back to mock rules if any step fails

The function handles different metadata structures and can extract meaningful information from text when the expected metadata fields are not available.

## Metadata Structure

The metadata stored in Pinecone has the following structure:

```typescript
{
  id: string;           // Unique identifier for the rule
  title: string;        // Title of the rule
  description: string;  // Description of the rule
  category: string;     // Category of the rule (e.g., 'financial', 'governance', 'disclosure')
  severity: string;     // Severity of the rule ('high', 'medium', 'low')
  text: string;         // Full text of the rule (title + description)
  type: string;         // Type of the vector ('listing_rule')
}
```

## Fallback Mechanisms

The system includes several fallback mechanisms to ensure robustness:

1. **Browser Environment Detection**: Falls back to mock rules when running in a browser
2. **Environment Variable Checks**: Falls back to mock rules if environment variables are not set
3. **Error Handling**: Falls back to mock rules if any step in the process fails
4. **Metadata Extraction**: Extracts meaningful information from text when metadata structure is different

## Diagnostic Tools

The following diagnostic tools are available:

1. **Test Script**: `src/lib/ai/test-pinecone.js` can be run to test Pinecone connectivity
2. **API Endpoints**: 
   - `/api/ai-assistant/test-pinecone` tests Pinecone connectivity
   - `/api/ai-assistant/pinecone-status` checks Pinecone status

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Check that `PINECONE_API_KEY` and `PINECONE_INDEX` are set in the `.env` file
   - Restart the server after updating environment variables

2. **Pinecone Index Does Not Exist**
   - Create the index in the Pinecone dashboard
   - Ensure the index name matches the `PINECONE_INDEX` environment variable

3. **Metadata Structure Issues**
   - Check the console logs for metadata structure
   - Reinitialize Pinecone with the correct metadata structure

4. **OpenAI API Key Issues**
   - Check that `OPENAI_API_KEY` is set in the `.env` file
   - Verify that the OpenAI API key has access to the embedding model

### Debugging

The system includes extensive logging to help with debugging:

1. **Environment Variables**: Logs whether environment variables are set
2. **Pinecone Client**: Logs whether the client is initialized successfully
3. **Vector Search**: Logs each step of the vector search process
4. **Metadata Structure**: Logs the metadata structure of the first match
5. **Initialization**: Logs each step of the initialization process

## Maintenance

### Adding New Rules

To add new listing rules:

1. Add the rules to the `mockListingRules` array in `src/lib/ai/vectorSearch.ts`
2. Call the `/api/ai-assistant/initialize-pinecone` API endpoint to update Pinecone

### Updating Existing Rules

To update existing rules:

1. Update the rules in the `mockListingRules` array in `src/lib/ai/vectorSearch.ts`
2. Call the `/api/ai-assistant/initialize-pinecone` API endpoint to update Pinecone

### Monitoring

Monitor the following:

1. **Pinecone Status**: Check the Pinecone dashboard for index status
2. **Vector Count**: Ensure the index has the expected number of vectors
3. **Query Performance**: Monitor query response times
4. **Error Logs**: Check for error logs in the console

## Integration with AI Assistant

The Pinecone integration is used by the AI Assistant to provide relevant listing rules for document sections. The process works as follows:

1. User selects a document section
2. AI Assistant calls the `/api/ai-assistant/relevant-rules` API endpoint
3. API endpoint calls the `findRelevantRules` function
4. Function queries Pinecone for relevant rules
5. AI Assistant displays the relevant rules to the user

## Future Enhancements

Potential future enhancements include:

1. **Improved Rule Categorization**: Use more sophisticated methods to categorize rules
2. **Rule Versioning**: Track changes to rules over time
3. **User Feedback**: Allow users to provide feedback on rule relevance
4. **Custom Rules**: Allow users to add custom rules
5. **Rule Prioritization**: Prioritize rules based on user preferences
6. **Multi-Language Support**: Support rules in multiple languages
7. **Rule Clustering**: Group similar rules together
8. **Rule Recommendations**: Recommend rules based on user behavior 