const PROTECTED_PATTERNS = [
  '.env',
  '.env.example',
  'package-lock.json',
  '.git/',
];

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

  const filePath = payload?.tool_input?.file_path;
  if (typeof filePath !== 'string' || filePath.length === 0) {
    process.exit(0);
  }

  const normalized = filePath.replace(/\\/g, '/');
  for (const pattern of PROTECTED_PATTERNS) {
    if (normalized.includes(pattern)) {
      process.stderr.write(
        `Blocked: ${filePath} matches protected pattern '${pattern}'\n`
      );
      process.exit(2);
    }
  }

  process.exit(0);
});
