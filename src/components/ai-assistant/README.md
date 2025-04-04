# Listing AI Assistant Component

## Overview

The Listing AI Assistant is a React component that provides AI-powered assistance for document review in the Exlayr.AI platform. It analyzes document sections against listing rules and provides compliance status, suggestions, and relevant rules.

## Features

- **Document Analysis**: Analyzes document sections against listing rules
- **Compliance Status**: Shows compliance status (compliant, partially compliant, non-compliant)
- **Improvement Suggestions**: Provides actionable suggestions to improve document quality
- **Relevant Rules**: Displays listing rules relevant to the current document section
- **Chat Interface**: Interactive chat-based interface for asking questions
- **Server Status Indicator**: Shows whether advanced AI features are available
- **Mode Toggle**: Allows switching between basic and advanced AI modes
- **Pinecone Integration**: Uses Pinecone vector database for storing and retrieving relevant rules

## Component Structure

The main component is `ListingAIAssistant.tsx`, which includes:

- **State Management**: Manages messages, server status, and UI state
- **API Calls**: Makes calls to the AI API endpoints
- **UI Rendering**: Renders the chat interface and relevant rules
- **Server Management**: Handles starting and stopping the Python server
- **Error Handling**: Handles errors and provides fallback options

## Usage

### Basic Usage

```tsx
import { ListingAIAssistant } from '@/components/ai-assistant/ListingAIAssistant';

function DocumentReview() {
  const sectionContent = "..."; // Document section content
  
  return (
    <div>
      <ListingAIAssistant sectionContent={sectionContent} />
    </div>
  );
}
```

### Props

- `sectionContent` (string): The content of the document section to analyze
- `className` (string, optional): Additional CSS classes for styling
- `comparisonResult` (object, optional): Result of comparing document versions

## API Endpoints

The component uses the following API endpoints:

- `/api/ai-assistant/chat`: Sends messages to the AI assistant
- `/api/ai-assistant/relevant-rules`: Gets relevant rules for a document section
- `/api/ai-assistant/initialize-pinecone`: Initializes Pinecone with listing rules
- `/api/ai-assistant/server-status`: Checks the status of the Python server
- `/api/ai-assistant/start-server`: Starts the Python server
- `/api/ai-assistant/stop-server`: Stops the Python server

## Environment Variables

The component requires the following environment variables:

- `OPENAI_API_KEY`: OpenAI API key for generating embeddings and chat completions
- `PINECONE_API_KEY`: Pinecone API key for vector search
- `PINECONE_INDEX`: Name of the Pinecone index to use

## Pinecone Integration

The component uses Pinecone for storing and retrieving relevant listing rules:

1. **Initialization**: The Pinecone index is initialized with listing rules using the `initializePineconeWithRules` function
2. **Vector Search**: The `findRelevantRules` function is used to find relevant rules for a document section
3. **Fallback**: If Pinecone is not available, the component falls back to mock rules

## Maintenance

### Adding New Rules

To add new listing rules:

1. Add the rules to the `mockListingRules` array in `src/lib/ai/vectorSearch.ts`
2. Call the `/api/ai-assistant/initialize-pinecone` API endpoint to update Pinecone

### Updating the Component

When updating the component:

1. Ensure all API endpoints are properly called
2. Handle errors and provide fallback options
3. Update the UI to reflect new features
4. Test with and without the Python server running

### Troubleshooting

Common issues and solutions:

1. **Server Not Starting**: Check Python dependencies and environment variables
2. **Pinecone Not Working**: Verify API key and index name in environment variables
3. **OpenAI API Errors**: Check API key and rate limits
4. **UI Not Updating**: Verify state management and component rendering

## Related Files

- `src/lib/ai/vectorSearch.ts`: Functions for finding relevant rules
- `src/lib/ai/config.ts`: Configuration for OpenAI and Pinecone
- `src/lib/ai/assistantService.ts`: Service for AI assistant functionality
- `src/app/api/ai-assistant/*`: API endpoints for AI assistant
- `docs/ai-assistant-pinecone-integration.md`: Detailed documentation on Pinecone integration

## Future Enhancements

Planned enhancements include:

1. **Improved Rule Categorization**: More sophisticated methods for categorizing rules
2. **User Feedback**: Allow users to provide feedback on rule relevance
3. **Custom Rules**: Enable users to add custom listing rules
4. **Rule Prioritization**: Prioritize rules based on user preferences
5. **Multi-Language Support**: Support listing rules in multiple languages 