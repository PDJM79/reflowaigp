# Comparative Audit Analysis: ReflowAI Applications

**Date:** May 5, 2026  
**Coverage:** 4 applications audited end-to-end  
**Deliverables:** AUDIT reports for LogBooksHub, New-School, ReflowAI GP, Care-Nucleus

---

## Executive Summary

Four ReflowAI applications evaluated across a common framework (architecture, features, maturity, user patterns). Key findings:

| Dimension | LogBooksHub | New-School | ReflowAI GP | Care-Nucleus |
|-----------|-------------|-----------|-------------|--------------|
| **Maturity** | Production (private repo) | Production (public repo) | Production v2.0 (governance approved) | Pre-production (v0.0.0) |
| **Tech Stack** | React+Express+Supabase | React+Express+Supabase | React+Express+Neon | React+Supabase Edge Fn |
| **Primary Domain** | Compliance logbooks | School management | NHS GP practice | Care home compliance |
| **Edge Functions** | Inferred ~30 | Inferred ~20 | Implied 6 | Documented 74 |
| **Documentation** | Moderate | Extensive (15+ docs) | Comprehensive (45 KB guide) | Advanced (20+ docs) |
| **Test Coverage** | Component-based | Phase-based (3 complete) | 92% integration tests | Security audits (13 P0 flags) |
| **RBAC Tiers** | Multiple | Multiple | 9-tier RBAC | 5-tier RBAC |
| **Regulatory Focus** | HACCP-style | Academic calendar | NHS/CQC/CQI | CQC (care homes) |
| **AI Integration** | Minimal | None detected | Full Claude API | 7 Edge Functions |
| **Key Integration** | Email, PDF | Email, Vercel | Claude API, PDF | WhatsApp (Twilio) |

---

## 1. Architecture Patterns

### Shared Stack Foundation
All four applications share React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui, React Hook Form + Zod, React Query, Supabase Auth.

### Architectural Trends
1. **LogBooksHub & New-School**: Traditional Express.js (proven)
2. **ReflowAI GP**: Express + external AI (hybrid)
3. **Care-Nucleus**: Supabase Edge Functions (modern, serverless)

**Trend**: Moving toward serverless where possible.

---

## 2. Maturity Assessment

**LogBooksHub** (Production): Private repo, comprehensive docs, multi-module design, Stripe billing, mobile (Capacitor)

**New-School** (HIGHEST DOC MATURITY): Public repo, 15+ docs, multiple deployment targets, 3 complete phases, security audit Phase 0

**ReflowAI GP** (HIGHEST FEATURE MATURITY): v2.0.0 governance approval, 92% integration tests, 45 KB user guide, MFA + 9-tier RBAC

**Care-Nucleus** (HIGHEST ARCHITECTURAL SOPHISTICATION): 74 edge functions, 20+ security audit docs, 7 AI functions, serverless-first, but v0.0.0 with 13 P0 security flags

### Readiness Timeline
1. New-School: Ready
2. ReflowAI GP: Ready (v2.0 governance approved)
3. LogBooksHub: Ready (private production)
4. Care-Nucleus: 2-4 weeks (security remediation needed)

---

## 3. Feature Comparison Highlights

### Authentication
- **Winner**: ReflowAI GP (MFA + audit logging + 9-tier RBAC)

### Defect Management
- **Winner**: Care-Nucleus (WhatsApp integration for field reporting)

### AI/Automation
- **Winner**: Care-Nucleus (7 dedicated edge functions for AI)

### Integration Ecosystem
- LogBooksHub: Stripe (billing)
- New-School: Calendar sync (academic)
- ReflowAI GP: Anthropic Claude API
- Care-Nucleus: WhatsApp (Twilio)

---

## 4. Data Model Complexity

| Application | Estimated Tables | Complexity |
|-------------|-----------------|------------|
| LogBooksHub | ~25-30 | Medium |
| New-School | ~20-25 | Medium |
| ReflowAI GP | ~70+ | High (13 specialized modules) |
| Care-Nucleus | ~40-50 | High |

---

## 5. Security Posture

- **MFA + audit logging**: ReflowAI GP
- **Most comprehensive security audits**: Care-Nucleus (XSS, dependency, RLS, 20+ docs)
- **Authorization gaps**: Care-Nucleus has 13 documented P0 flags needing remediation

---

## 6. Regulatory Compliance Alignment

| Regulation | LogBooksHub | New-School | ReflowAI GP | Care-Nucleus |
|------------|------------|-----------|------------|--------------|
| HACCP | yes (primary) | yes (inferred) | yes | minimal |
| CQC | yes | yes | yes | yes (primary) |
| NHS standards | no | no | yes (primary) | no |
| Ofsted | no | yes | no | no |
| GDPR | implied | implied | implied | implied |

---

## 7. Deployment & Cost Analysis

### Estimated Monthly Cost (10 facilities, 50 users)

| Component | LogBooksHub | New-School | ReflowAI GP | Care-Nucleus |
|-----------|------------|-----------|------------|--------------|
| Database | $500-1000 | $500-1000 | $500-1000 | $500-1000 |
| Backend | $200-500 | $200-500 | $200-500 | N/A (Edge Fn) |
| Storage | $200-500 | $100-200 | $100-200 | $200-500 |
| Twilio | $0 | $0 | $0 | $100-300 |
| Claude API | $0 | $0 | $50-200 | $50-200 |
| **Total** | **$900-2000** | **$800-1700** | **$850-1900** | **$870-2100** |

---

## 8. Recommended Use Cases

- **LogBooksHub**: Care facilities, HACCP compliance, multi-contractor defect management
- **New-School**: K-12 schools, academic calendar integration
- **ReflowAI GP**: NHS GP practices, complex HR/training requirements
- **Care-Nucleus**: UK care homes, WhatsApp field reporting, AI-powered automation

---

## 9. Strategic Recommendations

### For ReflowAI Product Strategy

1. **Vertical Differentiation**: Each app serves a distinct compliance domain
2. **Shared Infrastructure**: Invest in common patterns (RLS, task generation, evidence capture, PDF exports)
3. **Architecture Convergence**: Move all systems toward Care-Nucleus model (serverless, GraphQL, AI, WhatsApp)
4. **Documentation as Differentiator**: Care-Nucleus's CLAUDE.md routine sets the standard
5. **Security Hardening**: Fix Care-Nucleus P0 flags; extend security audit pattern to other systems

### For Individual Application Roadmaps
- **LogBooksHub**: Stability + contractor UX improvements
- **New-School**: Mobile optimization + offline-first PWA
- **ReflowAI GP**: Publish v2.1 with AI enhancements
- **Care-Nucleus**: Security remediation -> beta launch

---

## Summary

Four ReflowAI applications demonstrate **mature, domain-specific compliance platforms** built on a shared technical foundation:

- **LogBooksHub**: Established multi-tenant platform for care and general facilities
- **New-School**: Reference implementation for educational management
- **ReflowAI GP**: Governance-approved enterprise system for healthcare providers
- **Care-Nucleus**: Next-generation serverless platform with AI automation and WhatsApp integration

**Key Insight**: Care-Nucleus represents the future direction (serverless + AI), while other applications provide proven, battle-tested implementations for their domains. Recommended investment: accelerate Care-Nucleus to production while maintaining LogBooksHub, New-School, and ReflowAI GP as stable revenue-generating systems.
