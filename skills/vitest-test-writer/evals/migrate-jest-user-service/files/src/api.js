export async function fetchUser(id) {
  const res = await fetch(`https://api.example.com/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
