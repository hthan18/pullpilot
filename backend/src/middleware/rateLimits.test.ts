import assert from 'node:assert/strict';
import test from 'node:test';
import { AddressInfo } from 'node:net';
import express from 'express';
import { createApiRateLimit } from './rateLimits';

test('API limiter returns standard headers and blocks excess requests', async (context) => {
  const app = express();
  app.use('/api', createApiRateLimit(2));
  app.get('/api/not-found', (_request, response) => response.status(404).json({ error: 'Not found' }));
  const server = app.listen(0);
  context.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const port = (server.address() as AddressInfo).port;
  let response: Response | undefined;

  for (let request = 0; request < 3; request += 1) {
    response = await fetch(`http://127.0.0.1:${port}/api/not-found`);
  }

  assert.equal(response?.status, 429);
  assert.ok(response?.headers.get('ratelimit'));
  assert.deepEqual(await response?.json(), { error: 'Too many requests. Please try again later.' });
});
