import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio, hooks, permissions } from 'kCore'
import billing from '../src'

describe('kBilling', () => {
  let app, server, port,
    billingService, customerObject, subscriptionObject

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
    app.configure(billing)
    billingService = app.getService('billing')
    expect(billingService).toExist()
    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
  })

  it('create a customer', async () => {
    customerObject = await billingService.create({
      action: 'customer',
      email: 'customer@kalisio.xyz',
      description: 'A customer'
    })
    expect(customerObject.id).toExist()
  })
  // Let enough time to process
  .timeout(5000)

  it('update a customer with a visa card', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'purchaser@kalisio.xyz',
      description: 'A visa purchaser',
      token: 'tok_visa'
    })
    expect(customerObject.id).toExist()
  })
  // Let enough time to process
  .timeout(5000)

  it('update a customer with a mastercard', async () => {
    customerObject = await billingService.update(customerObject.id, {
      action: 'customer',
      email: 'purchaser@kalisio.xyz',
      description: 'A mastercard purchaser',
      token: 'tok_mastercard'
    })
    expect(customerObject.id).toExist()
  })
  // Let enough time to process
  .timeout(5000)

  it('subscribe a customer to a plan', async () => {
    subscriptionObject = await billingService.create({
      action: 'subscription',
      customer: customerObject.id,
      plan: 'plan_DHd5RMLMSlpUmQ'
    })
    expect(subscriptionObject.id).toExist()
  })
  // Let enough time to process
  .timeout(5000)

  it('unsubscribe a customer from the plan', async () => {
    await billingService.remove(subscriptionObject.id, {
      query: {
        action: 'subscription'
      }
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('subscribe a customer to a plan', async () => {
    subscriptionObject = await billingService.create({
      action: 'subscription',
      customer: customerObject.id,
      plan: 'plan_DHd5HGwsl31NoC'
    })
    expect(subscriptionObject.id).toExist()
  })
  // Let enough time to process
  .timeout(5000)

  it('removes the customer', async () => {
    await billingService.remove(customerObject.id, {
      query: {
        action: 'customer'
      }
    })
  })
  // Let enough time to process
  .timeout(5000)

  // Cleanup
  after(() => {
  })
})
