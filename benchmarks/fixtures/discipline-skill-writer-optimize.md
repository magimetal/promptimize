<!--
  fixture: real-derived
  source-class: skill
  origin: writer-optimize/SKILL.md
  snapshotted: 2026-03-15
  sanitized: yes
-->

---
name: writer-optimize
description: This skill should be used when optimizing documentation for AI/LLM comprehension and token efficiency. Use when the user requests to reduce token count, optimize docs for AI consumption, improve documentation structure, or make documentation more concise while preserving technical accuracy. Also use when users ask to optimize markdown files, technical documentation, or configuration files for better AI parsing.
---

# Documentation Optimizer

## Overview

This skill optimizes documentation for minimal token usage while preserving 100% of critical information. It restructures content for maximum AI/LLM comprehension using hierarchical organization, structured formats, and efficient markdown features.

## Core Principles

**Token Efficiency**: Reduce token count by 20-30% minimum without information loss.

**Information Preservation**: Maintain 100% of critical information, technical details, warnings, examples, and context.

**Structural Clarity**: Use hierarchical organization (headings, lists, tables) over flat prose.

**Semantic Accuracy**: Never alter meaning, introduce ambiguity, or sacrifice clarity for brevity.

## Workflow

### 1. Analysis Phase

Read all documentation files completely before optimization. For each file, identify:

- Redundant content and repetition
- Verbose explanations that can be condensed
- Unstructured prose convertible to lists/tables
- Opportunities for structured formats (XML, YAML, JSON)
- Areas where markdown features improve efficiency

### 2. Optimization Patterns

**✅ Compliant Optimization:**
- Original: "You should consider using structured formats when possible because they help with parsing"
- Optimized: "Use structured formats (XML, YAML, JSON) for better parsing"

**❌ Non-Compliant (Information Loss):**
- Original: "Authentication requires both username and password validation"
- Bad: "Auth needs validation" ← Lost critical detail

**✅ Technical Preservation:**
- Original: "The API endpoint /api/v1/users accepts POST requests with JSON payload containing: username (string, required), email (string, required), role (enum: 'admin'|'user', optional)"
- Optimized: "POST /api/v1/users | Payload: username (string, required), email (string, required), role ('admin'|'user', optional)"

### 3. Optimization Rules

Apply these transformations:

**Structure:**
- Convert prose paragraphs to bullet points or numbered lists
- Use tables for structured data or comparisons
- Create hierarchical headings (H1 → H2 → H3)
- Use collapsible sections (`<details>`) for optional content
- Prefer code blocks with language tags over inline code

**Language:**
- Remove filler words ("basically", "simply", "just", "actually")
- Use imperative/infinitive form ("Use X" not "You should use X")
- Eliminate conversational tone and redundant explanations
- Use active voice over passive voice
- Condense multi-sentence explanations to single sentences

**Format:**
- Use structured formats (XML, YAML, JSON) for rules, configurations, or procedural instructions
- Use markdown tables for comparisons or multi-attribute data
- Use definition lists for term definitions
- Use blockquotes for important notes/warnings
- Tag code blocks with language identifiers

### 4. Preservation Requirements

**NEVER remove or alter:**
- Examples and code snippets
- Technical specifications or parameters
- Warnings, important notes, or critical context
- API endpoints, function signatures, or schemas
- Error messages or troubleshooting information
- Version numbers or compatibility information

**NEVER introduce:**
- Ambiguity or vague language
- Semantic meaning changes
- Technical inaccuracies
- Incomplete instructions

### 5. Review and Application

Before applying changes:

1. Show comparison for each file:
   - Original token/size estimate
   - Optimized token/size estimate
   - Key changes made
   - Percentage reduction achieved
   - Confirmation that 100% of critical information preserved

2. Wait for user approval before applying changes

3. Apply optimizations to files

4. Summarize results:
   - Total token reduction achieved
   - Files processed
   - Patterns eliminated
   - Clarity maintained (yes/no with justification)

## Example Transformations

### Before (125 tokens):
```
The system provides several different methods that you can use to configure the authentication behavior. When you're setting up authentication, you should make sure to configure both the username validation and the password validation because both of these are required for proper security. The username must be a string type and it's required, while the password should also be a string and is also required. Additionally, you can optionally configure the role, which can be either 'admin' or 'user'.
```

### After (52 tokens, 58% reduction):
```
## Authentication Configuration

Required fields:
- `username` (string, required) - User identifier
- `password` (string, required) - User credential
- `role` ('admin'|'user', optional) - Access level
```

## Anti-Patterns

**❌ Clarity Sacrifice:**
- "Reduce tokens at all costs" ← Violates preservation requirement
- ✅ "Reduce tokens while preserving 100% clarity"

**❌ Incomplete Analysis:**
- Optimizing without reading entire file first
- Skipping comparison before applying changes
- Applying changes without user approval

**❌ Information Loss:**
- Removing examples to save tokens
- Condensing technical specs into vague descriptions
- Eliminating warnings or edge cases

**❌ Structure Degradation:**
- Keeping flat prose instead of hierarchical structure
- Not using markdown features (tables, lists, code blocks)
- Avoiding structured formats when appropriate
