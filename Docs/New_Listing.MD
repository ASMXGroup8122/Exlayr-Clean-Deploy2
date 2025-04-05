# New Listing Management System

## Current Implementation (Phase 1)

### 1. New Listing Creation Page
Located at `src/app/(dashboard)/dashboard/sponsor/[orgId]/new-listing/`

#### Component Structure
1. **Page Component** (`page.tsx`)
   - Client-side component using 'use client'
   - Handles form state and submission
   - Implements responsive UI with Tailwind CSS
   - Organized into logical sections:
     - Issuer Details
     - Instrument Information
     - Exchange Information

#### Form Structure
```typescript
type FormData = {
    issuer_id: string;
    instrument_category: string;
    instrument_sub_category: string;
    instrument_name: string;
    instrument_ticker: string;
    exchange: string;
    exchange_marketplace: string;
};
```

#### Constants and Types
```typescript
const INSTRUMENT_CATEGORIES = [
    'Equity',
    'Bond',
    'Fund',
    'Derivative',
    'Other'
];

const INSTRUMENT_SUB_CATEGORIES = {
    Equity: ['Ordinary Shares', 'Preference Shares', 'Depositary Receipts'],
    Bond: ['Corporate Bond', 'Government Bond', 'Convertible Bond'],
    Fund: ['ETF', 'Mutual Fund', 'Investment Trust'],
    Derivative: ['Option', 'Future', 'Warrant'],
    Other: ['Other']
};

const EXCHANGES = [
    'MERJ Exchange',
    'LSE',
    'ASMX'
];

const MARKETPLACES = {
    'MERJ Exchange': ['Equity Market', 'Bond Market', 'Fund Market'],
    'LSE': ['Main Market', 'AIM'],
    'ASMX': ['Primary Market', 'Secondary Market']
};
```

#### UI Components
1. **Header Section**
   ```jsx
   <div className="mb-8">
       <Link className="inline-flex items-center text-sm...">
           <ArrowLeft /> Back to Listings
       </Link>
       <h1>Start a New Listing</h1>
       <p>Description text...</p>
   </div>
   ```

2. **Form Sections**
   ```jsx
   <form className="bg-white rounded-xl shadow-sm...">
       {/* Issuer Section */}
       <div className="space-y-6">
           <div className="flex items-center gap-2...">
               <Building2 /> Issuer Details
           </div>
           {/* Form fields */}
       </div>

       {/* Instrument Section */}
       <div className="space-y-6">
           <div className="flex items-center gap-2...">
               <BarChart4 /> Instrument Information
           </div>
           {/* Form fields */}
       </div>

       {/* Exchange Section */}
       <div className="space-y-6">
           <div className="flex items-center gap-2...">
               <Globe /> Exchange Information
           </div>
           {/* Form fields */}
       </div>
   </form>
   ```

3. **Form Controls**
   - Input fields with icons
   - Select dropdowns with dependent fields
   - Form actions (Cancel/Next)

#### Database Integration
Currently interfaces with these tables:
1. `issuers` table for issuer selection
2. `listing` table for new listing creation with fields:
   - `instrument_issuer_id`
   - `instrument_category`
   - `instrument_sub_category`
   - `instrument_name`
   - `instrument_ticker`
   - `exchange`
   - `exchange_marketplace`
   - `status` (default: 'draft')

### 2. Due Diligence Section (Planned)
Located at `/dashboard/sponsor/[orgId]/listings/[listingId]/due-diligence/`

#### Director Due Diligence
Structure to be implemented:
```typescript
type DirectorInfo = {
    name: string;
    position: string;
    background: string;
    pep_status: boolean;
    other_directorships: string[];
    shareholding: {
        amount: number;
        percentage: number;
    };
};

type DirectorDueDiligence = {
    listing_id: string;
    directors: DirectorInfo[];
    board_structure: string;
    governance_framework: string;
};
```

