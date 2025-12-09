# Changelog

All notable changes to VibeIA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-09

### Added

#### Core Platform
- 4-stage project wizard (Intent, Business Analysis, Technical Analysis, Preview)
- Multi-LLM support with user-configured API keys
  - Anthropic Claude (Claude 4.5 Sonnet)
  - OpenAI GPT-4
  - Google Gemini 2.0 Flash
- Encrypted API key storage (AES-256-GCM)
- Provider fallback mechanism with user preferences

#### Execution Engine
- Phase-by-phase, task-by-task execution
- Real-time WebSocket updates via Socket.io
- Pause/resume functionality
- Quality gates (lint, security, tests)
- Manual task detection with step-by-step guidance

#### Infrastructure
- Database recommendations (Neon, Supabase, PlanetScale, MongoDB Atlas)
- Deploy recommendations (Vercel, Netlify, Railway, Render, Fly.io)
- Cost calculator by project phase (MVP, Growth, Scale)
- Automated setup orchestration with rollback

#### Documentation
- README generation
- ADR (Architecture Decision Records) generation
- Changelog generation
- Mermaid diagrams (sequence, flow, ERD, class)
- OpenAPI 3.0.3 documentation

#### Security
- JWT authentication with refresh tokens
- Role-based access control
- Rate limiting
- Credential management
- Security scanning

#### Team Features
- Team creation and management
- Member invitations
- Role assignments (owner, admin, member, viewer)
- Git connections (GitHub, GitLab, Bitbucket)

#### Frontend
- Next.js 15 with App Router
- Responsive dashboard
- AI configuration banner for new users
- Settings page for LLM provider management
- Real-time execution monitoring
- Project detail views

#### Backend
- NestJS 11 API
- MongoDB with Mongoose ODM
- Socket.io for real-time events
- Comprehensive test suite (197+ backend, 83+ frontend tests)

### Infrastructure
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

---

## Versioning Guide

- **MAJOR** (x.0.0): Breaking changes, major rewrites
- **MINOR** (0.x.0): New features, backwards compatible
- **PATCH** (0.0.x): Bug fixes, small improvements

## Release Process

1. Develop features in `Develop` branch
2. Create PR to `master` when ready
3. After merge, create annotated tag: `git tag -a vX.Y.Z -m "Release notes"`
4. Push tag: `git push origin vX.Y.Z`
5. Update this CHANGELOG
