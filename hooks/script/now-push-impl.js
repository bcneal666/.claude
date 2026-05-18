/**
 * now-push 自動化。
 *
 * 設計目標：所有「機械性」步驟（檢查、stage、commit、push）由腳本完成，
 * AI 只透過 `claude -p` headless 模式產生 commit message。
 *
 * Scope 規則（避免 monorepo 下誤把其他子專案一起 commit）：
 *   1. 若 cwd 是 repo 的子目錄 → scope = cwd（明確由使用者指定）
 *   2. 否則 cwd 就是 repo 根：依照變更檔案的「最近 project marker 目錄」分組
 *      - 全部歸到同一個子專案 → 以該子專案為 scope
 *      - 變更橫跨多個子專案 → 中止並列出衝突，請使用者擇一處理
 *   3. 設定 NOW_PUSH_NO_SCOPE=1 可跳過子專案偵測，回到「commit 整個 repo」舊行為
 *
 * 使用方式：
 *   - 由 hooks/now-push.js 包裝呼叫（觸發詞「now push」）
 *   - 也可獨立執行：node ~/.claude/hooks/script/now-push-impl.js
 *
 * 回傳：{ ok: boolean, output: string }
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// 模型 alias → trailer 顯示名稱。新增模型時集中在此維護。
const MODEL_DISPLAY_NAMES = {
  sonnet: 'Claude Sonnet 4.6',
  opus: 'Claude Opus 4.7',
  haiku: 'Claude Haiku 4.5',
};

function buildTrailer(modelAlias) {
  const name = MODEL_DISPLAY_NAMES[modelAlias] || `Claude ${modelAlias}`;
  return `Co-Authored-By: ${name} <noreply@anthropic.com>`;
}

/**
 * 從 ~/.claude/settings.json 讀取使用者設定的預設模型。
 * 失敗（檔案不存在 / 解析錯誤 / 無 model 欄位）一律 fallback 到 'sonnet'。
 */
function resolveDefaultModel() {
  try {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    const raw = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(raw);
    if (typeof settings.model === 'string' && settings.model.trim()) {
      return settings.model.trim();
    }
  } catch { /* ignore — 用 fallback */ }
  return 'sonnet';
}

const DEFAULT_MODEL = resolveDefaultModel();

const DEFAULT_CONFIG = {
  // headless 呼叫使用的模型 alias（取自 settings.json，否則 'sonnet'）
  model: DEFAULT_MODEL,
  // 傳給 LLM 的 diff 上限（避免 prompt 過大）
  // 註：trailer 已不在此欄位定義；於使用點以 buildTrailer(config.model) 動態產生，
  //     避免外部用 spread 覆寫 model 時，trailer 與實際模型不一致。
  maxDiffChars: 40000,
  // 命中任一 pattern 即視為敏感檔案，中止流程
  sensitivePatterns: [
    /(^|[/\\])\.env(\.|$)/i,
    /credentials?/i,
    /(^|[/\\])id_[rd]sa(\.|$)/i,
    /\.pem$/i,
    /\.p12$/i,
    /\.pfx$/i,
    /\.key$/i,
    /(^|[/\\])secrets?\.(json|ya?ml|toml)$/i,
    /\.htpasswd$/i,
  ],
  // 子專案邊界判斷依據（任一存在即視為「子專案根」）
  projectMarkers: [
    '.git',
    'package.json',
    'pyproject.toml',
    'setup.py',
    'Cargo.toml',
    'go.mod',
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'composer.json',
    'Gemfile',
  ],
};

function sh(argv, opts = {}) {
  const r = spawnSync(argv[0], argv.slice(1), {
    encoding: 'utf8',
    shell: false,
    maxBuffer: 16 * 1024 * 1024,
    ...opts,
  });
  return {
    ok: r.status === 0,
    code: r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  };
}

function claudeBin() {
  return process.platform === 'win32' ? 'claude.exe' : 'claude';
}

/**
 * 列出 repo 內所有「會被 commit」的檔案 (modified / untracked / staged)。
 * 路徑為 repo-root 相對、使用 forward slash。
 */