### 3. Token Creation Section
Located at `/dashboard/sponsor/[orgId]/token-creation/`

#### Token Information Structure
```typescript
type TokenInfo = {
    token_name: string;
    token_symbol: string;
    token_standard: 'ERC20' | 'ERC721' | 'ERC1155';
    total_supply: number;
    decimals: number;
    initial_distribution: {
        address: string;
        amount: number;
    }[];
    features: {
        transferable: boolean;
        mintable: boolean;
        burnable: boolean;
    };
};
```

### 4. Personnel Due Diligence Section
Located at `/dashboard/sponsor/[orgId]/personnel-due-diligence/`

#### Component Structure
```typescript
// Types for Personnel Due Diligence
type PersonnelDueDiligenceCheck = {
    id: string;
    issuer_id: string;
    director_id: string;
    check_type: CheckType;
    status: 'pending' | 'completed' | 'failed';
    result: string;
    ai_model: AIModel;
    created_at: string;
    updated_at: string;
};

type CheckType = 
    | 'adverse_media'
    | 'directorships'
    | 'bankruptcies'
    | 'regulatory_actions'
    | 'criminal_records'
    | 'sanctions'
    | 'pep_screening'
    | 'social_media'
    | 'litigation_history'
    | 'professional_credentials';

type AIModel = {
    provider: 'OpenAI' | 'Perplexity' | 'Claude' | 'Gemini';
    model: string;
    temperature?: number;
    max_tokens?: number;
};

type DirectorDetails = {
    id: string;
    name: string;
    position: string;
    appointment_date: string;
    nationality: string;
    other_directorships: string[];
    education: string[];
    professional_history: string[];
};
```

#### UI Layout
1. **Left Panel - Director Selection**
   ```jsx
   <div className="w-1/4 border-r border-gray-200 p-4">
       {/* Issuer Selection */}
       <div className="mb-6">
           <label className="block text-sm font-medium text-gray-700 mb-2">
               Select Issuer
           </label>
           <select className="w-full rounded-lg border-gray-300...">
               {issuers.map(issuer => (
                   <option key={issuer.id} value={issuer.id}>
                       {issuer.name}
                   </option>
               ))}
           </select>
       </div>

       {/* Directors List */}
       <div className="space-y-4">
           {directors.map(director => (
               <div key={director.id} className="p-4 rounded-lg border hover:bg-gray-50">
                   <h3 className="font-medium">{director.name}</h3>
                   <p className="text-sm text-gray-600">{director.position}</p>
                   <div className="mt-2 text-xs text-gray-500">
                       {director.appointment_date}
                   </div>
               </div>
           ))}
       </div>
   </div>
   ```

2. **Middle Panel - AI Analysis Results**
   ```jsx
   <div className="w-1/2 p-6 bg-white">
       {/* Analysis Header */}
       <div className="mb-6">
           <h2 className="text-xl font-semibold">Due Diligence Analysis</h2>
           <p className="text-gray-600">AI-powered analysis results</p>
       </div>

       {/* Results Display */}
       <div className="space-y-6">
           {selectedChecks.map(check => (
               <div key={check.id} className="p-4 rounded-lg border">
                   <div className="flex items-center justify-between mb-2">
                       <h3 className="font-medium">{check.type}</h3>
                       <StatusBadge status={check.status} />
                   </div>
                   <div className="prose prose-sm">
                       {check.result}
                   </div>
               </div>
           ))}
       </div>
   </div>
   ```

