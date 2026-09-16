import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readApiResponse} from '../lib/api-response.mjs';

test('preserves JSON success and application errors', async () => {
  assert.deepEqual(await readApiResponse(Response.json({user:{role:'Student'}})), {user:{role:'Student'}});
  assert.deepEqual(await readApiResponse(Response.json({error:'Incorrect password'}, {status:401})), {error:'Incorrect password'});
});

test('HTML gateway errors and malformed responses produce recovery guidance', async () => {
  for (const body of ['<!DOCTYPE html><title>502</title>', '{broken', 'null']) {
    await assert.rejects(readApiResponse(new Response(body)), /temporarily unavailable/);
    await assert.rejects(readApiResponse(new Response(body), {write:true}), /Check whether it completed/);
  }
});
