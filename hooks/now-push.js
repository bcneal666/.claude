/**
 * UserPromptSubmit hook：偵測到「now push」觸發詞時，
 * 直接執行 now-push-impl 完成 commit & push，並 block 原始 prompt
 * （AI 不會被呼叫，僅把結果以 reason 形式顯示給使用者）。
 */

const path = require('path');

const TRIGGER = 'now push';

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.exit(0);
  }

  const prompt =
    typeof payload?.prompt === 'string' ? payload.prompt.trim() : '';
  if (prompt.toLowerCase() !== TRIGGER) {
    process.exit(0);
  }

  const cwd = payload?.cwd || process.cwd();

  let result;
  try {
    const { run } = require(path.join(__dirname, 'script', 'now-push-impl.js'));
    result = run({ cwd });
  } catch (e) {
    result = {
      ok: false,
      output: `❌ now-push 執行時拋出例外：\n${(e && e.stack) || String(e)}`,
    };
  }

  // 用 decision: block 攔截 prompt：AI 不會被喚起，使用者直接看到 reason。
  const response = {
    decision: 'block',
    reason: result.output || '(no output)',
  };
  process.stdout.write(JSON.stringify(response));
  process.exit(0);
});
