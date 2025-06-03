# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LIMS (Laboratory Information Management System) - A CFR Part 11 compliant system for managing laboratory workflows including sample tracking, project management, and sequencing operations.

## Git Repository Setup (Dual Remote)
- **Private (default)**: `origin` → https://github.com/noigsean/seqvault-private.git
- **Public**: `public` → https://github.com/noigsean/seqvault.git

### Quick Git Commands (Shortcuts)
When you say:
- **"add to private"** (default): 
  ```bash
  git add . && git commit -m "your message" && git push origin main
  ```
- **"add to public"**: 
  ```bash
  git add . && git commit -m "your message" && git push public main
  ```
- **"push to private"**: `git push origin [current-branch]`
- **"push to public"**: `git push public [current-branch]`
- **"check remotes"**: `git remote -v`
- **"fetch from public"**: `git fetch public`
- **"sync from public"**: `git fetch public && git merge public/main`
- **"see what would be shared"**: `git diff public/main..HEAD`
- **"check private branches"**: `git branch -a | grep private/`

### Branch Naming Convention
- `private/*` → NEVER push to public (e.g., private/user-management)
- `public/*` → Safe to share with collaborators
- `feature/*` → Decide case-by-case

### Important Private Branches
- `private/user-management` → Contains CFR Part 11 compliant user system with departments/roles

### Safety Aliases (Run these once to set up)
```bash
# Create safety aliases
git config --local alias.private-push 'push origin'
git config --local alias.public-push 'push public'
git config --local alias.private-commit '!git add . && git commit -m'
git config --local alias.safe-public '!git log public/main..HEAD --oneline'
```

## Architecture

- **Backend**: FastAPI (Python) with PostgreSQL
  - Async API with automatic documentation
  - SQLAlchemy ORM with audit trail support
  - JWT authentication with role-based access control
  - CFR Part 11 compliant with electronic signatures and audit logs

- **Frontend**: React + TypeScript + Vite + Ant Design
  - Component-based architecture
  - State management with Zustand
  - Protected routes and role-based UI

## Key Features

1. **Sample Workflow Management**
2. **User Management System** (Private branch)
   - Departments: BD, NGS Lab, BIS, PM, ACC
   - Role-based permissions
   - Electronic signatures
   - Audit trails
3. **Project Management**
4. **Storage Tracking**
5. **Queue Management System**

## Default Behavior
- All commits and pushes go to PRIVATE repository by default
- Explicitly specify when pushing to public repository
- Always review changes before pushing to public