<!--
  fixture: real-derived
  source-class: skill
  origin: dev-backend-hono/SKILL.md
  snapshotted: 2026-03-15
  sanitized: yes
-->

---
name: dev-backend-hono
description: Applies Hono and Bun best practices to API routes, middleware, validation, SSE, and testing in the terminus-server. Use it when writing or modifying any backend TypeScript code in apps/terminus-server.
---

# Hono Backend API Development

This skill applies to all backend TypeScript code under `apps/terminus-server/`. It blends official Hono best practices with terminus-server codebase conventions. Treat every rule here as authoritative. When a terminus convention conflicts with a generic Hono pattern, terminus wins.

## Overview

- **Runtime:** Bun + Hono. Web Standard `Request`/`Response`. No Node.js `req`/`res`.
- **Entry:** `src/index.ts` -> `src/app.ts`. Domain routes in `src/<domain>/<domain>-routes.ts`.

## Core Architecture

### App Composition

1. `app.ts` is the **only** composition root. Mount global middleware, health route, and domain routers here.
2. Entry (`index.ts`) exports `{ port, fetch: app.fetch, idleTimeout: 120 }` - Bun detects the default export shape.
3. Domain routes: each domain has one `const xxxRoutes = new Hono()` exported from `src/<domain>/<domain>-routes.ts`. Paths in domain files are relative to the mount point.
4. Register domain router AFTER all routes are defined - `app.route()` copies routes at call time. Sub-routes added after `app.route()` are NOT included.
5. Global middleware goes BEFORE `app.route()` calls.

```typescript
import { jsonOk } from "@terminus/utils";
import { Hono } from "hono";

import { chatRoutes } from "./chat/chat-routes.js";
import { requestLogger } from "./middleware/request-logger.js";

const app = new Hono();
app.use("*", requestLogger()); // middleware BEFORE routes

app.get("/health", (c) =>
  jsonOk(c, { status: "ok", uptime: process.uptime() }),
);

app.route("/chat", chatRoutes); // mount AFTER all routes defined

export { app };
```

```typescript
import { app } from "./app.js";

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
  idleTimeout: 120,
};
```

### Domain Route Files

1. Each domain has exactly one route file: `src/<domain>/<domain>-routes.ts`.
2. Export a `const xxxRoutes = new Hono()`. Do NOT export a default.
3. Paths in domain files are relative to their mount point (e.g., if mounted at `/chat`, a handler for `/chat/sessions` is written as `chatRoutes.get("/sessions", ...)`).
4. Do NOT add new routes directly in `app.ts`. Create a domain route file.
5. Do NOT create controller classes - this loses Hono's type inference on path params.

## Route Handlers

### Canonical Handler Pattern

1. All handlers are inline async arrow functions passed directly to the HTTP method.
2. Always follow this order: **validate -> business logic -> respond**.
3. Never throw for expected failures. Return `ApiResult<T>`.
4. Always use `jsonOk` and `jsonError` from `@terminus/utils`. Never use `c.json()` directly.

```typescript
import { jsonError, jsonOk, validateJson } from "@terminus/utils";
import { Hono } from "hono";
import { z } from "zod";

export const widgetRoutes = new Hono();

const createWidgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["small", "large"]),
});

widgetRoutes.post("/widgets", async (c) => {
  // 1. Validate input
  const result = await validateJson(c, createWidgetSchema);
  if (!result.ok) {
    return jsonError(
      c,
      result.error.code,
      result.error.message,
      400,
      result.error.details,
    );
  }

  // 2. Business logic
  const createResult = createWidget(result.data);
  if (!createResult.ok) {
    const status = createResult.error.code === "WIDGET_CONFLICT" ? 409 : 500;
    return jsonError(
      c,
      createResult.error.code,
      createResult.error.message,
      status,
    );
  }

  // 3. Return success
  return jsonOk(c, createResult.data, 201);
});
```

```typescript
widgetRoutes.get("/widgets/:widgetId", (c) => {
  const widgetId = c.req.param("widgetId");
  const widget = getWidget(widgetId);
  if (!widget) {
    return jsonError(
      c,
      "WIDGET_NOT_FOUND",
      `Widget ${widgetId} not found`,
      404,
    );
  }
  return jsonOk(c, widget);
});
```