function listChangedFiles(repoRoot) {
  const r = sh(['git', '-C', repoRoot, 'status', '--porcelain=v1', '-z'], { cwd: repoRoot });
  if (!r.ok) return [];
  const parts = r.stdout.split('\0').filter(Boolean);
  const files = [];
  let i = 0;
  while (i < parts.length) {
    const entry = parts[i];
    // 格式："XY filename"，XY 各一字元 + 空白
    const status = entry.slice(0, 2);
    const filename = entry.slice(3);
    files.push(filename.replace(/\\/g, '/'));
    // Rename / Copy 緊接著一個原始檔名 part
    if (status[0] === 'R' || status[0] === 'C' || status[1] === 'R' || status[1] === 'C') {
      i += 2;
    } else {
      i += 1;
    }
  }
  return files;
}

/**
 * 從檔案路徑往上找最近的 project marker 目錄。
 * @returns {string} 相對 repo root 的子專案目錄；'' 代表落在 repo 根層級
 */
function findSubprojectRoot(repoRoot, fileRelPath, markers) {
  const segments = fileRelPath.split('/');
  // 從檔案所在目錄開始往上找（不含 repo root 本身）
  for (let i = segments.length - 1; i >= 1; i--) {
    const dir = segments.slice(0, i).join('/');
    const abs = path.join(repoRoot, dir);
    for (const marker of markers) {
      try {
        if (fs.existsSync(path.join(abs, marker))) {
          return dir;
        }
      } catch { /* ignore */ }
    }
  }
  return '';
}

/**
 * 決定本次 commit 的 scope（repo-root 相對路徑；'' 代表整個 repo）。
 * 回傳 { scope, reason, error? }，error 非空時表示應中止。
 */
function resolveScope({ cwd, repoRoot, changedFiles, config }) {
  // 0. 環境變數 override
  if (process.env.NOW_PUSH_NO_SCOPE === '1') {
    return { scope: '', reason: '已設定 NOW_PUSH_NO_SCOPE=1，跳過 scope 偵測（commit 整個 repo）' };
  }

  // 1. cwd 是 repo 的子目錄 → 直接用 cwd
  const cwdAbs = path.resolve(cwd);
  const repoAbs = path.resolve(repoRoot);
  const cwdRel = path.relative(repoAbs, cwdAbs).replace(/\\/g, '/');
  if (cwdRel && cwdRel !== '.' && !cwdRel.startsWith('..')) {
    return { scope: cwdRel, reason: `cwd 位於子目錄 → scope = ${cwdRel}` };
  }

  // 2. cwd 在 repo 根：用 project markers 將變更分組
  const groups = new Map(); // group → file list
  for (const f of changedFiles) {
    const sub = findSubprojectRoot(repoRoot, f, config.projectMarkers);
    if (!groups.has(sub)) groups.set(sub, []);
    groups.get(sub).push(f);
  }

  if (groups.size <= 1) {
    const sub = [...groups.keys()][0] || '';
    return {
      scope: sub,
      reason: sub
        ? `自動偵測到單一子專案 → scope = ${sub}`
        : '無偵測到子專案邊界 → scope = 整個 repo',
    };
  }

  // 3. 多個子專案 → 中止
  const lines = [];
  lines.push('❌ 偵測到變更橫跨多個子專案／scope，已中止以避免混雜 commit：');
  lines.push('');
  for (const key of [...groups.keys()].sort()) {
    const files = groups.get(key);
    lines.push(`   📁 ${key || '(repo 根層級)'}  — ${files.length} 個檔案`);
    files.slice(0, 5).forEach((f) => lines.push(`      - ${f}`));
    if (files.length > 5) lines.push(`      ... (還有 ${files.length - 5} 個)`);
  }
  lines.push('');
  lines.push('處理方式（擇一）：');
  lines.push('   1. cd 到想 commit 的子專案目錄（或從那邊啟動 Claude Code）後再執行 `now push`');
  lines.push('   2. 手動處理其他子專案的變更（git stash / commit）後重試');
  lines.push('   3. 確認要一次 commit 全部：設定環境變數 NOW_PUSH_NO_SCOPE=1 再執行');
  return { scope: null, reason: '', error: lines.join('\n') };
}

