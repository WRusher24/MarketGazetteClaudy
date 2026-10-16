import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { cronAuthResponse } from './cron';

const original = process.env.CRON_SECRET;
afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

const req = (auth?: string) => new Request('http://localhost/api/cron/daily-briefing', { headers: auth ? { authorization: auth } : {} });

describe('cronAuthResponse', () => {
  it('fails loudly when CRON_SECRET is not configured', () => {
    delete process.env.CRON_SECRET;
    assert.equal(cronAuthResponse(req('Bearer anything'))?.status, 500);
  });

  it('refuses requests without the bearer secret', () => {
    process.env.CRON_SECRET = 'test-secret-value';
    assert.equal(cronAuthResponse(req())?.status, 401);
    assert.equal(cronAuthResponse(req('Bearer wrong-secret-value'))?.status, 401);
    assert.equal(cronAuthResponse(req('test-secret-value'))?.status, 401);
  });

  it('accepts the matching bearer secret', () => {
    process.env.CRON_SECRET = 'test-secret-value';
    assert.equal(cronAuthResponse(req('Bearer test-secret-value')), null);
  });
});