```typescript
const listQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 20))
    .refine(
      (val) => !Number.isNaN(val) && val >= 1,
      "limit must be a positive integer",
    )
    .transform((val) => Math.min(val, 200)),
});

widgetRoutes.get("/widgets", (c) => {
  const queryResult = validateQuery(c, listQuerySchema);
  if (!queryResult.ok) {
    return jsonError(
      c,
      queryResult.error.code,
      queryResult.error.message,
      400,
      queryResult.error.details,
    );
  }
  const widgets = listWidgets(queryResult.data.limit);
  return jsonOk(c, { widgets });
});
```

### Response Helpers

| Helper      | Signature                                             | Wraps as                                            |
| ----------- | ----------------------------------------------------- | --------------------------------------------------- |
| `jsonOk`    | `jsonOk(c, data, status = 200)`                       | `{ ok: true, data }`                                |
| `jsonError` | `jsonError(c, code, message, status = 400, details?)` | `{ ok: false, error: { code, message, details? } }` |

- `200` - success (read/update)
- `201` - created
- `400` - validation or bad input
- `404` - not found
- `409` - conflict (duplicate, in-use)
- `500` - unexpected server error
- `502` - upstream failure

Error code conventions: SCREAMING_SNAKE_CASE, domain-prefixed (e.g., `WIDGET_NOT_FOUND`, `SESSION_NOT_FOUND`, `VALIDATION_ERROR`).

## Validation

### JSON Body Validation

1. Use `validateJson(c, schema)` from `@terminus/utils` for JSON bodies. NEVER manually parse `c.req.json()`.
2. Zod schemas are defined in `{domain}-schemas.ts` files and imported by route handlers.
3. Branch on `result.ok` immediately. Pass `result.error.details` as 4th arg to `jsonError` for validation errors.
4. For query strings, use `validateQuery(c, schema)` (synchronous - no `await`).
5. Query schemas MUST use string transforms for numeric values (query params are always strings).

Code example already shown above in route handler section - reference it explicitly: _"See the canonical handler pattern in the Route Handlers section."_

- `INVALID_JSON` - malformed request body
- `VALIDATION_ERROR` - body parsed but schema failed; includes `details.issues`

## Middleware

### Writing Custom Middleware

1. Use a factory function that returns `MiddlewareHandler`. Import `Context`, `MiddlewareHandler`, `Next` from `hono`.
2. Augment `ContextVariableMap` in `hono` module to type context variables.
3. Use `c.set(key, value)` to attach request-scoped state. Use `c.get(key)` or `c.var.key` to read it downstream.
4. Never wrap `await next()` in try/catch for error swallowing - Hono catches errors internally. Use `try/finally` for cleanup (e.g., timing).
5. Middleware MUST be registered BEFORE route handlers in `app.ts`.

```typescript
import type { Context, MiddlewareHandler, Next } from "hono";

// Augment ContextVariableMap for type-safe context variable access
declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    log: RequestLogger;
  }
}

export function requestLogger(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const requestId = crypto.randomUUID();
    const startTime = performance.now();

    c.set("requestId", requestId);
    // ... setup log ...

    try {
      await next(); // never try/catch for error swallowing
    } finally {
      const durationMs = Math.round(performance.now() - startTime);
      // log completion
    }
  };
}
```

```typescript
widgetRoutes.get("/widgets", (c) => {
  const requestId = c.get("requestId"); // typed via ContextVariableMap
  const log = c.var.log; // equivalent dot-access syntax
  log.info({ requestId }, "listing widgets");
  return jsonOk(c, { widgets: [] });
});
```

## Error Handling

1. **NEVER throw for expected failures.** Return `ApiResult<T>` discriminated unions from all service functions.
2. `ApiResult<T>` shape: success `{ ok: true, data: T }`, failure `{ ok: false, error: { code, message, details? } }`.
3. Map error codes to HTTP status in the route handler (not in the service). Use explicit `if/else` or a local status variable.
4. There is no global `app.onError()` handler in terminus-server. Do not add one.
5. For streaming (SSE), errors are emitted as typed SSE events - they are NOT caught by `app.onError()`. Handle them inside the stream callback.
6. Service functions that can partially succeed should return typed result objects - not throw conditionally.

