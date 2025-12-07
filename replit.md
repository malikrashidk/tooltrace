# Tool Trace - Project Documentation

## Overview
Tool Trace is a self-hostable SaaS tool management platform designed for freelancers, businesses, and individuals. It provides JWT authentication, comprehensive tool management, financial analytics, subscription tracking, a notes feature, and integrated Stripe payment processing. The platform aims to offer a complete solution for managing software tools efficiently, tracking expenditures, and ensuring security.

## User Preferences
- I prefer clear and concise explanations.
- I value a systematic and iterative development approach.
- Please ask for confirmation before implementing major architectural changes or feature removals.
- Focus on delivering production-ready, clean, and type-safe code.
- I do not want any changes to be made to the `browser-extension/` folder unless explicitly requested.

## Recent Changes (December 7, 2025)
### Mobile Responsiveness - Production Ready
Completed comprehensive mobile-first responsive design implementation across the entire application (320px to 1920px+):
- **Responsive Typography**: All page titles use `text-2xl sm:text-3xl`, stat cards `text-xl sm:text-2xl`, descriptions `text-xs sm:text-sm md:text-base`
- **Responsive Spacing**: Consistent padding across all pages `p-3 sm:p-4 md:p-6`, including loading states
- **Mobile Card Layouts**: UserManagementPage uses mobile card layouts (md:hidden) with desktop table views (hidden md:block)
- **Optimized Tables**: ToolsPage optimized for mobile with hidden columns (`hidden sm:table-cell`, `hidden md:table-cell`), smaller text (`text-xs sm:text-sm`), responsive avatars, proper text wrapping, and NO horizontal scroll on 320px devices
- **Responsive Components**: CardHeaders stack on mobile (`flex-col sm:flex-row`), form buttons stack (`flex flex-col sm:flex-row`), dialog buttons use `w-full sm:w-auto`
- **Grid Layouts**: All grids use proper breakpoints (Dashboard `grid-cols-1 md:grid-cols-3`, Admin `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)
- **Premium Features**: ApiKeysPage, TeamCollaborationPage, ReceiptStoragePage replaced with clean "Coming Soon" placeholders (no mock data) while maintaining paid-plan gating
- **Design Compliance**: Removed all emoji usage, replaced with lucide-react icons (Lock, Users, FileText, Rocket, Settings, etc.)
- **Architect Verified**: All changes passed architect review - production-ready for mobile deployment

## System Architecture
### UI/UX Decisions
The frontend is built with React 18, TypeScript, and Vite, utilizing Shadcn/ui and Tailwind CSS for a modern, responsive design. Fully mobile-responsive (320px+) with 15 distinct pages including Dashboard, Tools CRUD, Notes, Analytics, and Renewal tracking, with support for dark/light themes.

### Technical Implementations
- **Backend**: Node.js with Express.js, providing a comprehensive REST API with over 30 endpoints.
- **Database**: PostgreSQL (Neon) managed with Drizzle ORM. The schema includes 7 core tables: `users`, `tools`, `subscriptions`, `payments`, `receipts`, `audit_logs`, and `api_keys`, plus a `notes` table. All tables are indexed for performance.
- **Authentication**: JWT with a 7-day expiry and PBKDF2 for password hashing (100k iterations, random salt). Supports an admin role with specific access controls.
- **Security**: Implements rate limiting (100 requests/minute), comprehensive audit logging, Zod for input validation, and client-side AES-GCM encryption for sensitive credentials.
- **Subscription System**: Supports Free (5 tools), Standard (12 tools + team features), and Premium (unlimited tools + API access) tiers, with database-enforced tool limits.
- **Financial Analytics**: Dashboard and Analytics pages provide visual spending analytics based on real financial data.
- **Notes Feature**: Allows users to create, edit, pin, and delete personal notes associated with their tools.

### Feature Specifications
- **Tool Management**: CRUD operations for tools, including inline editing and dynamic categorization.
- **Renewal Tracking**: Displays upcoming renewals with urgency badges.
- **Admin Dashboard**: Provides administrative control over users and platform statistics.
- **Data Handling**: Support for CSV import/export, receipt upload, and secure credential storage.
- **Deployment**: Designed for Docker and Docker Compose for easy deployment to a VPS, including Nginx for reverse proxy and SSL/TLS.

## External Dependencies
- **Database**: PostgreSQL (specifically Neon for cloud deployment).
- **Payment Gateway**: Stripe (using `stripe` and `stripe-replit-sync` packages) for subscription management, checkout flows, and customer portal integration.
- **Caching**: Redis for caching mechanisms.
- **Containerization**: Docker and Docker Compose for application deployment and orchestration.
- **Web Server**: Nginx for reverse proxy and SSL termination in production environments.
- **Authentication**: JSON Web Tokens (JWT) for secure user authentication.