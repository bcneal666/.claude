import { fetchUser } from './api.js'

export async function getDisplayName(id) {
  if (!id) throw new Error('id is required')
  const user = await fetchUser(id)
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name || user.email || 'Anonymous'
}
