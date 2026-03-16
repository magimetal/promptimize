<!--
  fixture: real-derived
  source-class: skill
  origin: dev-frontend/SKILL.md
  snapshotted: 2026-03-15
  sanitized: yes
-->

---
name: dev-frontend
description: Applies Angular and TypeScript best practices to components, templates and services. Use it when writing angular frontend TypeScript code.
---

# Angular TypeScript Development

## Overview

To access modern angular pattern resources, typescript standards, component and service implementation resources, use this skill.

## Core Guidelines

### Modern Angular Patterns

Follow these critical rules when writing Angular code:

1. **Use ONLY modern APIs** - `inject()`, `input()`, `output()`, `signal()`, `computed()`, `effect()`, `linkedSignal()`, `viewChild()`, `viewChildren()`
2. **Use Control Flow syntax exclusively** - `@if`, `@for`, `@switch`, `@else` (never `*ngIf`, `*ngFor`, `*ngSwitch`)
3. **Delete legacy code immediately** - Any code containing `@Input()`, `@Output()`, `@ViewChild()`, `@HostListener()`, `ngClass`, or `CommonModule` imports must be deleted and rewritten
4. **Separate templates** - Use `templateUrl` with separate `.html` files, never inline templates
5. **Component design principles** - Components must be modular, reusable, self-contained, and single-responsibility

### TypeScript Standards

Follow these strict TypeScript rules:

1. **Strict equality** - Use `===` and `!==` (never `==` or `!=`)
2. **Modern array access** - Use `.at(-1)` for last item (never `[array.length - 1]`)
3. **Modern iteration** - Use `for...of` (never `.forEach()`)
4. **Optional chaining** - Use `?.` for safe property access
5. **Template literals** - Use template literals for string concatenation
6. **Const by default** - Use `const` for all single-assignment variables
7. **Type safety** - Never use `any` (use `unknown` or specific types)
8. **Type-only imports** - Use `import type` for all type imports
9. **Const assertions** - Use `as const` for literal types
10. **No prohibited features** - Never use `var`, `eval()`, `with`, `arguments`, enums, namespaces, non-null assertions (`!`), or `@ts-ignore`

### Separation of Concerns

Extract non-UI logic from components:

- **UI logic only** - Components should only contain UI-related logic
- **Extract utilities** - Move pure functions and business logic to `/libs/ng/utils` (Angular-specific) or `/libs/shared/utils` (universal)
- **Service layer** - Complex business logic belongs in services (inject via `inject()`)

## Component Implementation Patterns

### Input/Output Pattern

```typescript
import { Component, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-user-card',
  standalone: true,
  templateUrl: './user-card.component.html',
})
export class UserCardComponent {
  // Inputs using input()
  readonly user = input.required<User>();
  readonly showAvatar = input<boolean>(true);

  // Outputs using output()
  readonly userClicked = output<User>();
  readonly deleteRequested = output<string>();

  // Derived state
  readonly displayName = computed(
    () => `${this.user().firstName} ${this.user().lastName}`,
  );

  handleClick(): void {
    this.userClicked.emit(this.user());
  }

  handleDelete(): void {
    this.deleteRequested.emit(this.user().id);
  }
}
```

### State Management Pattern

```typescript
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  templateUrl: './counter.component.html',
})
export class CounterComponent {
  // Reactive state with signal()
  readonly count = signal(0);
  readonly step = signal(1);

  // Derived state with computed()
  readonly doubleCount = computed(() => this.count() * 2);
  readonly isEven = computed(() => this.count() % 2 === 0);

  // Side effects with effect()
  constructor() {
    effect(() => {
      console.log(`Count changed to: ${this.count()}`);
    });
  }

  increment(): void {
    this.count.update((c) => c + this.step());
  }

  decrement(): void {
    this.count.update((c) => c - this.step());
  }

  reset(): void {
    this.count.set(0);
  }
}
```

### Service Injection Pattern

```typescript
import { Component, inject, signal, OnInit } from '@angular/core';
import { UserService } from '@ng/services';
import type { User } from '@shared/types';

@Component({
  selector: 'app-user-list',
  standalone: true,
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  // Inject services using inject()
  private readonly userService = inject(UserService);

  readonly users = signal<User[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const users = await this.userService.getAll();
      this.users.set(users);
    } catch (err) {
      console.error('Failed to load users:', err);
      this.error.set('Unable to load users. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

### Dynamic Styling Pattern

```typescript
import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.component.html',
})
export class ButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'ghost'>('primary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input<boolean>(false);
  readonly customClass = input<string>('');

  // Use computed() for class logic (NEVER getters)
  readonly computedClasses = computed(() => {
    // Object lookup pattern for variants
    const variantClass = {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white',
      secondary: 'bg-secondary-600 hover:bg-secondary-700 text-white',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-900',
    }[this.variant()];

    const sizeClass = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }[this.size()];

    const disabledClass = this.disabled()
      ? 'opacity-50 cursor-not-allowed'
      : '';

    // Concatenate with template literals, customClass() at end
    return `${variantClass} ${sizeClass} ${disabledClass} ${this.customClass()}`;
  });
}
```

```html
<!-- Template with [class] binding -->
<button
  [class]="computedClasses()"
  [disabled]="disabled()"
  class="rounded-md font-medium transition-colors"
>
  <ng-content></ng-content>
</button>
```

### View Query Pattern

```typescript
import {
  Component,
  viewChild,
  viewChildren,
  ElementRef,
  AfterViewInit,
} from '@angular/core';

