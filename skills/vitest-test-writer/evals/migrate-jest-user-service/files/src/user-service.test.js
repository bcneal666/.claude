const { getDisplayName } = require('./user-service')
const api = require('./api')
jest.mock('./api')

test('getDisplayName works', async () => {
  api.fetchUser.mockResolvedValue({ firstName: 'Ada', lastName: 'Lovelace' })
  const name = await getDisplayName('1')
  expect(name).toBeDefined()
  expect(api.fetchUser).toHaveBeenCalled()
})

test('throws without id', () => {
  expect(getDisplayName()).rejects.toThrow()
})
