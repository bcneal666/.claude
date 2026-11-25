// Shared helpers for review-fix check scripts. Run with BASE=<dev server URL>; :3000 is only a fallback.
export const BASE = (process.env.BASE ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
// Dev servers compile a route on its first request, so allow a slow first hit but never hang the run
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 60_000);

const results = [];
export const get = (path, init) =>
  fetch(BASE + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...init,
  });

/** Records one check; `fn` returns true (OK) or a string describing what was wrong */
export async function check(name, fn) {
  try {
    const r = await fn();
    const detail =
      r === true
        ? ""
        : typeof r === "string"
          ? r
          : `returned ${String(r)}, expected true or a message`;
    results.push({ name, ok: r === true, detail });
  } catch (err) {
    results.push({ name, ok: false, detail: String(err).split("\n")[0] });
  }
}

export function report() {
  for (const r of results)
    console.log(
      `${r.ok ? "OK " : "BAD"} ${r.name}${r.detail ? `: ${r.detail}` : ""}`,
    );
  const bad = results.filter((r) => !r.ok).length;
  console.log(
    `\n${results.length - bad}/${results.length} OK${bad ? `, ${bad} BAD` : ""}`,
  );
  process.exit(bad ? 1 : 0);
}

export const html = async (path) => {
  const res = await get(path);
  return {
    status: res.status,
    location: res.headers.get("location"),
    text: await res.text(),
  };
};
export const meta = (text, re) => (re.exec(text) ?? [])[1];

/** JSON request: with `body` it POSTs it (init.method overrides); objects are stringified, a string goes as-is (for malformed-input checks); `data` is parsed JSON, or raw text when not JSON */
export async function json(path, body, init = {}) {
  const send = body !== undefined;
  const res = await get(path, {
    method: send ? "POST" : "GET",
    ...init,
    headers: {
      accept: "application/json",
      ...(send && { "content-type": "application/json" }),
      ...init.headers,
    },
    ...(send && {
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {}
  return { status: res.status, location: res.headers.get("location"), data };
}
