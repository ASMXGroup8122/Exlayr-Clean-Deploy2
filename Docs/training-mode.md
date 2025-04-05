# AI Assistant Training Mode

## Overview

The AI Assistant Training Mode is a feature that allows users to improve the AI's knowledge base by providing feedback on responses and regenerating listing rules. This document explains how to use the training mode and its key features.

## Enabling Training Mode

1. Open the AI Assistant panel
2. In the top-right corner, find the "Training Mode" toggle switch
3. Click the toggle to enable Training Mode
4. The UI will indicate that Training Mode is active with a badge in the footer

## Features

### 1. Response Feedback

After receiving a response from the AI Assistant in Training Mode, you'll see feedback options:

- **👍 Yes** - Indicates the response was helpful
- **👎 No** - Indicates the response was not helpful

If you select "No", you'll be prompted to provide an improved response:

1. Enter your improved version of the response in the text area
2. Click "Submit Improvement" to save your feedback
3. Your improved response will be added to the knowledge base for future queries

### 2. Rule Regeneration

When viewing relevant rules in Training Mode, each rule will have a "Regenerate" button:

1. Click "Regenerate" on any rule you want to improve
2. A modal will open showing the current rule details
3. Edit the rule's title, description, category, and severity
4. Click "Save Rule" to update the knowledge base with your improved version

The regenerated rule will be stored in the vector database and will be available for future queries.

## How It Works

### Vector Database Integration

Training Mode interacts with the Pinecone vector database to store and retrieve information:

1. **Feedback Storage**: When you provide feedback, it's converted to embeddings and stored in the vector database
2. **Rule Regeneration**: Regenerated rules are stored as new vectors with references to the original rules
3. **Knowledge Base Selection**: All feedback and regenerated rules are stored in the selected knowledge base

### Security Constraints

For data integrity and security:

- Upserting to the vector database is **only allowed in Training Mode**
- All API endpoints verify the training mode flag before performing write operations
- Normal mode is strictly read-only

## Best Practices

1. **Provide Specific Improvements**: When giving feedback, be specific about what was wrong and how to fix it
2. **Focus on Accuracy**: When regenerating rules, ensure they accurately reflect listing requirements
3. **Use Consistent Terminology**: Maintain consistent terminology across regenerated rules
4. **Select Appropriate Categories**: Choose the most relevant category for each rule
5. **Set Correct Severity Levels**: Assign severity levels that reflect the importance of the rule

## Technical Details

The Training Mode feature consists of:

- Frontend toggle and UI components for feedback and rule regeneration
- Backend API endpoints that enforce training mode constraints
- Vector database integration for storing user feedback and regenerated rules
- Persistence of training mode preference in localStorage

## Troubleshooting

If you encounter issues with Training Mode:

- Ensure you have proper permissions to use Training Mode
- Check that the knowledge base is correctly selected
- Verify that the Pinecone vector database is accessible
- Check the browser console for any error messages

## Future Enhancements

Planned enhancements for Training Mode include:

- Analytics dashboard for tracking improvements
- User-specific feedback history
- Collaborative training features
- Quality scoring for user contributions 