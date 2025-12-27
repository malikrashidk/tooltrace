import { Paddle, EventName } from '@paddle/paddle-node-sdk';

// Initialize Paddle client
// Environment variables should be PADDLE_API_KEY and PADDLE_WEBHOOK_SECRET
// For client-side, we'll need PADDLE_CLIENT_TOKEN and PADDLE_ENV (sandbox/production)

const paddleApiKey = process.env.PADDLE_API_KEY;

export const paddleClient = paddleApiKey ? new Paddle(paddleApiKey) : null;

export const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

// Helper to verify webhook signature is handled by the SDK usually,
// but we can expose a helper if needed or just use the client in the route.
