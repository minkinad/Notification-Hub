# Notification Hub

Notification Hub is an event-driven SaaS platform for processing and delivering notifications across multiple channels such as Email, Telegram, and Webhooks.

The system is designed with a scalable, modular backend architecture and focuses on reliability, asynchronous processing, and extensibility.

## Overview

Modern applications generate a large number of events that need to be processed and delivered to users or external systems. Notification Hub acts as a centralized service that accepts these events, processes them asynchronously, and ensures reliable delivery through different communication channels.

The platform is built with a production-oriented mindset, including retry mechanisms, rate limiting, structured logging, and role-based access control.

## Architecture

The system follows a modular, event-driven architecture:

- **API Layer** handles incoming requests, validation, authentication, and rate limiting.
- **Application Modules** encapsulate business logic (users, projects, events, notifications).
- **Queue System** (Redis + BullMQ) enables asynchronous processing and decouples event ingestion from delivery.
- **Worker Processes** handle background jobs such as sending notifications and retrying failed deliveries.
- **Database Layer** (PostgreSQL via Prisma) stores persistent data.
- **Integration Layer** connects to external services like email providers, Telegram bots, and webhook endpoints.

### High-level flow

1. A client application sends an event to the API.
2. The event is validated, authorized, and stored.
3. A notification job is pushed to a queue.
4. A worker processes the job asynchronously.
5. The notification is delivered via the selected channel.
6. Failures are retried based on a retry policy.

## Key Features

- Event ingestion API
- Asynchronous notification processing
- Multi-channel delivery (Email, Telegram, Webhooks)
- Retry and failure handling
- Rate limiting and throttling
- Template-based message rendering
- Webhook signing for secure integrations
- Delivery tracking and logging
- Role-Based Access Control (RBAC)
- API documentation with Swagger
- Automated testing (unit, integration, e2e)
- Containerized environment with Docker

## Technology Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **Framework:** NestJS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Queue:** BullMQ (Redis)
- **Caching / Messaging:** Redis
- **Authentication:** JWT
- **API Docs:** Swagger (OpenAPI)
- **Testing:** Jest, Testcontainers
- **Containerization:** Docker, Docker Compose

## Design Principles

- **Separation of concerns** — clear boundaries between modules
- **Scalability** — async processing via queues
- **Reliability** — retry mechanisms and failure tracking
- **Extensibility** — easy to add new notification channels
- **Observability** — logging and audit trails
- **Security** — token-based auth and webhook signatures

## Use Cases

- SaaS platforms sending transactional notifications
- Microservices communication via events
- Centralized notification management system
- Webhook delivery service
- Internal event processing pipelines

## Project Goal

This project demonstrates a production-ready backend system suitable for a mid-level TypeScript developer, showcasing:

- Backend architecture design
- Asynchronous systems and queues
- Database modeling
- External service integrations
- Authentication and authorization
- Testing strategies
- Docker-based infrastructure

## Future Improvements

- Web dashboard for monitoring events and deliveries
- Additional channels (SMS, push notifications)
- Dead-letter queue support
- Metrics and monitoring (Prometheus, Grafana)
- Multi-tenant billing system
- SDK for client integrations
