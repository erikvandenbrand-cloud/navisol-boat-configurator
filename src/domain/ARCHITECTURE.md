# Navisol v4 Architecture

## IMPORTANT: No Legacy Imports

This codebase has been migrated to the v4 architecture. **DO NOT** import from legacy modules:

```
❌ DO NOT IMPORT:
- @/lib/store (deleted)
- @/lib/store-v2 (deleted)
- @/lib/store-v3 (deleted)
- @/lib/types (deleted)
- @/lib/types-v2 (deleted)
- @/lib/types-v3 (deleted)
- @/components/AppV2 (deleted)
- Any legacy components in @/components/* (deleted)

✅ ALLOWED IMPORTS:
- @/domain/* (domain layer)
- @/data/* (data/persistence layer)
- @/v4/* (v4 UI layer)
- @/components/ui/* (shadcn components)
- @/lib/utils (shadcn utilities)
```

## Directory Structure

```
src/
├── domain/           # Business logic (pure TypeScript, no React)
│   ├── models/       # Domain entities (Client, Project, Library)
│   ├── schemas/      # Zod validation schemas
│   ├── services/     # Business services (Quote, Configuration, etc.)
│   ├── workflow/     # Status machine and transitions
│   ├── pricing/      # Pricing calculations
│   ├── rules/        # Business rules and compliance
│   ├── auth/         # Authorization (5 roles)
│   └── audit/        # Audit logging
│
├── data/             # Persistence layer
│   ├── persistence/  # Adapters (LocalStorage now, Neon later)
│   └── repositories/ # Repository pattern implementations
│
├── v4/               # UI layer (React)
│   ├── screens/      # Main screens (Projects, Clients, etc.)
│   ├── components/   # V4-specific components
│   ├── state/        # React hooks for state management
│   └── data/         # Sample data for development
│
├── components/
│   └── ui/           # shadcn/ui components ONLY
│
└── lib/
    └── utils.ts      # shadcn utilities ONLY
```

## Core Principles

1. **Project is the Hub**: Everything relates to a Project
2. **Library/Project Separation**: Templates in Library, instances in Project
3. **Version Pinning**: Projects pin specific library versions
4. **Immutability After Freeze**: Quotes and configs freeze at milestones
5. **Audit Everything**: All significant actions are logged
6. **Persistence Adapter**: Swap LocalStorage for Neon without code changes

## Migration Complete

- Version: v116
- Date: 2026-01-07
- Legacy code deleted: 57 files
- Only v4 architecture remains
