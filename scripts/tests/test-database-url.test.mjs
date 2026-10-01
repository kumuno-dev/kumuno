import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireTestDatabaseUrl } from '../verify-generated-database.mjs';

test('DB検証は未設定・本番DB・不正なURLを拒否し、資格情報を表示しない', () => {
  for (const value of [undefined, '', 'postgresql://user:secret@localhost/company',
    'https://user:secret@localhost/company_test', 'postgresql://localhost/company_test',
    'postgresql://user:secret@localhost/company_test#fragment',
    'postgresql://user:secret@localhost/company_test\n']) {
    assert.throws(() => requireTestDatabaseUrl(value), error => {
      assert.equal(error.message, 'TEST_DATABASE_URLに_testで終わる専用PostgreSQL DBを指定してください。');
      assert(!error.message.includes('secret'));
      return true;
    });
  }
  assert.equal(requireTestDatabaseUrl('postgresql://user:secret@localhost/company_test').pathname, '/company_test');
});
