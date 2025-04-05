# Tools Page Implementation

## Overview
The tools page implements a modern chat interface with AI agents, featuring a three-column layout with independent scrolling areas and fixed elements. The implementation is role-based, with a shared base component and role-specific customizations.

## Base Implementation

### Layout Structure
The base layout is implemented in `src/app/(dashboard)/dashboard/tools/page.tsx` and includes:

#### Main Container
```tsx
<div className="fixed inset-0 pt-16 pl-64">
```
- Fixed positioning relative to viewport
- Accounts for dashboard header (`pt-16`) and sidebar (`pl-64`)
- Ensures proper alignment with parent dashboard layout

#### Chat Area
```tsx
<div className="flex-1 flex flex-col bg-white relative">
```
- Takes remaining horizontal space
- Uses flexbox for vertical content organization
- White background for clean appearance

#### Messages Area
```tsx
<div className="absolute inset-0 bottom-[100px] overflow-hidden">
    <ScrollArea className="h-full">
```
- Absolutely positioned within chat area
- Leaves 100px at bottom for input
- Uses `ScrollArea` component for custom scrolling
- Messages are rendered with proper spacing and alignment

#### Input Area
```tsx
<div className="absolute bottom-0 left-0 right-0 border-t bg-white">
```
- Fixed at bottom of chat area
- Full width with top border
- White background to prevent content bleed-through
- Contains textarea and action buttons

#### Agents Toolbar
```tsx
<div className={cn(
    "h-full border-l bg-white flex flex-col",
    isToolbarOpen ? "w-[320px]" : "w-12"
)}>
```
- Full height with left border
- Transitions between expanded (320px) and collapsed (48px) states
- Uses flexbox for vertical organization

## Role-Based Implementation

### Base Component
The base `ToolsPage` component accepts:
```typescript
interface ToolsPageProps {
    roleAgents?: Agent[];
    RouteGuard?: React.ComponentType<{ children: React.ReactNode }>;
}
```

### Role-Specific Pages

#### Admin Tools (`/admin/tools`)
- Full access to all agents
- Enhanced UI with SVG icons
- Additional analytics capabilities

#### Sponsor Tools (`/sponsor/tools`)
```typescript
const sponsorAgents: Agent[] = [
    {
        id: 'sponsor-analytics',
        name: 'Sponsor Analytics',
        description: 'Track sponsorship metrics',
        category: 'analytics'
    },
    // ... more sponsor-specific agents
];
```

#### Exchange Tools (`/exchange/tools`)
```typescript
const exchangeAgents: Agent[] = [
    {
        id: 'listing-analysis',
        name: 'Listing Analysis',
        description: 'Review applications',
        category: 'research'
    },
    // ... more exchange-specific agents
];
```

#### Issuer Tools (`/issuer/tools`)
```typescript
const issuerAgents: Agent[] = [
    {
        id: 'document-writer',
        name: 'Document Writer',
        description: 'Create listing documents',
        category: 'content'
    },
    // ... more issuer-specific agents
];
```

### Agent Structure
Each agent is defined with:
```typescript
interface Agent {
    id: string;
    name: string;
    description: string;
    icon: ReactNode;
    category: 'social' | 'research' | 'content' | 'analytics';
}
```

### Categories
Agents are organized into categories:
- social (LinkedIn, Instagram)
- research (Deep Research, Market Intelligence)
- content (Content Writer)
- analytics (Performance Analytics)

## Implementation Notes

### Scroll Behavior
- Uses CSS `overflow-y-auto` for native scrolling
- Maintains smooth performance with large lists
- Preserves scroll position during toolbar transitions

### Fixed Positioning
- Accounts for parent dashboard layout
- Prevents content overlap
- Maintains clean borders between sections

### Visual Hierarchy
- Clear separation between sections
- Consistent spacing and padding
- Proper use of borders and backgrounds

### Role-Based Access
- Each role has its own set of agents
- Base agents available to all roles
- Role-specific route guards
- Custom agents per role

## Usage
1. Import the base `ToolsPage` component
2. Define role-specific agents
3. Wrap with appropriate `RouteGuard`
4. Pass agents and guard to base component

Example:
```typescript
export default function RoleToolsPage() {
    return (
        <ToolsPage
            roleAgents={roleSpecificAgents}
            RouteGuard={(props) => (
                <RouteGuard allowedTypes={['role_type']} {...props} />
            )}
        />
    );
}
```

## Extending
To add a new role-specific implementation:
1. Create a new page in the role's directory
2. Define role-specific agents
3. Use the base `ToolsPage` component
4. Add appropriate route guard
5. Customize agents as needed 