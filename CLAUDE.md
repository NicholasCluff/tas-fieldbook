# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server
npm run dev

# Start development server with auto-open browser
npm run dev -- --open

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking and validation
npm run check

# Type checking in watch mode
npm run check:watch

# Lint and format code
npm run lint

# Format code
npm run format
```

## Project Architecture

**TasFieldbook** - A Supabase-backed digital fieldbook for Tasmanian land surveyors.

This is a SvelteKit application using:
- **Svelte 5** with the new runes system (`$props()`, `$state()`, etc.)
- **TypeScript** with strict configuration
- **Supabase** for backend, auth, and file storage
- **TailwindCSS v4** with forms and typography plugins
- **Progressive Web App (PWA)** for offline functionality
- **Leaflet with svelte-leafletjs** for interactive mapping

### Application Domain

- **User Roles**: Supervisors (licensed surveyors) and Candidates (can create own projects)
- **Project Ownership**: Flexible - candidates can own projects, supervisors optional
- **Project Phases**: Setup → Fieldwork → Review (with optional supervision)
- **Core Features**: Search analysis, digital diary, map markup, photo management, invitations
- **Target Users**: Land surveyors in Tasmania working independently or under supervision

### Key Architectural Elements

- **Mobile First Development** - Optimized for field use on tablets/phones
- **Offline-First Architecture** - Service workers and IndexedDB for field connectivity
- **Flexible Access Control** - Optional supervisor approval workflows
- **Project Ownership Model** - Candidates can create and manage their own projects
- **File-Based Routing**: Routes organized by user type and project phase
  - `(auth)/` - Login/register flows
  - `(app)/` - Protected application routes
  - `projects/[id]/` - Project-specific features (search, diary, map, photos, settings, invitations)
  - `invitations/` - Manage project invitations and collaboration requests
- **Component Organization**:
  - `$lib/components/` - Organized by feature (auth, diary, map, photos, projects)
  - `$lib/services/` - Supabase API integrations (includes invitations, permissions)
  - `$lib/stores/` - Global state management
  - `$lib/types/` - Database and API types

### Supabase Integration

- **Authentication**: Built-in auth with role-based permissions
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Storage**: File uploads for PDFs and photos
- **Real-time**: Live updates for supervisor-candidate collaboration

### Development Guidelines

- Follow mobile-first responsive design principles
- Implement offline functionality for all field features
- Use Supabase RLS policies for flexible project-based data security
- Support both independent and supervised workflows
- Implement invitation and permission systems for collaboration
- Optimize images and files for mobile data usage
- Test on actual mobile devices in field conditions

### Configuration Notes

- Environment variables for Supabase connection in `.env`
- TypeScript config extends `.svelte-kit/tsconfig.json` automatically
- ESLint configured for TypeScript + Svelte with Prettier integration
- PWA configuration in `vite.config.ts`
- Service worker setup for offline functionality
