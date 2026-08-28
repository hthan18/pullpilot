import assert from 'node:assert/strict';
import test from 'node:test';
import { AddressInfo } from 'node:net';
import { app } from '../server';

test('API limiter returns standard headers and blocks excess requests', async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const port = (server.address() as AddressInfo).port;
  let response: Response | undefined;

  for (let request = 0; request < 151; request += 1) {
    response = await fetch(`http://127.0.0.1:${port}/api/not-found`);
  }

  assert.equal(response?.status, 429);
  assert.ok(response?.headers.get('ratelimit'));
  assert.deepEqual(await response?.json(), { error: 'Too many requests. Please try again later.' });
});
