import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio, hooks, permissions } from 'kCore'
import billing from '../src'

describe('kBilling', () => {
  let app, server, port,
    userService, userObject, billingService, paymentObject

  before(() => {
    chailint(chai, util)

    // Register all default hooks for authorisation
    // Default rules for all users
    permissions.defineAbilities.registerHook(permissions.defineUserAbilities)
    // Then rules for billing
    // TODO

    app = kalisio()
    port = app.get('port')
    // Register authorisation hook
    app.hooks({
      before: { all: [hooks.authorise] }
    })
    return app.db.connect()
  })

  it('is CommonJS compatible', () => {
    expect(typeof core).to.equal('function')
  })

  it('registers the services', (done) => {
    app.configure(core)
    userService = app.getService('users')
    expect(userService).toExist()
    app.configure(billing)
    billingService = app.getService('billing')
    expect(billingService).toExist()
    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
  })

  it('creates a test user', () => {
    return userService.create({ email: 'test-user@test.org', name: 'test-user' }, { checkAuthorisation: true })
    .then(user => {
      userObject = user
      return userService.find({ query: { 'profile.name': 'test-user' }, user: userObject, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('create a payment', async () => {
    paymentObject = await billingService.create({
      action: 'payment',
      customerEmail: 'customer@kalisio.xyz',
      customerDescription: 'A customer'
    })
    expect(paymentObject.id).toExist()
  })
  // Let enough time to process
  .timeout(5000)

  it('removes the payment', async () => {
    await billingService.remove(paymentObject.id, {
      query: {
        action: 'payment'
      }
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('removes the test user', () => {
    return userService.remove(userObject._id, {
      user: userObject,
      checkAuthorisation: true
    })
    .then(user => {
      return userService.find({ query: { name: 'test-user' } })
    })
    .then(users => {
      expect(users.data.length === 0).beTrue()
    })
  })
  // Let enough time to process
  .timeout(5000)

  // Cleanup
  after(() => {
    if (server) server.close()
    userService.Model.drop()
  })
})
