// Shared helpers for review-fix test scripts (generic; set BASE to the dev server URL)
export const BASE = process.env.BASE ?? "http://localhost:3000";

const results = [];
export const get = (path, init) => fetch(BASE + path, { redirect: "manual", ...init });

/** Records one check; `fn` returns true (OK) or a string describing what was wrong */
export async function check(name, fn) {
	try {
		const r = await fn();
		results.push({ name, ok: r === true, detail: r === true ? "" : String(r) });
	} catch (err) {
		results.push({ name, ok: false, detail: String(err).split("\n")[0] });
	}
}

export function report() {
	for (const r of results) console.log(`${r.ok ? "OK " : "BAD"} ${r.name}${r.detail ? `: ${r.detail}` : ""}`);
	const bad = results.filter((r) => !r.ok).length;
	console.log(`\n${results.length - bad}/${results.length} OK${bad ? `, ${bad} BAD` : ""}`);
	process.exit(bad ? 1 : 0);
}

export const html = async (path) => {
	const res = await get(path);
	return { status: res.status, location: res.headers.get("location"), text: await res.text() };
};
export const meta = (text, re) => (re.exec(text) ?? [])[1];