function generateMessage({ diff, recentLog, config, cwd }) {
  const systemPrompt = [
    '你是一個 Conventional Commit message 產生器。',
    '嚴格規則：',
    '1. 只輸出 commit message 純文字。**禁止**加任何前後綴、引號、markdown code block、解釋或評論。',
    '2. 使用台灣繁體中文。',
    '3. 第一行格式：`type(scope): subject`。type 從 feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert 擇一；scope 可省略。',
    '4. subject 聚焦於「為什麼」做這個變更（高層動機/結果），不超過 72 字元；**禁止**只寫「更新檔案」「修改設定」之類沒有資訊量的描述。',
    '5. 第一行後**必須**空一行，接著一段（1–3 行）說明此變更的背景或動機（為什麼要做、解決什麼問題）。若 diff 已經足夠自我解釋，可省略此段。',
    '6. 接著**必須**空一行，再以 `- ` 起首逐條列出 diff 中**所有實質改動**。規則：',
    '   - 每個邏輯變更一條 bullet（同檔案多個獨立修改應拆成多條；高度相關的小改動可合併）。',
    '   - 條目數不設上限：diff 涵蓋幾項實質改動就列幾條，**禁止**為了簡潔而省略。',
    '   - 每條格式建議：`- <動詞> <對象>（<檔案或位置>）：<具體做了什麼>`。例：`- 新增 resolveScope()（now-push-impl.js）：依 project marker 自動偵測 scope`。',
    '   - 純格式調整（rename、移動、空白、註解）也要列出，但可彙整成一條。',
    '   - **禁止**只寫「更新 X」「調整 Y」，必須說明調整的內容或方向。',
    '7. 訊息**最後一段**為一行空行 + trailer（且僅允許此 trailer，不要加 Signed-off-by 等其他 trailer）：',
    `   ${buildTrailer(config.model)}`,
  ].join('\n');

  const userPrompt = [
    '以下是即將提交的 staged diff：',
    '',
    '```diff',
    diff,
    '```',
    '',
    '本專案近期 commit 風格（供格式參考）：',
    '```',
    recentLog || '(無歷史紀錄)',
    '```',
    '',
    '請依規則產生一則 commit message。',
  ].join('\n');

  const r = spawnSync(
    claudeBin(),
    [
      '-p',
      '--model', config.model,
      '--output-format', 'text',
      '--append-system-prompt', systemPrompt,
      userPrompt,
    ],
    {
      encoding: 'utf8',
      cwd,
      shell: false,
      maxBuffer: 8 * 1024 * 1024,
    }
  );

  return {
    ok: r.status === 0 && (r.stdout || '').trim().length > 0,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  };
}

