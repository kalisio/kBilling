import chai, { util, expect, assert } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio, hooks, permissions } from 'kCore'
import billing from '../src'

describe('kBilling', () => {
  let app, server, port,
    userService, userObject, billingService, customerObject, subscriptionObject

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
  .timeout(7500)

  it('create a customer', async () => {
    customerObject = await billingService.create({
      action: 'customer',
      email: 'customer@kalisio.xyz',
      description: 'A customer',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    userObject = await userService.get(userObject._id)
    expect(customerObject.id === userObject.billing.customer.id)
    expect(customerObject.email === userObject.billing.customer.email)
    expect(customerObject.description === userObject.billing.customer.description)
  })
  // Let enough time to process
  .timeout(7500)

  it('update a customer with a visa card', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'visa@kalisio.xyz',
      description: 'A visa purchaser',
      card: { id: 'tok_visa' },
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.email).to.equal('visa@kalisio.xyz')
    expect(customerObject.card.id === userObject.billing.customer.card.id)
    expect(customerObject.card.last4 === userObject.billing.customer.card.last4)
  })
  // Let enough time to process
  .timeout(7500)

  it('remove the card from a customer', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'no-card@kalisio.xyz',
      description: 'A no card purchaser',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.email).to.equal('no-card@kalisio.xyz')
    assert.isUndefined(userObject.billing.customer.card)
  })
  // Let enough time to process
  .timeout(7500)

  it('update a customer with a mastercard', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'mastercard@kalisio.xyz',
      description: 'A mastercard purchaser',
      card: { id: 'tok_mastercard' },
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.email).to.equal('mastercard@kalisio.xyz')
    expect(customerObject.card.id === userObject.billing.customer.card.id)
    expect(customerObject.card.last4 === userObject.billing.customer.card.last4)
  })
  // Let enough time to process
  .timeout(7500)

  it('update a customer with an american express', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'amex@kalisio.xyz',
      description: 'A anmerican express purchaser',
      card: { id: 'tok_amex' },
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.email).to.equal('amex@kalisio.xyz')
    expect(customerObject.card.id === userObject.billing.customer.card.id)
    expect(customerObject.card.last4 === userObject.billing.customer.card.last4)
  })
  // Let enough time to process
  .timeout(7500)

  it('subscribe a customer to a plan', async () => {
    subscriptionObject = await billingService.create({
      action: 'subscription',
      customerId: customerObject.id,
      planId: 'plan_DHd5RMLMSlpUmQ',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    userObject = await userService.get(userObject._id)
    expect(subscriptionObject.id === userObject.billing.subscription.id)
    expect(subscriptionObject.plan.id === userObject.billing.subscription.plan.id)
    expect(userObject.billing.subscription.plan.id).to.equal('plan_DHd5RMLMSlpUmQ')
  })
  // Let enough time to process
  .timeout(7500)

  it('unsubscribe a customer from the plan', async () => {
    await billingService.remove(subscriptionObject.id, {
      query: {
        action: 'subscription',
        billingObjectId: userObject._id,
        billingObjectService: 'users'
      }
    })
    userObject = await userService.get(userObject._id)
    assert.isNull(userObject.billing.subscription)
  })
  // Let enough time to process
  .timeout(7500)

  it('subscribe a customer to a plan', async () => {
    subscriptionObject = await billingService.create({
      action: 'subscription',
      customerId: customerObject.id,
      planId: 'plan_DHd5HGwsl31NoC',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    userObject = await userService.get(userObject._id)
    expect(subscriptionObject.id === userObject.billing.subscription.id)
    expect(subscriptionObject.plan.id === userObject.billing.subscription.plan.id)
    expect(userObject.billing.subscription.plan.id).to.equal('plan_DHd5HGwsl31NoC')
  })
  // Let enough time to process
  .timeout(7500)

  it('removes the customer', async () => {
    await billingService.remove(customerObject.id, {
      query: {
        action: 'customer',
        billingObjectId: userObject._id,
        billingObjectService: 'users'
      }
    })
    userObject = await userService.get(userObject._id)
    assert.isNull(userObject.billing.subscription)
    assert.isNull(userObject.billing.customer)
  })
  // Let enough time to process
  .timeout(7500)

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
  .timeout(7500)

  // Cleanup
  after(() => {
    if (server) server.close()
    userService.Model.drop()
  })
})
