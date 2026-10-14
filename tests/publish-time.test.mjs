import test from 'node:test';
import assert from 'node:assert/strict';
import {formatPublishTime,publishLogLine} from '../scripts/publish-time.mjs';

test('publication logs explicitly show Beijing time, including UTC date rollover', () => {
  assert.equal(formatPublishTime(new Date('2026-10-14T00:39:45.102Z')),'2026-10-14 08:39:45 +08:00');
  assert.equal(formatPublishTime(new Date('2026-10-13T16:00:00Z')),'2026-10-14 00:00:00 +08:00');
  assert.equal(publishLogLine('已上传',new Date('2026-12-31T20:00:00Z')),'[2027-01-01 04:00:00 +08:00] 已上传');
});
