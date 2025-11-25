# Design Guidelines: SaaS Tools Hub for Freelancers

## Design Approach
**System**: Hybrid approach drawing from Linear's typography and spacing principles combined with modern dashboard patterns from Notion and productivity tools.

**Rationale**: This is a utility-focused, data-heavy productivity application where clarity, efficiency, and information hierarchy are paramount. Users need quick access to financial data, tools, and analytics without visual distraction.

## Typography

**Font Stack**: 
- Primary: Inter (400, 500, 600) via Google Fonts
- Monospace: JetBrains Mono (for numbers, costs)

**Hierarchy**:
- H1: text-3xl font-semibold (Dashboard titles)
- H2: text-2xl font-semibold (Section headers)
- H3: text-lg font-medium (Card titles, widget headers)
- Body: text-base (Default text)
- Small: text-sm (Metadata, timestamps, tags)
- Micro: text-xs (Labels, category badges)

**Numbers/Costs**: Use monospace font for all financial figures and dates to improve scanability

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-6
- Section spacing: gap-8, space-y-8
- Card spacing: gap-6
- Form fields: space-y-4
- Tight grouping: gap-2

**Grid System**:
- Dashboard: 12-column grid with gap-6
- Tool cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Analytics widgets: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Forms: Single column max-w-2xl

**Container**: max-w-7xl mx-auto px-6

## Component Library

### Navigation
- Sidebar: Fixed left navigation (w-64) with tool categories, dashboard, analytics, settings
- Top bar: User profile, search, notifications (h-16)
- Mobile: Collapsible hamburger menu

### Tool Cards
- Structure: Vertical card with logo at top (h-20 w-20 object-contain), tool name, category badge, usage tag, "Go" button
- Dimensions: Aspect ratio ~3:4, rounded-lg, border, shadow-sm
- Logo area: Centered with subtle background
- Quick actions: Edit/delete icons in top-right corner (visible on hover)
- Metadata row: Category tag + usage frequency + cost (if paid)

### Dashboard Widgets
**Financial Summary**: 
- Large number displays with label underneath
- 3-column grid: Monthly spend | Yearly spend | Active tools
- Use card backgrounds with rounded-xl

**Upcoming Renewals**:
- List format with tool logo, name, renewal date, amount
- Color indicators: Red (within 7 days), Yellow (within 30 days)
- Compact row layout: h-16 per item

**Category Breakdown**:
- Horizontal bar chart or donut chart
- Legend with spending per category
- Interactive hover states

**Low Usage Alert**:
- Highlighted card with warning icon
- List of rarely-used paid tools with cost per tool
- "Review" action button

### Forms
**Tool Add/Edit**:
- Clear section separation: Basic Info | Financial Details | Advanced
- File upload: Drag-and-drop zone with preview for logo/receipts
- Input groups with labels above fields
- Toggle switches for free/paid, usage frequency dropdowns
- Tag input: Pill-style with x-remove, allow custom creation
- Save/Cancel buttons: Primary on right, secondary on left

**Authentication**:
- Centered card (max-w-md) on clean background
- Logo at top, form in middle, "Don't have account?" link at bottom
- Single-column inputs with generous spacing (space-y-6)

### Data Tables
- Tool list view: Sortable columns (Name, Category, Cost, Renewal, Usage)
- Row actions: Edit, delete, view receipts
- Sticky header on scroll
- Alternating row backgrounds for readability
- Pagination or infinite scroll

### Buttons
- Primary: Solid fill, rounded-md, px-4 py-2
- Secondary: Border with transparent background
- Icon buttons: p-2 rounded-md
- "Go" buttons on cards: Full width, subtle styling

### Badges & Tags
- Category badges: Small, rounded-full, px-3 py-1, text-xs
- Usage tags: Outlined style with usage-specific styling
- Status indicators: Small dot + text for renewal urgency

### Modals & Overlays
- Delete confirmation: Small centered modal with clear warning
- Receipt viewer: Full-screen overlay with close button
- CSV import: Step-by-step wizard with progress indicator

### Charts & Visualizations
- Use simple, clean chart library (Chart.js or Recharts)
- Minimal gridlines, clear labels
- Consistent palette across all charts
- Tooltips on hover with detailed breakdowns

### Empty States
- Icon + message + action button
- "No tools yet? Add your first tool"
- Helpful illustrations (simple line drawings)

## Images

**Tool Logos**: User-uploaded, displayed as contained images within fixed-size containers (h-20 w-20). Fallback: Initials in colored circle

**Receipts**: Stored but displayed as thumbnail previews with download/view options

**Empty State Illustrations**: Simple, minimalist line icons for empty dashboards or categories

**No Hero Image**: This is a dashboard application, not a marketing site. Focus on functional layouts and data display.

## Accessibility
- All interactive elements: min-height 44px for touch targets
- Form inputs: Clear labels, error states with descriptive messages
- Focus states: Visible outline on all interactive elements
- Semantic HTML throughout
- ARIA labels for icon-only buttons

## Responsive Behavior
- Desktop (lg+): Full sidebar + main content
- Tablet (md): Collapsible sidebar, 2-column card grids
- Mobile: Hamburger menu, single-column cards, simplified charts
- Forms: Always single column, full width on mobile

## Key Design Principles
1. **Information density without clutter**: Show all critical data but with clear visual hierarchy
2. **Fast navigation**: Quick access to all tools and financial data
3. **Scanability**: Use monospace for numbers, clear labels, visual grouping
4. **Progressive disclosure**: Details on demand via modals/dropdowns
5. **Consistent patterns**: Reuse card, form, and table patterns throughout