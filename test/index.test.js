import chai, { util, expect, assert } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio } from 'kCore' // hooks, permissions } from 'kCore'
import billing, {hooks as billingHooks} from '../src'

describe('kBilling', () => {
  let app, server, port,
    userService, userObject, billingService, customerService, cardService, subscriptionService, customerObject, subscriptionObject, stripeCustomer, stripeCard, stripeSubscription

  before(() => {
    chailint(chai, util)

    // Register all default hooks for authorisation
    // Default rules for all users
    // permissions.defineAbilities.registerHook(permissions.defineUserAbilities)
    // Then rules for billing
    // TODO

    app = kalisio()
    port = app.get('port')
    // Register authorisation hook
    /* app.hooks({
      before: { all: [hooks.authorise] }
    }) */
    return app.db.connect()
  })

  it('is CommonJS compatible', () => {
    expect(typeof core).to.equal('function')
  })

  it('registers the services', (done) => {
    app.configure(core)
    userService = app.getService('users')
    userService.hooks({
      after: {
        remove: [ billingHooks.removeBilling ]
      }
    })
    expect(userService).toExist()
    app.configure(billing)
    billingService = app.getService('billing')
    expect(billingService).toExist()
    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
    // Retrieve feathers-strip services
    customerService = app.service('billing/customer')
    expect(customerService).toExist()
    cardService = app.service('billing/card')
    expect(cardService).toExist()
    subscriptionService = app.service('billing/subscription')
    expect(subscriptionService).toExist()
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
  .timeout(10000)

  it('create a customer without card', async () => {
    customerObject = await billingService.create({
      action: 'customer',
      email: 'customer@kalisio.xyz',
      description: 'A customer',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    // Check user
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.id === customerObject.id)
    expect(userObject.billing.customer.email === customerObject.email)
    expect(userObject.billing.customer.description = customerObject.description)
    // Check Stripe
    stripeCustomer = await customerService.get(userObject.billing.customer.id)
    expect(stripeCustomer).toExist()
    let stripeCards = await cardService.find({customer: userObject.billing.customer.id})
    expect(stripeCards.data.length).to.equals(0)
  })
  // Let enough time to process
  .timeout(10000)

  it('update a customer with a visa card', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'visa@kalisio.xyz',
      description: 'A visa purchaser',
      token: 'tok_visa',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    // Check user
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.email).to.equal('visa@kalisio.xyz')
    expect(userObject.billing.customer.card.id === customerObject.card.id)
    expect(userObject.billing.customer.card.last4 === customerObject.card.last4)
    // Check Stripe
    stripeCard = await cardService.get(userObject.billing.customer.card.id, {customer: userObject.billing.customer.id})
    expect(stripeCard).toExist()
  })
  // Let enough time to process
  .timeout(10000)

  it('remove the card from the customer', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'no-card@kalisio.xyz',
      description: 'A no card purchaser',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    // Check user
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.email).to.equal('no-card@kalisio.xyz')
    assert.isUndefined(userObject.billing.customer.card)
    // Check Stripe
    let stripeCards = await cardService.find({customer: userObject.billing.customer.id})
    expect(stripeCards.data.length).to.equals(0)
  })
  // Let enough time to process
  .timeout(10000)

  it('update a customer with a mastercard', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'mastercard@kalisio.xyz',
      description: 'A mastercard purchaser',
      token: 'tok_mastercard',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    // Check user
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.email).to.equal('mastercard@kalisio.xyz')
    expect(userObject.billing.customer.card.id === customerObject.card.id)
    expect(userObject.billing.customer.card.last4 === customerObject.card.last4)
    // Check Stripe
    let stripeCards = await cardService.find({customer: userObject.billing.customer.id})
    expect(stripeCards.data.length).to.equals(1)
  })
  // Let enough time to process
  .timeout(10000)

  it('subscribe a customer to a plan', async () => {
    subscriptionObject = await billingService.create({
      action: 'subscription',
      customerId: customerObject.id,
      planId: 'plan_DHd5RMLMSlpUmQ',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    // Check user
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.subscription.id === subscriptionObject.id)
    expect(userObject.billing.subscription.plan.id === subscriptionObject.plan.id)
    expect(userObject.billing.subscription.plan.id).to.equal('plan_DHd5RMLMSlpUmQ')
    // Check Stripe
    stripeSubscription = await subscriptionService.get(userObject.billing.subscription.id)
    expect(stripeSubscription).toExist()
    expect(stripeSubscription.billing).to.equal('charge_automatically')
  })
  // Let enough time to process
  .timeout(10000)

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
    // Check Stripe
    let stripeSubscriptions = await subscriptionService.find({query: {customer: userObject.billing.customer.id}})
    expect(stripeSubscriptions.data.length).to.equals(0)
  })
  // Let enough time to process
  .timeout(10000)

  it('remove the card from the customer', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'no-card@kalisio.xyz',
      description: 'A no card purchaser',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    // Check user
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.email).to.equal('no-card@kalisio.xyz')
    assert.isUndefined(userObject.billing.customer.card)
    // Check Stripe
    let stripeCards = await cardService.find({customer: userObject.billing.customer.id})
    expect(stripeCards.data.length).to.equals(0)
  })
  // Let enough time to process
  .timeout(10000)

  it('subscribe a customer to a plan', async () => {
    subscriptionObject = await billingService.create({
      action: 'subscription',
      customerId: customerObject.id,
      planId: 'plan_DHd5HGwsl31NoC',
      billing: 'send_invoice',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    userObject = await userService.get(userObject._id)
    expect(subscriptionObject.id === userObject.billing.subscription.id)
    expect(subscriptionObject.plan.id === userObject.billing.subscription.plan.id)
    expect(userObject.billing.subscription.plan.id).to.equal('plan_DHd5HGwsl31NoC')
    // Check Stripe
    let stripeSubscriptions = await subscriptionService.find({query: {customer: userObject.billing.customer.id}})
    expect(stripeSubscriptions.data.length).to.equals(1)
    expect(stripeSubscriptions.data[0].billing).to.equal('send_invoice')
  })
  // Let enough time to process
  .timeout(10000)

  it('update a customer with an american express', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'amex@kalisio.xyz',
      description: 'A anmerican express purchaser',
      token: 'tok_amex',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    // Check user
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.email).to.equal('amex@kalisio.xyz')
    expect(userObject.billing.customer.card.id === customerObject.card.id)
    expect(userObject.billing.customer.card.last4 === customerObject.card.last4)
    // Check Stripe
    let stripeCards = await cardService.find({customer: userObject.billing.customer.id})
    expect(stripeCards.data.length).to.equals(1)
    let stripeSubscriptions = await subscriptionService.find({query: {customer: userObject.billing.customer.id}})
    expect(stripeSubscriptions.data.length).to.equals(1)
    expect(stripeSubscriptions.data[0].billing).to.equal('charge_automatically')
  })
  // Let enough time to process
  .timeout(10000)

  it('update a customer with a mastercard', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'mastercard@kalisio.xyz',
      description: 'A mastercard purchaser',
      token: 'tok_mastercard',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    // Check user
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.email).to.equal('mastercard@kalisio.xyz')
    expect(userObject.billing.customer.card.id === customerObject.card.id)
    expect(userObject.billing.customer.card.last4 === customerObject.card.last4)
    // Check Stripe
    let stripeCards = await cardService.find({customer: userObject.billing.customer.id})
    expect(stripeCards.data.length).to.equals(1)
    let stripeSubscriptions = await subscriptionService.find({query: {customer: userObject.billing.customer.id}})
    expect(stripeSubscriptions.data.length).to.equals(1)
    expect(stripeSubscriptions.data[0].billing).to.equal('charge_automatically')
  })
  // Let enough time to process
  .timeout(10000)

  it('remove the card from the customer', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'no-card@kalisio.xyz',
      description: 'A no card purchaser',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    // Check user
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.email).to.equal('no-card@kalisio.xyz')
    assert.isUndefined(userObject.billing.customer.card)
    // Check Stripe
    let stripeCards = await cardService.find({customer: userObject.billing.customer.id})
    expect(stripeCards.data.length).to.equals(0)
    let stripeSubscriptions = await subscriptionService.find({query: {customer: userObject.billing.customer.id}})
    expect(stripeSubscriptions.data.length).to.equals(1)
    expect(stripeSubscriptions.data[0].billing).to.equal('send_invoice')
  })
  // Let enough time to process
  .timeout(10000)

  it('removes the customer', async () => {
    await billingService.remove(customerObject.id, {
      query: {
        action: 'customer',
        billingObjectId: userObject._id,
        billingObjectService: 'users'
      }
    })
    // Check user
    userObject = await userService.get(userObject._id)
    assert.isNull(userObject.billing.subscription)
    assert.isNull(userObject.billing.customer)
    // Check Stripe
    let stripeCustomers = await customerService.find({query: {email: customerObject.email}})
    expect(stripeCustomers.data.length).to.equals(0)
  })
  // Let enough time to process
  .timeout(10000)

  it('create a new customer with card', async () => {
    customerObject = await billingService.create({
      action: 'customer',
      email: 'new-customer@kalisio.xyz',
      token: 'tok_visa_debit',
      description: 'A new customer',
      billingObjectId: userObject._id,
      billingObjectService: 'users'
    })
    // Check user
    userObject = await userService.get(userObject._id)
    expect(userObject.billing.customer.id === customerObject.id)
    expect(userObject.billing.customer.email === customerObject.email)
    expect(userObject.billing.customer.description = customerObject.description)
    // Check Stripe
    stripeCustomer = await customerService.get(userObject.billing.customer.id)
    expect(stripeCustomer).toExist()
    stripeCard = await cardService.get(userObject.billing.customer.card.id, {customer: userObject.billing.customer.id})
    expect(stripeCard).toExist()
  })
  // Let enough time to process
  .timeout(10000)

  it('removes the test user', async () => {
    await userService.remove(userObject._id, {
      user: userObject,
      checkAuthorisation: true
    })
    // Check user
    let users = await userService.find({ query: { name: 'test-user' } })
    expect(users.data.length === 0).beTrue()
    // Check Stripe
    let stripeCustomers = await customerService.find({query: {email: customerObject.email}})
    expect(stripeCustomers.data.length).to.equals(0)
  })
  // Let enough time to process
  .timeout(10000)

  // Cleanup
  after(() => {
    if (server) server.close()
    userService.Model.drop()
  })
})
