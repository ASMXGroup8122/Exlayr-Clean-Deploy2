# Sponsor Dashboard Documentation

## Overview
The sponsor dashboard implements a role-based access control system using Supabase for authentication and data management. All organization and user management is handled through a single `users` table, with additional functionality for managing listings and due diligence processes.

## Database Schema

### Users Table
```sql
create table public.users (
  id uuid not null default extensions.uuid_generate_v4(),
  email text not null,
  account_type text not null,
  first_name text not null,
  last_name text not null,
  company_name text not null,
  phone_number text null,
  status text not null default 'pending'::text,
  last_login timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_role text null,
  is_org_admin boolean null default false,
  organization_id uuid null,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_account_type_check check (
    account_type = any (array['admin', 'exchange_sponsor', 'exchange', 'issuer'])
  ),
  constraint users_status_check check (
    status = any (array['pending', 'active', 'rejected'])
  ),
  constraint users_user_role_check check (
    user_role = any (array['employee', 'advisor'])
  )
);
```

### Listings Table
```sql
create table public.listing (
    id uuid not null default extensions.uuid_generate_v4(),
    issuer_id uuid not null references public.issuers(id),
    instrument_category text not null,
    instrument_sub_category text not null,
    instrument_name text not null,
    instrument_ticker text not null,
    exchange text not null,
    exchange_marketplace text not null,
    status text not null default 'pending',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    created_by uuid references public.users(id),
    director_due_diligence jsonb,
    industry_background jsonb,
    company_due_diligence jsonb,
    smart_contract_details jsonb,
    constraint listing_pkey primary key (id),
    constraint listing_status_check check (
        status = any (array['draft', 'pending', 'approved', 'rejected'])
    )
);
```

## Listing Management System

### 1. Start a New Listing Page
Located at `/dashboard/sponsor/[orgId]/new-listing`

#### Component Structure
```typescript
// Type definitions for form data
interface ListingForm {
    issuer: {
        id: string;
        name: string;
    };
    instrument: {
        category: InstrumentCategory | '';
        subCategory: SubCategory | '';
        name: string;
        ticker: string;
    };
    exchange: {
        name: Exchange | '';
        marketplace: Marketplace | '';
    };
    dueDiligence: {
        director: {
            directors: {
        name: string;
                position: string;
                background: string;
                pep_status: boolean;
            }[];
        };
        industry: {
            market_size: string;
            competitors: string[];
            regulatory_environment: string;
            growth_factors: string[];
        };
        company: {
            compliance_status: string;
            risk_factors: string[];
            financial_overview: {
                revenue: number;
                profit: number;
                year: number;
            }[];
        };
    };
}
```

#### Form Constants
```typescript
// Strongly typed constants for form options
export const INSTRUMENT_CATEGORIES = [
    'Equity',
    'Bond',
    'Fund',
    'Structured Product'
] as const;

export const SUB_CATEGORIES = {
    Equity: ['Ordinary Shares', 'Preference Shares', 'Depository Receipts'],
    Bond: ['Corporate Bond', 'Convertible Bond', 'Green Bond'],
    Fund: ['ETF', 'Mutual Fund', 'REIT'],
    'Structured Product': ['Note', 'Certificate', 'Warrant']
} as const;

export const EXCHANGES = [
    'MERJ Exchange',
    'LSE',
    'ASMX'
] as const;

export const MARKETPLACES = {
    'MERJ Exchange': ['Equity Market', 'Bond Market', 'Fund Market'],
    'LSE': ['Main Market', 'AIM'],
    'ASMX': ['Primary Market', 'Secondary Market']
} as const;

// Type exports for form validation
export type InstrumentCategory = typeof INSTRUMENT_CATEGORIES[number];
export type SubCategory = typeof SUB_CATEGORIES[InstrumentCategory][number];
export type Exchange = typeof EXCHANGES[number];
export type Marketplace = typeof MARKETPLACES[Exchange][number];
```

### State Management

