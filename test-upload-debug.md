# Upload & Modal Debug Test Plan

## 🔍 **Current Issues**

### **1. ResearchPanel Not Showing**
- Debug logging shows it's rendering but modal not visible
- Added red debug indicator to confirm visibility
- Increased z-index from z-50 to z-[60]

### **2. Upload Hanging**
- Files get stuck at "Uploading..." 
- Fixed cookie authentication errors in API routes
- Need to test actual upload flow

### **3. Cookie Authentication Errors**
- ✅ **Fixed**: Updated `/api/ai/chat/route.ts` to use `createRouteHandlerClient({ cookies })`
- ✅ **Fixed**: Updated `/api/documents/upload/route.ts` to use `createRouteHandlerClient({ cookies })`

## 🧪 **Debug Steps**

### **Step 1: Test ResearchPanel Visibility**
1. Ask Smart Agent: "complete the financial section"
2. **Expected**: Red "ResearchPanel VISIBLE" indicator should appear
3. **Expected**: Modal should be visible with upload interface

### **Step 2: Test Upload Flow**
1. Select a PDF file in the upload interface
2. Click "Upload Files" button
3. **Expected**: Upload should progress and complete
4. **Check**: Browser console for any errors

### **Step 3: Check Console Logs**
Look for these debug messages:
- `🔍 ResearchPanel render:` - Panel state
- `🔍 ResearchPanel: Rendering modal...` - Confirms rendering
- `📤 Document upload API called` - Upload API triggered
- `✅ Document upload successful:` - Upload completion

## 🔧 **Fixes Applied**

### **Authentication Fixes**
```typescript
// Before (causing errors)
const cookieStore = cookies();
const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

// After (fixed)
const supabase = createRouteHandlerClient({ cookies });
```

### **Modal Visibility Fixes**
- Added debug indicator
- Increased z-index to z-[60]
- Added detailed console logging

### **Upload Button Fixes**
- Removed debug UI from DocumentUpload
- Fixed layout spacing issues
- Ensured upload button is always visible when files selected

## 🎯 **Expected Results**

1. **Modal Shows**: Red debug indicator appears when Smart Agent triggers upload
2. **Upload Works**: Files upload successfully without hanging
3. **No Console Errors**: Clean console logs with successful API calls
4. **UI Responsive**: Upload button visible and functional

## 🚨 **If Issues Persist**

### **Modal Not Showing**
- Check if `isResearchPanelOpen` state is being set to `true`
- Verify `onTriggerResearchPanel` callback is being called
- Check for CSS conflicts or parent container issues

### **Upload Still Hanging**
- Check Supabase storage bucket permissions
- Verify file size limits (50MB max)
- Check network connectivity and API timeouts

### **Console Errors**
- Authentication issues: Check user session
- Storage issues: Verify bucket exists and has proper RLS policies
- Network issues: Check API route responses 