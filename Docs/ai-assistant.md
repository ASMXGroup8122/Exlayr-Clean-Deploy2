# AI Assistant Documentation

## Overview

The AI Assistant is a powerful tool integrated into the Exlayr.AI platform that helps users analyze document sections against exchange listing rules. It provides real-time feedback, compliance analysis, and relevant rule suggestions to improve document quality.

## Features

- **Context-Aware Analysis**: Analyzes each section in the context of the full document
- **Smart Section Analysis**: Distinguishes between general/introductory sections and specific/detailed sections
- **Non-Redundant Suggestions**: Avoids suggesting information that's already covered in other sections
- **Cross-Reference Support**: Suggests cross-references when appropriate to help investors find related information
- **Knowledge Base Selection**: Switch between different knowledge bases (Exchange Rules, Compliance)
- **Document Analysis**: Analyze document sections against relevant listing rules
- **Compliance Checking**: Get compliance status (compliant, warning, non-compliant) for document sections
- **Relevant Rules**: Automatically find and display rules relevant to the current content
- **Dynamic Status Messages**: Informative status messages during processing
- **Automatic Advanced Mode**: Enhanced analysis capabilities with automatic Python server startup
- **Training Mode**: Provide feedback to improve AI responses

## Section Analysis Approach

The AI Assistant analyzes document sections in a way that mimics how a compliance officer would review them:

1. **Full Document Context**
   - First reads the entire document to understand the overall context
   - Identifies where specific information is covered in different sections
   - Understands how sections relate to each other

2. **Section-Specific Analysis**
   - Analyzes each section in isolation, but with full document context in mind
   - Distinguishes between:
     - General/Introductory sections (e.g., "The following sections describe...")
     - Specific/Detailed sections (e.g., "The finances of the company are [X] turnover...")

3. **Smart Compliance Assessment**
   - For general sections:
     - Accepts cross-references as sufficient
     - Only suggests adding cross-references if they'd help investors
   - For specific sections:
     - Requires complete information, even if some details exist elsewhere
     - Marks as non-compliant if required information is missing

4. **Non-Redundant Suggestions**
   - Never suggests repeating information that's already well-covered in other sections
   - Only suggests improvements that would actually help investors understand the section better
   - Provides cross-references to help investors find related information

## User Interface

### Header
- **Title**: "AI Assistant"
- **Knowledge Base Selector**: Dropdown to select the knowledge base
- **Training Mode Toggle**: Switch to enable/disable training mode
- **Close Button**: Close the assistant

### Message Display
- **User Messages**: Blue background, aligned to the right
- **Assistant Messages**: Gray background, aligned to the left
- **Error Messages**: Red background (only shown for critical errors)
- **Source Badge**: Shows which knowledge base was used for each response
- **Feedback UI**: In training mode, allows users to provide feedback on responses

### Input Area
- **Text Input**: Multi-line text area for user messages or document sections
- **Send Button**: Submit messages
- **Quick Suggestions**: Buttons for common queries

### Status Bar
- **Knowledge Base**: Shows the currently selected knowledge base
- **Advanced Mode**: Indicator when advanced mode is active
- **Starting Indicator**: Shows when the Python server is starting
- **Rules Count**: Shows the number of relevant rules found

### Document Comparison
- **Document Section**: Shows the content being analyzed
- **Listing Rule**: Shows the relevant rule
- **Compliance Status**: Visual indicator of compliance status
- **Explanation**: Detailed explanation of compliance issues

## Usage

### Basic Interaction
1. Type a question or paste document text in the input area
2. Click the send button or press Enter
3. View the AI's response in the message display

### Document Analysis
1. Navigate to a document section in the platform
2. Open the AI Assistant
3. Click "Analyze Current Section"
4. Review the compliance analysis and suggestions

### Knowledge Base Selection
1. Click the Knowledge Base dropdown
2. Select the desired knowledge base
3. The AI will use the selected knowledge base for subsequent queries

### Advanced Mode
The AI Assistant now automatically starts the Python server when opened:
1. When you open the AI Assistant, it checks if the Python server is running
2. If not, it automatically starts the server in the background
3. A "Starting advanced mode..." indicator appears while the server is starting
4. Once ready, a green "Advanced mode" indicator appears in the status bar

### Training Mode
1. Toggle the "Training Mode" switch in the header
2. After receiving responses, provide feedback using the thumbs up/down buttons
3. For negative feedback, you can provide an improved response
4. Your feedback helps improve the AI's responses over time

## Technical Details

### Component Structure
- `ListingAIAssistant.tsx`: Main component
- Props:
  - `isOpen`: Controls visibility
  - `onClose`: Function to close the assistant
  - `documentId`: Current document ID
  - `currentSection`: Current section being viewed
  - `className`: Optional CSS class

### State Management
- Messages state for conversation history
- Knowledge base selection state
- Status message state for processing feedback
- Relevant rules state for storing found rules
- Server status state (available, starting)
- Training mode state

### API Endpoints
- `/api/ai-assistant/message`: Process user messages
- `/api/ai-assistant/relevant-rules`: Find relevant rules
- `/api/ai-assistant/analyze-section`: Analyze document sections
- `/api/ai-assistant/test-knowledge-base`: Test knowledge base selection
- `/api/python-server/status`: Check Python server status
- `/api/python-server/start`: Start the Python server
- `/api/ai-assistant/feedback`: Submit user feedback (in training mode)

### Integration Points
- Python server for advanced analysis (auto-started when needed)
- Pinecone vector database for semantic search
- OpenAI for natural language processing
- PythonServerContext for managing server state

## Best Practices

### For Developers
- Keep the UI responsive during API calls
- Use status messages to provide feedback during processing
- Handle errors gracefully without disrupting the conversation
- Minimize system messages to keep the conversation clean
- Ensure the Python server starts quickly and reliably

### For Users
- Be specific in your questions for better results
- Use the knowledge base selector to focus on relevant rules
- Try the "Analyze Current Section" button for quick analysis
- Check the source badge to know which knowledge base was used
- Enable training mode to help improve the system with your feedback

## Future Enhancements

- Additional knowledge bases for different regulatory frameworks
- Customizable UI themes
- Export conversation history
- Saved queries for frequent checks
- Batch analysis of multiple sections
- Improved server startup performance
- Enhanced training mode analytics 