3. **Right Panel - Analysis Configuration**
   ```jsx
   <div className="w-1/4 border-l border-gray-200 p-4">
       {/* AI Model Selection */}
       <div className="mb-6">
           <h3 className="text-sm font-medium text-gray-700 mb-2">
               Select AI Model
           </h3>
           <div className="space-y-2">
               <label className="flex items-center">
                   <input type="radio" name="ai_model" value="openai" />
                   <span className="ml-2">OpenAI GPT-4</span>
               </label>
               <label className="flex items-center">
                   <input type="radio" name="ai_model" value="claude" />
                   <span className="ml-2">Anthropic Claude</span>
               </label>
               <label className="flex items-center">
                   <input type="radio" name="ai_model" value="perplexity" />
                   <span className="ml-2">Perplexity</span>
               </label>
           </div>
       </div>

       {/* Check Types */}
       <div>
           <h3 className="text-sm font-medium text-gray-700 mb-2">
               Select Checks
           </h3>
           <div className="space-y-2">
               <label className="flex items-center">
                   <input type="checkbox" name="checks" value="adverse_media" />
                   <span className="ml-2">Adverse Media</span>
               </label>
               <label className="flex items-center">
                   <input type="checkbox" name="checks" value="directorships" />
                   <span className="ml-2">Directorships</span>
               </label>
               <label className="flex items-center">
                   <input type="checkbox" name="checks" value="bankruptcies" />
                   <span className="ml-2">Bankruptcies</span>
               </label>
               <label className="flex items-center">
                   <input type="checkbox" name="checks" value="regulatory_actions" />
                   <span className="ml-2">Regulatory Actions</span>
               </label>
               <label className="flex items-center">
                   <input type="checkbox" name="checks" value="criminal_records" />
                   <span className="ml-2">Criminal Records</span>
               </label>
               <label className="flex items-center">
                   <input type="checkbox" name="checks" value="sanctions" />
                   <span className="ml-2">Sanctions</span>
               </label>
               <label className="flex items-center">
                   <input type="checkbox" name="checks" value="pep_screening" />
                   <span className="ml-2">PEP Screening</span>
               </label>
               <label className="flex items-center">
                   <input type="checkbox" name="checks" value="social_media" />
                   <span className="ml-2">Social Media</span>
               </label>
           </div>
       </div>

       {/* Action Buttons */}
       <div className="mt-6">
           <button className="w-full bg-blue-600 text-white rounded-lg px-4 py-2">
               Run Analysis
           </button>
       </div>
   </div>
   ```

#### Database Schema
```sql
CREATE TABLE personnel_due_diligence_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issuer_id UUID REFERENCES issuers(id),
    director_id UUID REFERENCES directors(id),
    check_type TEXT NOT NULL,
    status TEXT NOT NULL,
    result JSONB,
    ai_model JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE directors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issuer_id UUID REFERENCES issuers(id),
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    appointment_date DATE,
    nationality TEXT,
    other_directorships JSONB,
    education JSONB,
    professional_history JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## UI/UX Guidelines

### 1. Color Scheme
```css
/* Primary Colors */
.text-blue-500 /* Icons and accents */
.bg-blue-600 /* Primary buttons */
.hover:bg-blue-700 /* Button hover */

/* Neutral Colors */
.bg-gray-50 /* Page background */
.text-gray-900 /* Primary text */
.text-gray-600 /* Secondary text */
.border-gray-200 /* Borders */
```

### 2. Typography
```css
/* Headings */
.text-3xl.font-bold /* Page titles */
.text-lg.font-semibold /* Section headers */
.text-sm.font-medium /* Labels */

/* Body Text */
.text-base /* Regular text */
.text-sm /* Small text */
```

### 3. Component Styling
```css
/* Form Controls */
.rounded-lg /* Border radius */
.shadow-sm /* Subtle shadows */
.transition-colors /* Smooth transitions */
.focus:ring-2 /* Focus states */

/* Layout */
.space-y-6 /* Vertical spacing */
.gap-6 /* Grid gaps */
.p-8 /* Section padding */
```

## Next Steps
1. Implement Director Due Diligence section
2. Add document upload functionality
3. Create approval workflow
4. Implement status tracking
5. Add validation and error handling
6. Create notification system for status updates

## Error Handling
- Form validation with clear error messages
- API error handling with user-friendly notifications
- Loading states for async operations 