#### Listing Context
The application uses a React Context to manage listing form state across multiple steps:

```typescript
interface ListingContextType {
    formData: ListingForm;
    updateForm: (data: Partial<ListingForm>) => void;
    updateDueDiligence: (section: keyof ListingForm['dueDiligence'], data: any) => void;
    resetForm: () => void;
}

// Usage in components
const { formData, updateForm, updateDueDiligence } = useListing();
```

#### State Persistence
Form state is persisted using localStorage:

```typescript
// Save state
const updateForm = (data: Partial<ListingForm>) => {
    setFormData(prev => {
        const newData = { ...prev, ...data };
        localStorage.setItem('listing_draft', JSON.stringify(newData));
        return newData;
    });
};

// Load state
useEffect(() => {
    const savedData = localStorage.getItem('listing_draft');
    if (savedData) {
        try {
            setFormData(JSON.parse(savedData));
        } catch (error) {
            console.error('Error loading saved listing data:', error);
        }
    }
}, []);
```

### Data Flow

1. **Initial Form Load**
   - Check for saved draft in localStorage
   - Load issuer data from Supabase
   - Initialize form with default or saved values

2. **Form Updates**
   - All updates go through the ListingContext
   - Changes are immediately persisted to localStorage
   - Form state is maintained across navigation

3. **Form Submission**
   - Data is validated before submission
   - Submitted to Supabase `listing` table
   - User is redirected to due diligence section

### Implementation Details

1. **Route Protection**
```typescript
useEffect(() => {
    if (!user || user.account_type !== 'exchange_sponsor') {
        router.replace('/sign-in');
        return;
    }
}, [user, router]);
```

2. **Data Fetching**
```typescript
const loadIssuers = async () => {
    const { data, error } = await supabase
        .from('issuers')
        .select('id, issuer_name')
        .eq('organization_id', orgId);
    
    if (data) {
        setIssuers(data);
    }
};
```

3. **Form Submission**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const { data, error } = await supabase
            .from('listing')
            .insert({
                issuer_id: formData.issuer.id,
                instrument_category: formData.instrument.category,
                instrument_sub_category: formData.instrument.subCategory,
                instrument_name: formData.instrument.name,
                instrument_ticker: formData.instrument.ticker,
                exchange: formData.exchange.name,
                exchange_marketplace: formData.exchange.marketplace,
                status: 'draft',
                created_by: user?.id
            })
            .select()
            .single();

        if (error) throw error;
        if (data) {
            router.push(`/dashboard/sponsor/${orgId}/listings/${data.id}/due-diligence/director`);
        }
    } catch (error) {
        console.error('Error creating listing:', error);
    }
};
```

### 2. Manage Listings Page
Located at `/dashboard/sponsor/[orgId]/listings`

#### Data Structure
```typescript
interface Listing {
    id: string;
    instrument_name: string;
    instrument_ticker: string;
    exchange: string;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
    updated_at: string;
}

// Fetch listings
const fetchListings = async () => {
    const { data, error } = await supabase
        .from('listing')
        .select('*')
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });
    
    if (data) {
        setListings(data);
    }
};
```

### 3. Due Diligence Pages
Located at `/dashboard/sponsor/[orgId]/listings/[listingId]/due-diligence/[section]`

#### Data Models
```typescript
interface DirectorDueDiligence {
    directors: {
        name: string;
        position: string;
        background: string;
        pep_status: boolean;
    }[];
}

interface IndustryBackground {
    market_size: string;
    competitors: string[];
    regulatory_environment: string;
    growth_factors: string[];
}

interface CompanyDueDiligence {
    compliance_status: string;
    risk_factors: string[];
    financial_overview: {
        revenue: number;
        profit: number;
        year: number;
    }[];
}
```

### 4. Smart Contract Section (Mock)
Located at `/dashboard/sponsor/[orgId]/listings/[listingId]/smart-contract`

```typescript
interface SmartContractConfig {
    instrument_id: string;
    blockchain: 'BNB Smart Chain' | 'Ethereum' | 'Polygon';
    contract_template: string;
}
```

## State Management

### Form State Persistence
```typescript
// Using React Context for state management
interface ListingContext {
    formData: ListingForm;
    updateForm: (data: Partial<ListingForm>) => void;
    submitForm: () => Promise<void>;
    resetForm: () => void;
}