function sanitizeMessage(raw, trailer) {
  let msg = raw.trim();
  // 移除模型偶爾加上的 markdown code fence
  msg = msg.replace(/^```[a-zA-Z]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  // 確保 trailer 存在
  if (!msg.includes(trailer)) {
    msg = `${msg}\n\n${trailer}`;
  }
  return msg;
}

function run({ cwd = process.cwd(), config = DEFAULT_CONFIG } = {}) {
  const out = [];
  const log = (s = '') => out.push(s);
  const result = (ok) => ({ ok, output: out.join('\n') });

  // 1. 是否在 git repo
  const inRepo = sh(['git', 'rev-parse', '--is-inside-work-tree'], { cwd });
  if (!inRepo.ok) {
    log('❌ 目前目錄不是 git repo。');
    return result(false);
  }
  const repoRoot = sh(['git', 'rev-parse', '--show-toplevel'], { cwd }).stdout.trim();
  if (!repoRoot) {
    log('❌ 無法取得 git repo 根目錄。');
    return result(false);
  }

  // 2. 是否有變更
  const allFiles = listChangedFiles(repoRoot);
  if (!allFiles.length) {
    log('✅ 工作區乾淨，沒有需要提交的變更。');
    return result(true);
  }

  // 3. 決定 scope
  const sc = resolveScope({ cwd, repoRoot, changedFiles: allFiles, config });
  if (sc.error) {
    log(sc.error);
    return result(false);
  }
  const scope = sc.scope; // '' 或 'frontend' 或 'apps/foo' …
  const inScope = (f) => !scope || f === scope || f.startsWith(scope + '/');
  const scopedFiles = allFiles.filter(inScope);
  if (!scopedFiles.length) {
    log(`✅ scope (${scope || 'repo 根'}) 下沒有需要提交的變更。`);
    log(`   (備註：${sc.reason})`);
    return result(true);
  }

  // 4. 敏感檔案掃描（只看 scope 內）
  const flagged = scopedFiles.filter((f) =>
    config.sensitivePatterns.some((p) => p.test(f))
  );
  if (flagged.length) {
    log('❌ 偵測到可能的敏感檔案，已中止：');
    flagged.forEach((f) => log(`   - ${f}`));
    log('');
    log('如確認要提交，請手動 git add / commit 或編輯 hooks/script/now-push-impl.js 的 sensitivePatterns。');
    return result(false);
  }

  // 5. git add <scope>（從 repo root 跑，並用 pathspec 限縮）
  const addPath = scope || '.';
  const add = sh(['git', '-C', repoRoot, 'add', '--', addPath], { cwd: repoRoot });
  if (!add.ok) {
    log(`❌ git add 失敗：${(add.stderr || add.stdout).trim()}`);
    return result(false);
  }

  // 6. 取得 scope 內的 staged diff
  let diff = sh(['git', '-C', repoRoot, 'diff', '--staged', '--', addPath], { cwd: repoRoot }).stdout;
  if (!diff.trim()) {
    log('❌ git add 後 scope 內沒有 staged 變更（可能全被 .gitignore 排除）。');
    return result(false);
  }
  const originalDiffLen = diff.length;
  const truncated = diff.length > config.maxDiffChars;
  if (truncated) {
    diff = diff.slice(0, config.maxDiffChars) +
      `\n\n... (diff 過長，已截斷至前 ${config.maxDiffChars} 字元，原長度 ${originalDiffLen})`;
  }
  const recentLog = sh(['git', '-C', repoRoot, 'log', '-5', '--oneline'], { cwd: repoRoot }).stdout.trim();

  // 7. 呼叫 claude -p 產生 commit message
  const gen = generateMessage({ diff, recentLog, config, cwd: repoRoot });
  if (!gen.ok) {
    log('❌ 呼叫 `claude -p` 產生 commit message 失敗。');
    if (gen.stderr.trim()) log(`   stderr: ${gen.stderr.trim()}`);
    log('   已 stage 變更但未 commit。請手動 git commit 或 git reset 後重試。');
    return result(false);
  }
  const message = sanitizeMessage(gen.stdout, buildTrailer(config.model));

  // 8. git commit（用 -F + pathspec，避免帶到 scope 外的 pre-staged 檔案）
  const tmpFile = path.join(os.tmpdir(), `now-push-${Date.now()}-${process.pid}.txt`);
  fs.writeFileSync(tmpFile, message, { encoding: 'utf8' });
  let commit;
  try {
    commit = sh(['git', '-C', repoRoot, 'commit', '-F', tmpFile, '--', addPath], { cwd: repoRoot });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }

  if (!commit.ok) {
    log('❌ git commit 失敗：');
    log((commit.stderr || commit.stdout).trim());
    log('');
    log('提示：若為 pre-commit hook 錯誤，請修復根因後再次執行 `now push`。');
    log('（已 stage 的變更仍保留在 index，可直接重試。）');
    return result(false);
  }

  const hash = sh(['git', '-C', repoRoot, 'rev-parse', '--short', 'HEAD'], { cwd: repoRoot }).stdout.trim();
  const branch = sh(['git', '-C', repoRoot, 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoRoot }).stdout.trim();

  // 9. git push
  const push = sh(['git', '-C', repoRoot, 'push'], { cwd: repoRoot });
  if (!push.ok) {
    log(`⚠️ commit 已建立（${hash} @ ${branch}），但 git push 失敗：`);
    log((push.stderr || push.stdout).trim());
    log('');
    log('修正遠端問題後可直接 `git push`，無需重做 commit。');
    return result(false);
  }

  // 10. 完成回報
  log('✅ 自動 commit & push 完成');
  log(`   Repo   : ${repoRoot}`);
  log(`   Scope  : ${scope || '(整個 repo)'}  — ${sc.reason}`);
  log(`   Commit : ${hash}`);
  log(`   Branch : ${branch}`);
  if (truncated) log('   備註   : diff 過長已截斷給 LLM，message 可能未涵蓋全部細節');
  log('');
  log('Message:');
  log('─────────────────────');
  log(message);
  log('─────────────────────');

  return result(true);
}

module.exports = { run, DEFAULT_CONFIG, findSubprojectRoot, resolveScope, listChangedFiles };

// CLI 模式：可直接 `node now-push-impl.js` 在當前 repo 執行
if (require.main === module) {
  const { ok, output } = run({ cwd: process.cwd() });
  process.stdout.write(output + '\n');
  process.exit(ok ? 0 : 1);
}
