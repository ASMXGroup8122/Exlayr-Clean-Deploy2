# AI Assistant Architecture

## Overview

The AI Assistant is a powerful tool integrated into the Exlayr.AI platform that helps users analyze document sections against exchange listing guidelines. It provides real-time feedback, compliance analysis, and relevant content suggestions to improve document quality.

This document explains the architecture of the AI Assistant after the removal of the Python server dependency, focusing on the pure JavaScript/TypeScript implementation.

## Architecture

The AI Assistant architecture consists of the following components:

1. **AI Library**: Core AI functionality in `src/lib/ai/`
   - `config.ts`: Configuration for OpenAI and Pinecone
   - `vectorSearch.ts`: Functions for finding relevant content in the vector database
   - `agents.ts`: Agent definitions and execution logic
   - `directOpenAI.ts`: Direct integration with OpenAI API
   - `assistantService.ts`: Service layer for AI functionality

2. **Context Provider**: React context for managing AI Assistant state
   - `AIAssistantContext.tsx`: Provides state and functions for the AI Assistant

3. **UI Components**: React components for the AI Assistant interface
   - `ListingAIAssistant.tsx`: Main component for the AI Assistant
   - Supporting components for specific features

4. **API Routes**: Next.js API routes for AI functionality
   - `/api/ai-assistant/analyze-section`: Analyze document sections
   - `/api/ai-assistant/analyze-section-multi-agent`: Analyze using multi-agent architecture
   - `/api/ai-assistant/relevant-rules`: Find relevant rules for a section
   - `/api/ai-assistant/message`: Process user messages
   - Additional routes for specific features

## Multi-Agent Architecture

The AI Assistant uses a multi-agent architecture to analyze document sections:

1. **Context Extraction Agent**: Extracts key contextual information from document sections
2. **Rule Filtering Agent**: Identifies relevant exchange listing guidelines
3. **Targeted Summarization Agent**: Synthesizes guidelines into concise recommendations
4. **User Feedback Integration Agent**: Incorporates user feedback
5. **Quality Assurance Agent**: Ensures consistency and clarity
6. **Contextual Relevance Evaluator**: Verifies alignment with broader context
7. **Iterative Refinement Agent**: Continuously improves recommendations

Each agent is implemented as a specialized function that uses the OpenAI API directly, without the need for a Python server.

## Vector Search

The AI Assistant uses Pinecone vector database to store and retrieve relevant content:

1. **Embedding Generation**: Uses OpenAI to generate embeddings for text
2. **Vector Storage**: Stores embeddings in Pinecone with metadata
3. **Vector Retrieval**: Queries Pinecone for similar vectors based on semantic similarity
4. **Result Processing**: Processes and formats the results for display

## Advanced Mode

The AI Assistant now uses a simplified "Advanced Mode" concept:

1. **Advanced Mode Toggle**: Users can toggle advanced mode on/off
2. **Enhanced Analysis**: Advanced mode enables more sophisticated analysis
3. **UI Indicators**: The UI shows when advanced mode is active

Unlike the previous implementation, advanced mode no longer depends on a separate Python server, making it more reliable and easier to deploy.

## Implementation Details

### Agent Execution

Agents are executed using the `executeAgent` function in `src/lib/ai/agents.ts`:

```typescript
export async function executeAgent(request: AgentRequest): Promise<AgentResponse> {
  try {
    console.log(`Executing agent: ${request.agentType}`);
    return await callDirectOpenAI(request);
  } catch (error: any) {
    console.error('Error executing agent:', error);
    // Fallback to a simple error response
    return {
      messages: [
        ...request.messages,
        {
          role: 'assistant',
          content: `I encountered an error while processing your request. Please try again later. Error details: ${error.message || 'Unknown error'}`,
        },
      ],
    };
  }
}
```

### Context Provider

The `AIAssistantContext` provides state and functions for the AI Assistant:

```typescript
export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(true); // Default to advanced mode

  const toggleAdvancedMode = useCallback(() => {
    setIsAdvancedMode(prev => !prev);
  }, []);

  return (
    <AIAssistantContext.Provider
      value={{
        isProcessing,
        setIsProcessing,
        isAdvancedMode,
        toggleAdvancedMode
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}
```

## Benefits of the New Architecture

1. **Simplified Deployment**: No need to manage a separate Python process
2. **Improved Reliability**: Fewer moving parts and potential points of failure
3. **Better Performance**: Reduced overhead from cross-language communication
4. **Easier Maintenance**: Single codebase in JavaScript/TypeScript
5. **Consistent Error Handling**: Unified error handling patterns
6. **Better Integration with Next.js**: Native integration with Next.js API routes

## Future Enhancements

1. **Improved Vector Search**: Enhanced algorithms for finding relevant content
2. **Advanced Caching**: Caching mechanisms for improved performance
3. **Offline Mode**: Support for offline operation with cached data
4. **Custom Models**: Support for custom models and embeddings
5. **Enhanced Multi-Agent Coordination**: Better coordination between agents
6. **User Feedback Loop**: Improved mechanisms for incorporating user feedback

## Migration Guide

If you're migrating from the previous architecture with Python server:

1. **Update Dependencies**: Remove Python-related dependencies
2. **Update Context Usage**: Replace `usePythonServer` with `useAIAssistant`
3. **Update API Calls**: Update API calls to use the new endpoints
4. **Test Thoroughly**: Test all functionality to ensure it works correctly

## Conclusion

The new architecture provides a more streamlined and reliable AI Assistant experience, while maintaining all the powerful features of the previous implementation. By removing the Python server dependency, we've simplified deployment and maintenance, while improving performance and reliability. 

After receiving the analysis result
console.log("[AnalyzeBtn] Analysis result received:", result);
// Right before dispatching SET_SECTION_RESULT
console.log("[AnalyzeBtn] Dispatching SET_SECTION_RESULT with:", {
  sectionId: section.id,
  result: result
}); 