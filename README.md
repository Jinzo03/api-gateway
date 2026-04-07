# Enterprise-Grade API Gateway

A high-performance API gateway and reverse proxy built with Node.js, Express, and TypeScript. It serves as a secure, optimized middle layer between clients and backend microservices, with load balancing, caching, rate limiting, authentication, and real-time telemetry.

## Overview

This gateway is designed to centralize traffic management for microservice-based systems. It forwards requests to backend services, improves performance through caching, protects services from abuse, and exposes operational metrics for monitoring.

## Features

- Reverse proxy with round-robin load balancing
- In-memory response caching with Redis (Upstash)
- Distributed rate limiting backed by Redis
- JWT authentication for protected routes
- Real-time telemetry with response-time and status-code tracking
- Graceful degradation when Redis is unavailable
- Docker and Docker Compose support for containerized deployment

## Tech Stack

- Node.js
- TypeScript
- Express.js
- http-proxy-middleware
- Redis (Upstash)
- jsonwebtoken
- express-rate-limit
- Docker
- Docker Compose

## Prerequisites

Before running the project, make sure you have:

- Node.js 18 or newer
- npm
- Docker and Docker Compose, if you want containerized deployment
- An Upstash Redis database URL
- A JWT secret for token signing and verification

## Installation

Clone the repository:

```bash
git clone https://github.com/yourusername/api-gateway.git
cd api-gateway
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root:

```env
REDIS_URL=redis://default:your_upstash_password@your_upstash_url:port
JWT_SECRET=your_super_secret_key
PORT=3000
```

Adjust the values to match your environment.

## Running Locally

Start the application in development mode:

```bash
npx ts-node src/index.ts
```

If your project uses a different start script, you can also run it through `npm run dev` or `npm start` depending on your setup.

## Running with Docker

Build and start the containers:

```bash
docker-compose up --build -d
```

To stop the containers:

```bash
docker-compose down
```

## API Endpoints

### `GET /login`

Generates a mock JWT for testing authentication.

### `GET /metrics`

Returns real-time telemetry such as request counts, response times, and status-code statistics.

### `GET /api/*`

Main proxy entry point. This route requires an authorization header:

```bash
Authorization: Bearer <token>
```

## How It Works

1. A client sends a request to the gateway.
2. The gateway validates authentication when required.
3. Requests are rate-limited to protect backend services.
4. Cached responses are served immediately when available.
5. Uncached traffic is forwarded to the appropriate backend using round-robin routing.
6. Response data and telemetry are recorded for monitoring.

## Project Structure

A typical structure for this kind of service may look like this:

```text
src/
  index.ts
  middleware/
  routes/
  services/
  utils/
docker-compose.yml
Dockerfile
.env
package.json
tsconfig.json
```

## Security Notes

- Keep `JWT_SECRET` private and strong.
- Restrict Redis access to trusted environments only.
- Do not expose internal service URLs directly to clients.
- Use HTTPS in production.
- Review cache and rate-limit settings before deploying publicly.

## Deployment

For production use, deploy behind a reverse proxy or cloud load balancer and configure:

- secure environment variables
- persistent Redis access
- service health checks
- request timeouts
- structured logging
- monitoring and alerts

## Contributing

Contributions are welcome. A simple workflow is:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Open a pull request

## License

This project is licensed under the MIT License.

## Support

If you extend this project, consider documenting:

- supported backend targets
- cache invalidation strategy
- rate-limit policy
- telemetry format
- production deployment steps
