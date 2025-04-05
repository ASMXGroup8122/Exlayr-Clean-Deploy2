# Animation System Documentation

## Overview
A lightweight animation system using CSS keyframes for smooth, performant animations in Next.js applications. This system provides reusable animations that can be applied to any component without external dependencies.

## Basic Usage

Add the following CSS to your component:

```tsx
<style jsx global>{`
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    @keyframes scaleIn {
        from {
            opacity: 0;
            transform: scale(0.8);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    .animate-fade-in-up {
        opacity: 0;
        animation: fadeInUp 0.5s ease-out forwards;
    }
    .animate-scale-in {
        opacity: 0;
        animation: scaleIn 0.5s ease-out forwards;
    }
    .animate-slide-in-right {
        opacity: 0;
        animation: slideInRight 0.5s ease-out forwards;
    }
`}</style>
```

## Available Animations

### 1. Fade In Up
Best for: Text elements, cards, or content blocks that should appear from below
```tsx
<div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
    Content here
</div>
```

### 2. Scale In
Best for: Icons, buttons, or elements that should "pop" into view
```tsx
<div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
    Content here
</div>
```

### 3. Slide In Right
Best for: List items, navigation elements, or sequential content
```tsx
<div className="animate-slide-in-right" style={{ animationDelay: '0.3s' }}>
    Content here
</div>
```

## Animation Timing

### Default Timing
- Duration: 0.5s
- Easing: ease-out
- Fill Mode: forwards (animation stays at final state)

### Adding Delays
Use inline styles to add delays for sequential animations:
```tsx
style={{ animationDelay: '0.3s' }}
```

Common delay patterns:
- Initial elements: 0.1s - 0.3s
- Main content: 0.3s - 0.5s
- Secondary content: 0.5s - 0.8s
- Final elements: 0.8s - 1s

## Example Usage

### Success Page Pattern
```tsx
// Container
<div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
    // Header Icon
    <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
        <Icon />
    </div>
    
    // Title
    <h1 className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        Title
    </h1>
    
    // Description
    <p className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        Description
    </p>
    
    // List Items (with staggered delays)
    {items.map((item, index) => (
        <div
            className="animate-slide-in-right"
            style={{ animationDelay: `${0.6 + index * 0.1}s` }}
        >
            {item}
        </div>
    ))}
    
    // Action Button
    <div className="animate-slide-in-right" style={{ animationDelay: '1s' }}>
        <Button>Action</Button>
    </div>
</div>
```

### Loading State Integration
For components that need to wait for data:
```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
    setMounted(true);
}, []);

return (
    <div className={mounted ? 'animate-fade-in-up' : 'opacity-0'}>
        Content
    </div>
);
```

## Best Practices

1. **Performance**
   - Use `transform` and `opacity` for smooth animations
   - Avoid animating layout properties (width, height, etc.)
   - Keep animations under 1 second for best UX

2. **Accessibility**
   - Respect user's reduced motion preferences
   - Keep animations subtle and purposeful
   - Avoid excessive movement

3. **Implementation**
   - Group related animations with similar delays
   - Use consistent timing patterns
   - Consider component load order when setting delays

4. **Maintenance**
   - Keep animations in sync with component state
   - Use semantic class names
   - Document custom animations

## Common Animation Patterns

### 1. Form Success
```tsx
<div className="animate-scale-in">
    <CheckIcon className="animate-scale-in" />
    <h2 className="animate-fade-in-up">Success!</h2>
</div>
```

### 2. List Loading
```tsx
{items.map((item, index) => (
    <div 
        className="animate-slide-in-right"
        style={{ animationDelay: `${index * 0.1}s` }}
    >
        {item}
    </div>
))}
```

### 3. Modal Opening
```tsx
<div className="animate-scale-in">
    <div className="animate-fade-in-up">
        Modal content
    </div>
</div>
``` 