```typescript
const updateResult = updateWidget(widgetId, result.data);
if (!updateResult.ok) {
  const statusCode =
    updateResult.error.code === "WIDGET_NOT_FOUND"
      ? 404
      : updateResult.error.code === "VALIDATION_ERROR"
        ? 400
        : 409;
  return jsonError(
    c,
    updateResult.error.code,
    updateResult.error.message,
    statusCode,
  );
}
```

## SSE (Server-Sent Events)

### Two SSE Patterns

Explain both: request-scoped vs. broadcast channel.

**Pattern 1: Request-scoped SSE stream** - `streamSSE` from `hono/streaming`

Use when: a client connects and receives events for the duration of a single request (e.g., AI response streaming).

```typescript
import { streamSSE } from "hono/streaming";

chatRoutes.post("/stream", async (c) => {
  // ... validate, setup ...

  return streamSSE(c, async (sseStream) => {
    for await (const event of aiStream.events) {
      await sseStream.writeSSE({
        event: "chat",
        data: JSON.stringify(event),
      });
    }
    // Cleanup after stream ends
  });
  // Note: errors inside streamSSE are NOT caught by app.onError()
});
```

```typescript
return streamSSE(c, async (sseStream) => {
  sseStream.onAbort(() => {
    // client disconnected - cleanup resources here
  });
  // ... write events ...
});
```

**Pattern 2: Broadcast SSE channel** - `createSseChannel()` from `@terminus/utils`

Use when: server needs to push events to multiple connected clients (e.g., a global event bus).

```typescript
import { createSseChannel } from "@terminus/utils";

// Module-level singleton - one per concern
export const eventsChannel = createSseChannel<EventType>();

// Registration route
app.get("/events", (c) => eventsChannel.connect(c));

// Broadcasting from anywhere
eventsChannel.broadcast({ type: "widget-created", data: widget });
```

1. Use `streamSSE` for per-request streams.
2. Use `createSseChannel()` for broadcast. One singleton per concern.
3. Typed events via discriminated union types.
4. Streaming errors must be handled inside the stream callback - do NOT rely on `app.onError()`.

## Service & Store Layer

1. No classes, no dependency injection. Use pure functions and module-level state.
2. All mutable module state (stores, caches) uses `let` at module level for testability via reset functions.
3. For JSON file persistence, ALWAYS use `loadJsonStore`/`saveJsonStore` from `src/shared/json-store.ts`. NEVER duplicate the load/save/atomic-write logic.
4. `loadJsonStore` auto-creates the file with defaults if absent. Validates with Zod on load. Returns `ApiResult<T>`.
5. Export `initXxxDir(dir: string)` and `clearXxx()` functions for test isolation.

```typescript
import { loadJsonStore, saveJsonStore } from "../shared/json-store.js";
import type { ApiResult } from "@terminus/models";
import { z } from "zod";

const widgetSchema = z.object({
  /* ... */
});
type Widget = z.infer<typeof widgetSchema>;

const storeSchema = z.object({ widgets: z.array(widgetSchema) });
type WidgetStore = z.infer<typeof storeSchema>;

// Module-level mutable path (overridden in tests)
let storeDir = "/default/data/path";

const storeOpts = {
  filePath: () => `${storeDir}/widgets.json`,
  backupPath: () => `${storeDir}/widgets.json.bak`,
  schema: storeSchema,
  createDefault: (): WidgetStore => ({ widgets: [] }),
  storeName: "widget store",
};

// Test helpers
export function initWidgetsDir(dir: string): void {
  storeDir = dir;
}
export function clearWidgets(): void {
  /* reset in-memory cache if any */
}

// Public API - pure functions, return ApiResult
export function createWidget(data: { name: string }): ApiResult<Widget> {
  const loadResult = loadJsonStore(storeOpts);
  if (!loadResult.ok) return loadResult;

  const widget: Widget = { id: crypto.randomUUID(), ...data };
  const updated = { widgets: [...loadResult.data.widgets, widget] };

  const saveResult = saveJsonStore(storeOpts, updated);
  if (!saveResult.ok) return saveResult;

  return { ok: true, data: widget };
}
```

## Testing

