# DESIGN.md

This document explains the problems identified in the original service, what was changed in this refactor, key design decisions and alternatives, and what’s still missing for a production-grade system.

## What I identified (issues in the original code)

### Slow and unreliable request path
- **Synchronous external calls inside API handlers** (email/push/analytics/CRM/revenue, etc.) made `POST /user/signup` and `POST /purchase/complete` slow and failure-prone.
- **One failure breaks the whole request**: if any external dependency times out or fails, the API returns an error even when the core action (e.g., saving a purchase) could have succeeded.
- **No retry strategy**: transient failures were not retried in a controlled way, and retrying the whole HTTP request risks duplicate side effects.

### No idempotency for purchases
- `POST /purchase/complete` is a classic endpoint that clients retry (network failures, mobile app backgrounding, payment confirmation uncertainty).
- Without idempotency, retries can create **duplicate purchases** and trigger duplicate downstream side effects.

### Watch event “firehose”
- Watch progress events can be very high volume (every few seconds per active viewer).
- Sending every event downstream leads to:
  - **load spikes** and unnecessary cost,
  - repeated writes for the same `(userId, contentId)` pair,
  - poor reliability if the external analytics sink is slow.

### Weak validation & observability
- Inconsistent request validation results in bad data entering the system.
- Logs were not structured enough to support debugging and tracing (e.g., request correlation, consistent event names).

## What I changed and why (key decisions)

### 1) Move external side effects to background jobs (BullMQ)
**Goal**: keep APIs fast and make side effects reliable.

- Created BullMQ queues in `src/queues/queues.js`:
  - `user-side-effects`
  - `purchase-side-effects`
  - `watch-flush`
- API handlers now do the minimum synchronous work:
  - validate input,
  - persist to a mock DB (in-memory module),
  - enqueue a job for external side effects.
- Workers in `src/workers/startWorkers.js`:
  - execute side effects,
  - rely on BullMQ retries/backoff for transient errors,
  - log job completion/failure.

**Alternatives considered**
- **Do everything in-process but “fire-and-forget”** (start async work and respond immediately). This is fast but not reliable: process restarts lose work and there’s no retry/visibility.
- **A real message broker** (Kafka/RabbitMQ). Great for production, but heavier operationally for this assignment. BullMQ + Redis is the simplest reliable queue here.

### 2) Purchase idempotency (Idempotency-Key + Redis cache + lock)
**Goal**: safe client retries without duplicating purchases or side effects.

Implemented in `src/services/purchaseService.js` using:
- **`Idempotency-Key`** header as the request identity.
- A **cached response** stored in Redis (so retries return the same result quickly).
- A **distributed lock** in Redis to prevent two concurrent requests with the same key from both processing (see `src/utils/idempotency`).
- A persisted check in the mock DB (`getPurchaseByIdempotencyKey`) so idempotency survives process restarts (within the limitations of the mock DB).

**Alternatives considered**
- **DB unique constraint on idempotencyKey** (best in real production with a real DB). Here the “DB” is a simple module; Redis lock + cache demonstrates the same concept without a full DB.
- **Only caching responses** without a lock. That still allows a race where two requests miss the cache and both proceed.

### 3) Reduce watch-event volume (Redis aggregation + scheduled flush + trigger flush)
**Goal**: accept high-volume watch events without spamming external analytics.

Implemented in `src/services/watchService.js`:
- Aggregate progress per `(userId, contentId)` into Redis (hash keyed by `watch:progress:${userId}:${contentId}`).
- Track which progress keys are “dirty” via a Redis set (`watch:dirty`).
- Two flush mechanisms:
  - **Periodic flush** via a BullMQ repeatable job (`src/queues/schedulers.js`).
  - **Immediate flush** when `eventType` is a “trigger” (`pause`, `exit`, `completion`).

Flush worker logic in `src/workers/startWorkers.js`:
- reads dirty keys,
- builds a batch of “watch_progress” events,
- sends them via `analytics.trackBatch` in chunks (`WATCH_FLUSH_CHUNK_SIZE`),
- clears flushed keys from `watch:dirty`.

**Alternatives considered**
- **Send every event**: simplest, but highest cost and least resilient.
- **Only time-window batching**: reduces volume but delays critical events (e.g., completion). The trigger flush handles that.
- **Only trigger flush**: misses updates when clients disconnect unexpectedly; periodic flush provides eventual delivery.

### 4) Validation with Zod + consistent errors
**Goal**: prevent bad input from entering the system and standardize responses.

- Validators live in `src/validators/`.
- Controllers validate before calling services and return appropriate HTTP status codes.

### 5) Structured logging and request logs
**Goal**: debugging and production readiness.

- `src/utils/logger.js` uses Winston JSON logs with timestamps and error stacks.
- Request logging middleware logs method/url/status/duration.
- Job completion/failure logs include queue name and job id.

## Trade-offs (what I deferred and why)

- **Single-process workers**: workers/schedulers start in the web process for simplicity. In production they should run as separate deployments/processes for isolation and scaling.
- **Mock DB**: persistence is minimal; the focus is on architecture patterns (idempotency, queues, batching) rather than database modeling/migrations.
- **No auth for admin endpoints**: the BullMQ UI is intended for local/dev; production needs authentication and network controls.
- **No full tracing** (OpenTelemetry) or metrics (Prometheus): logs only, to keep the assignment scope reasonable.

## Remaining gaps (what I’d add with more time / in production)

### Reliability & correctness
- **Exactly-once semantics**: BullMQ is at-least-once. Side effects must be idempotent (or guarded) to avoid duplicates on retries.
- **Dead-letter queues**: route permanently failing jobs to a DLQ with alerting and manual reprocessing.
- **Backpressure & rate limits**: protect external integrations from spikes; tune concurrency per worker.
- **Graceful shutdown**: stop accepting new requests, drain workers, close Redis connections cleanly.

### Data & APIs
- **Real database** with:
  - unique constraints for idempotency keys,
  - transactional writes,
  - better querying for watch progress and purchases.
- **More endpoints/observability**:
  - job status endpoints (or rely on Bull Board),
  - health checks that verify Redis connectivity and queue readiness,
  - richer error responses for clients (error codes, docs).

### Security
- **AuthN/AuthZ** for Bull Board and any operational endpoints.
- **Input hardening** (rate limiting, request size limits per route, stronger schema constraints).

### Operational maturity
- **Metrics**: queue depth, job latency, retry counts, flush sizes, API latency percentiles.
- **Tracing**: correlate HTTP request → job enqueue → job execution.
- **Configuration management**: env validation, secrets management, per-env overrides.

