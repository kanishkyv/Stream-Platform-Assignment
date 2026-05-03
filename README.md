# Streaming Platform Backend (Refactored)

Production-oriented refactor of the provided Node.js/Express service with:

- Fast APIs (all external side effects moved to BullMQ background jobs)
- Watch-event volume reduction via Redis aggregation + periodic flushing + trigger-based immediate flush
- Purchase idempotency using `Idempotency-Key` + Redis response cache + locking
- Validation with Zod
- Structured logging (winston)

## Prerequisites

- Node.js 18+
- Redis (local or Docker)

## Run Redis (Docker)

```bash
docker run --rm -p 6379:6379 --name assignment1-redis redis:7
```

## Install & Run

```bash
npm install
npm start
```

Server listens on `http://localhost:3000`.

## Endpoints

- `POST /user/signup`
- `POST /purchase/complete` (requires `Idempotency-Key` header)
- `POST /watch/event`
- BullMQ UI: `GET /admin/queues`

## Postman

Import both files from `postman/`:

- `postman/assignment1.postman_collection.json`
- `postman/assignment1.postman_environment.json`

Select the `assignment1-local` environment and run requests in this order:

- `POST /user/signup`
- `POST /purchase/complete (new key)`
- `POST /purchase/complete (same key replay)` (verifies idempotency)
- `POST /watch/event (progress)`
- `POST /watch/event (pause -> immediate flush)`

See `DESIGN.md` for architecture and trade-offs.