1. Use `bun:test` only. Imports: `{ describe, test, expect, beforeEach, afterEach, afterAll }` from `"bun:test"`. Use `test` not `it`.
2. Test files are colocated: `*.test.ts` beside the source file. Never `*.spec.ts`.
3. Use `app.request(path, options?)` for integration tests - no HTTP server needed.
4. **ALWAYS set `Content-Type: application/json`** for POST/PATCH/PUT requests with a JSON body. Missing this header causes validation to return `INVALID_JSON`.
5. No mock frameworks. Use plain objects and factory functions for mocks.
6. Call `initXxxDir(tempDir)` + `clearXxx()` in `beforeEach` for store isolation. Use `fs.mkdtempSync` for temp dirs.
7. Assert `result.ok` branch first. Narrow with `if` before deep property assertions.
8. Tests cover: happy path, validation errors (400), not-found (404), conflict (409), and any business logic branches.

```typescript
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { app } from "./app";
import { clearWidgets, initWidgetsDir } from "./widgets/widget-store";

const tempDirs: string[] = [];

beforeEach(() => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "widget-test-"));
  tempDirs.push(tempDir);
  initWidgetsDir(tempDir);
  clearWidgets();
});

afterAll(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("POST /widgets", () => {
  test("creates a widget and returns 201", async () => {
    const res = await app.request("/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // REQUIRED
      body: JSON.stringify({ name: "My Widget", type: "small" }),
    });

    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.ok).toBe(true); // check ok branch first
    expect(body.data.name).toBe("My Widget"); // then narrow
    expect(body.data.id).toBeDefined();
  });

  test("returns 400 for missing name", async () => {
    const res = await app.request("/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "small" }),
    });

    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("returns 404 for unknown widget", async () => {
    const fakeId = crypto.randomUUID();
    const res = await app.request(`/widgets/${fakeId}`);

    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("WIDGET_NOT_FOUND");
  });
});
```

## Code Style & Imports

1. **Files:** kebab-case (`widget-routes.ts`, `widget-store.ts`).
2. **Types:** PascalCase. **Values/functions:** camelCase.
3. **DTOs:** suffix `Dto`, file suffix `.dto.ts`, located in `@terminus/models`.
4. **`interface`** for object shapes. **`type`** for unions and function contracts.
5. **Explicit return types** on all exported functions.
6. **`import type`** for type-only imports (`verbatimModuleSyntax` enforced).
7. **Cross-package imports:** use path aliases (`@terminus/models`, `@terminus/utils`). No deep imports.
8. **Intra-package imports:** relative paths with `.js` extension (even in `.ts` source files).
9. **New shared modules** MUST be re-exported from the lib barrel `src/index.ts` in the same change.
10. Do NOT use `any`. Use `unknown` or specific types.
11. Do NOT use `var`. `const` by default; `let` only for reassigned values.

```typescript
// ✅ Correct imports
import type { WidgetDto } from "@terminus/models";
import { jsonOk, validateJson } from "@terminus/utils";
import { Hono } from "hono";
import { z } from "zod";

import { createWidget } from "./widget-store.js"; // .js extension on relative import

// ❌ Wrong
import { WidgetDto } from "@terminus/models"; // missing import type
import { createWidget } from "./widget-store"; // missing .js extension
import { jsonOk } from "@terminus/utils/src/http/json-ok"; // deep import
```

## Anti-Patterns

| Anti-Pattern                                      | Why                                                        | Correct Alternative                                               |
| ------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `c.json(data)` directly in handlers               | Bypasses `ApiResult` envelope; inconsistent response shape | `jsonOk(c, data, status)`                                         |
| `const r = await c.req.json()` manually           | No validation, no error handling                           | `validateJson(c, schema)`                                         |
| Adding routes directly in `app.ts`                | Violates domain separation                                 | Create `src/<domain>/<domain>-routes.ts`, mount via `app.route()` |
| `app.route()` before sub-router has routes        | Routes added after `app.route()` are silently not included | Mount AFTER all routes are defined                                |
| Throwing errors for expected failures             | Forces callers to try/catch; breaks `ApiResult` contract   | Return `{ ok: false, error: { code, message } }`                  |
| Controller classes for route handlers             | Loses Hono path param type inference                       | Inline handlers or `factory.createHandlers()`                     |
| `try/catch` wrapping `next()` in middleware       | Hono handles errors internally; swallows context           | `try/finally` for cleanup only                                    |
| `app.onError()` for streaming errors              | `streamSSE` errors are NOT caught by `app.onError()`       | Handle errors inside the `streamSSE` callback                     |
| Duplicate `loadData`/`saveData` persistence logic | Creates inconsistency, skips atomic writes                 | `loadJsonStore`/`saveJsonStore` from `src/shared/json-store.ts`   |
| Missing `Content-Type: application/json` in tests | Causes `INVALID_JSON` instead of testing real logic        | Always set header on requests with a body                         |
| `it()` in tests                                   | Wrong - codebase uses `test()` only                        | `test()` from `bun:test`                                          |
| `*.spec.ts` test files                            | Wrong convention                                           | `*.test.ts` colocated beside source                               |
| WebSockets                                        | Prohibited; terminus uses SSE only                         | `streamSSE` or `createSseChannel()`                               |