@Component({
  selector: 'app-form',
  standalone: true,
  templateUrl: './form.component.html',
})
export class FormComponent implements AfterViewInit {
  // Single view query using viewChild()
  readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  // Multiple view queries using viewChildren()
  readonly formFields = viewChildren<ElementRef<HTMLInputElement>>('formField');

  ngAfterViewInit(): void {
    // Access element after view init
    this.inputElement()?.nativeElement.focus();

    // Access multiple elements
    console.log(`Found ${this.formFields().length} form fields`);
  }
}
```

```html
<input #nameInput type="text" placeholder="Name" />
<input #formField type="email" placeholder="Email" />
<input #formField type="tel" placeholder="Phone" />
```

## Control Flow Templates

### Conditionals

```html
<!-- Modern control flow -->
@if (user()) {
    <div class="user-info">
        <h2>{{ user().name }}</h2>
        <p>{{ user().email }}</p>
    </div>
} @else {
    <div class="empty-state">
        <p>No user selected</p>
    </div>
}

<!-- With nested conditions -->
@if (loading()) {
    <div class="spinner">Loading...</div>
} @else if (error()) {
    <div class="error">{{ error() }}</div>
} @else {
    <div class="content">{{ data() }}</div>
}
```

### Loops

```html
<!-- Modern loop with track -->
@for (item of items(); track item.id) {
    <div class="item">
        <h3>{{ item.name }}</h3>
        <p>{{ item.description }}</p>
    </div>
} @empty {
    <div class="empty-state">No items found</div>
}

<!-- With index -->
@for (user of users(); track user.id; let idx = $index) {
    <div class="user">
        <span>{{ idx + 1 }}.</span>
        <span>{{ user.name }}</span>
    </div>
}
```

### Switch Statements

```html
<!-- Modern switch -->
@switch (status()) { 
    @case ('loading') {
        <div class="status-loading">Loading...</div>
    }
    @case ('success') {
        <div class="status-success">Success!</div>
    }
    @case ('error') {
        <div class="status-error">Error occurred</div>
    }
    @default {
        <div class="status-idle">Ready</div>
    } 
}
```

## Error Handling

Always implement comprehensive error handling:

```typescript
// ✅ Good error handling
async function fetchData(): Promise<void> {
  try {
    const data = await this.service.getData();
    this.data.set(data);
  } catch (error) {
    // Log with context
    console.error('Failed to fetch data from API:', error);

    // Set user-friendly error message
    this.errorMessage.set('Unable to load data. Please try again later.');

    // Optionally report to error tracking service
    this.errorService.reportError(error);
  }
}

// ❌ Bad - silent error swallowing (PROHIBITED)
async function fetchData(): Promise<void> {
  try {
    const data = await this.service.getData();
    this.data.set(data);
  } catch (error) {
    // Silent failure - never do this
  }
}
```

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

## Detailed References

For comprehensive details on patterns and standards:

### Angular Patterns Reference

See `./references/angular-patterns.md` for:

- Complete modern API examples
- Legacy pattern migration guides
- Component structure best practices
- Dynamic styling detailed patterns
- Multiple computed signals usage
- Error handling patterns

### TypeScript Standards Reference

See `./references/typescript-standards.md` for:

- Complete TypeScript rule set with examples
- Type safety patterns and type guards
- Prohibited features and alternatives
- Import and export best practices
- Const assertion usage
- Comprehensive checklist

## Quick Checklist

Before marking Angular/TypeScript work complete, verify:

**Angular:**

- [ ] Using only modern APIs (inject, input, output, signal, computed, etc.)
- [ ] Using control flow syntax (@if, @for, @switch)
- [ ] No legacy code (no @Input, @Output, *ngIf, *ngFor, CommonModule)
- [ ] Separate template files (templateUrl, not inline)
- [ ] Component is modular, reusable, self-contained, single-responsibility
- [ ] Non-UI logic extracted to utils
- [ ] Error handling is comprehensive with context
- [ ] Dynamic styling uses computed() with [class] binding

**TypeScript:**

- [ ] Using === and !== (never == or !=)
- [ ] Using .at(-1) for array access
- [ ] Using for...of (never .forEach())
- [ ] Using optional chaining (?.)
- [ ] Using template literals
- [ ] Using const for single-assignment
- [ ] No any type (using unknown or specific types)
- [ ] Using import type for type imports
- [ ] Using as const for literals
- [ ] No prohibited features (var, eval, enums, namespaces, !, @ts-ignore)
- [ ] All TypeScript errors resolved
- [ ] All unused imports removed

## Common Refactoring Tasks

### Legacy to Modern Migration

When encountering legacy code:

1. **Identify legacy patterns** - Look for @Input(), @Output(), *ngIf, *ngFor, ngClass, CommonModule
2. **Delete and rewrite** - Don't try to patch, completely rewrite with modern APIs
3. **Extract utilities** - Move business logic to utils during migration
4. **Test thoroughly** - Ensure behavior matches after refactor

### Class Binding Migration

```typescript
// ❌ Legacy getter pattern - DELETE
get buttonClasses(): string {
  return this.isActive ? 'active' : 'inactive';
}

// ✅ Modern computed signal pattern
readonly buttonClasses = computed(() =>
  this.isActive() ? 'active' : 'inactive'
);
```

### Service Injection Migration

```typescript
// ❌ Legacy constructor injection
constructor(private userService: UserService) {}

// ✅ Modern inject() pattern
private readonly userService = inject(UserService);
```

## Resources

This skill includes reference documentation that can be loaded for detailed guidance:

- **references/angular-patterns.md** - Comprehensive Angular patterns and examples
- **references/typescript-standards.md** - Complete TypeScript standards and rules

Load these references when you need detailed examples or encounter edge cases.