// Local storage backup
const saveToLocalStorage = (data: ListingForm) => {
    localStorage.setItem('listing_draft', JSON.stringify(data));
};

const loadFromLocalStorage = (): ListingForm | null => {
    const saved = localStorage.getItem('listing_draft');
    return saved ? JSON.parse(saved) : null;
};
```

## Best Practices

1. **Form Handling**
   - Implement progressive form validation
   - Save form state to localStorage as backup
   - Use optimistic updates for better UX

2. **Data Management**
   - Implement real-time subscriptions for listing updates
   - Cache frequently accessed data
   - Use proper error boundaries

3. **Security**
   - Validate all form inputs
   - Implement proper RLS policies
   - Maintain audit logs for listing changes

## Common Issues and Solutions

1. **Form State Loss**
   - Implement auto-save functionality
   - Use localStorage backup
   - Maintain state in React Context

2. **Data Synchronization**
   - Use Supabase real-time subscriptions
   - Implement proper loading states
   - Handle concurrent edits

3. **Performance**
   - Implement pagination for listings
   - Use proper caching strategies
   - Optimize form re-renders

## Dashboard Architecture

### 1. Dashboard Routing
The dashboard implements a dynamic routing system based on user roles:

```typescript
// Base route handling (/dashboard)
function getRedirectPath(accountType: string) {
    switch (accountType) {
        case 'exchange_sponsor':
            return '/dashboard/sponsor';
        case 'admin':
            return '/dashboard/admin';
        case 'exchange':
        case 'issuer':
            return `/dashboard/${accountType}`;
        default:
            return '/dashboard';
    }
}
```

### 2. Sponsor Dashboard Components

#### Main Dashboard Layout
The sponsor dashboard consists of two main sections:
1. **Listings Snapshot**: Recent listings table with status tracking
2. **Portal Cards**: Quick access to key functionalities

#### Portal Cards
Six main functional areas:
```typescript
interface PortalCard {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    bgColor: string;
}

const portalCards = [
    {
        title: 'Reminders & Key Dates',
        description: '3 upcoming deadlines this week',
        href: '/calendar',
        bgColor: 'bg-blue-50'
    },
    {
        title: 'Volume / Analytics',
        description: 'Monthly volume up 15%',
        href: '/analytics',
        bgColor: 'bg-green-50'
    },
    {
        title: 'User Management',
        description: 'Manage team members and permissions',
        href: '/users',
        bgColor: 'bg-purple-50'
    },
    {
        title: 'AI Knowledge Vault',
        description: 'New regulatory guidelines available',
        href: '/knowledge',
        bgColor: 'bg-yellow-50'
    },
    {
        title: 'New Issuer Listing',
        description: 'Start a new listing application',
        href: '/new-listing',
        bgColor: 'bg-indigo-50'
    },
    {
        title: 'Primary Market Issuance',
        description: 'Launch new share issuance',
        href: '/issuance',
        bgColor: 'bg-pink-50'
    }
]
```

### 3. Access Control
- Route protection using `useAuth` hook
- Organization-specific routing using `orgId` parameter
- Status checks for active sponsors

```typescript
useEffect(() => {
    if (!user || user.account_type !== 'exchange_sponsor') {
        router.replace('/sign-in');
    }
}, [user, router]);
```

### 4. Data Management
- Recent listings displayed in a table format
- Status tracking with visual indicators
- Key date monitoring and notifications

```typescript
const getStatusColor = (status: string) => {
    const colors = {
        Draft: 'bg-gray-100 text-gray-800',
        Pending: 'bg-yellow-100 text-yellow-800',
        Live: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || colors.Draft;
};
``` 