## References

```
Key files to read when working on terminus-server:

- apps/terminus-server/src/app.ts                    - composition root
- apps/terminus-server/src/chat/chat-routes.ts       - canonical route file (full lifecycle)
- apps/terminus-server/src/workplace/workplace-routes.ts - multi-resource, query params
- apps/terminus-server/src/middleware/request-logger.ts  - middleware + ContextVariableMap
- apps/terminus-server/src/shared/json-store.ts      - persistence helpers
- apps/terminus-server/src/app.test.ts               - integration test patterns
- libs/utils/src/http/json-ok.ts                     - jsonOk implementation
- libs/utils/src/http/json-error.ts                  - jsonError implementation
- libs/utils/src/validation/validate-json.ts         - validateJson implementation
- AGENTS.md (root)                                   - monorepo conventions
- apps/terminus-server/AGENTS.md                     - server-specific rules
```

## Quick Checklist

Before marking backend work complete, verify:

**Routes:**

- [ ] Route file in `src/<domain>/<domain>-routes.ts` (not in `app.ts`)
- [ ] Domain router mounted via `app.route()` in `app.ts` AFTER all routes defined
- [ ] All handlers follow: validate -> business logic -> respond
- [ ] Path params extracted with `c.req.param("paramName")`
- [ ] No `c.json()` - always `jsonOk()` / `jsonError()`

**Validation:**

- [ ] JSON bodies validated with `validateJson(c, schema)` (async, awaited)
- [ ] Query strings validated with `validateQuery(c, schema)` (sync, no await)
- [ ] Zod schemas defined in `{domain}-schemas.ts`, imported by route file
- [ ] Query schemas use string transforms for numeric params
- [ ] `result.error.details` passed as 4th arg to `jsonError` for validation errors

**Error Handling:**

- [ ] No throw for expected failures - returning `ApiResult<T>`
- [ ] Error codes are SCREAMING_SNAKE_CASE
- [ ] HTTP status codes mapped in route handler (not in service)
- [ ] Streaming errors handled inside `streamSSE` callback

**Middleware:**

- [ ] Factory function pattern: `export function myMiddleware(): MiddlewareHandler`
- [ ] `ContextVariableMap` augmented for any new context variables
- [ ] Middleware registered before `app.route()` calls in `app.ts`
- [ ] `try/finally` only (not `try/catch`) around `await next()`

**Persistence:**

- [ ] Using `loadJsonStore`/`saveJsonStore` (not hand-rolled load/save)
- [ ] `initXxxDir()` and `clearXxx()` exported for test isolation

**Testing:**

- [ ] `bun:test` only: `test()` not `it()`
- [ ] File is `*.test.ts` colocated beside source (not `*.spec.ts`)
- [ ] `app.request()` for integration tests (no HTTP server)
- [ ] `Content-Type: application/json` set on all POST/PATCH/PUT requests
- [ ] `beforeEach` calls `initXxxDir(tempDir)` + `clearXxx()` for store isolation
- [ ] `afterAll` cleans up temp dirs
- [ ] Tests check happy path + 400 + 404 + conflict branches

**Code Style:**

- [ ] Files: kebab-case
- [ ] `import type` for type-only imports
- [ ] Relative imports use `.js` extension
- [ ] Cross-package: `@terminus/models`, `@terminus/utils` (no deep imports)
- [ ] Explicit return types on all exported functions
- [ ] New shared modules re-exported from lib barrel `src/index.ts`
- [ ] No `any`, no `var`, no WebSockets
