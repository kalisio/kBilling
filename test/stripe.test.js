/* import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio, hooks, permissions } from 'kCore'
import billing, { billingHooks } from '../src'

describe('kBilling:billing', () => {
  let app, server, port,
    billingService, customerObject, subscriptionObject, invoiceObject, invoiceItemObject, cardObject

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
    expect(typeof billing).to.equal('function')
  })

  it('registers the billing service', (done) => {
    app.configure(core)
    app.configure(billing)

    billingService = app.getService('billing')
    expect(billingService).toExist()

    app.hooks({
      before: { all: [billingHooks.validateCharge] }
    })
    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
  })

  it('create a customer', () => {
    let customerObject = await billingService.create({
      action: 'customer',
      email: 'customer@kalisio.xyz',
      description: 'A customer',
    })
    expect(customerObject.id).toExist()
  })
  // Let enough time to process
  .timeout(5000)

  it('create charge', () => {
    app.hooks({
      before: { all: [billingHooks.validateCharge] }
    })
    return billingService.create({ action: 'charge', src: 'tok_visa' })
    .then(charge => {
      expect(charge).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('create subscription', () => {
    return billingService.create({ action: 'subscription', customerID: customerObject.id, plan: 'test' })
    .then(subscription => {
      subscriptionObject = subscription
      expect(subscriptionObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('update subscription', () => {
    return billingService.update({ action: 'subscription', id: subscriptionObject.id, params: { tax_percent: 10 } }, {})
    .then(subscription => {
      subscriptionObject = subscription
      expect(subscriptionObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('create invoice items', () => {
    return billingService.create({ action: 'invoiceItems', params: { customer: customerObject.id, amount: 2500, currency: 'usd', description: 'One-time setup fee' } })
    .then(invoice => {
      invoiceItemObject = invoice
      expect(invoiceItemObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('create invoice', () => {
    return billingService.create({action: 'invoice'}, {customer: customerObject.id})
    .then(invoice => {
      invoiceObject = invoice
      expect(invoiceObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('cancel subscription', () => {
    return billingService.remove({ action: 'subscription', id: subscriptionObject.id })
    .then(subscription => {
      subscriptionObject = subscription
      expect(subscriptionObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('remove invoice items', () => {
    return billingService.remove({ action: 'invoiceItems', id: invoiceItemObject.id })
    .then(invoice => {
      invoiceItemObject = invoice
      expect(invoiceItemObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('create a card', () => {
    return billingService.create({
      action: 'card',
      id: customerObject.id,
      params: {source: 'tok_visa'}
    })
    .then(card => {
      cardObject = card
      expect(customerObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('remove customer', () => {
    await
    return billingService.remove({ action: 'customer', id: customerObject.id })
    .then(customer => {
      customerObject = customer
      expect(customerObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('create a payment method', () => {
    return billingService.create({
      action: 'paymentMethod',
      organisationID: 'test organisation',
      payment: {
        customerEmail: 'customer@kalisio.xyz',
        customerDescription: 'customer for'
        // token: 'tok_visa'
      }
    })
    .then(paymentMethod => {
      if (paymentMethod.object === 'customer') {
        customerObject = paymentMethod
      } else if (paymentMethod.object === 'card') {
        cardObject = paymentMethod
        customerObject = {id: paymentMethod.customer}
      }

      expect(customerObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('update a payment method', () => {
    return billingService.update({
      action: 'paymentMethod',
      customerID: customerObject.id,
      payment: {
        customerEmail: 'customer@kalisio.xyz',
        customerDescription: 'customer for',
        token: 'tok_mastercard'
      }
    }, {})
    .then(card => {
      cardObject = card
      expect(cardObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('remove a payment method', () => {
    return billingService.remove({
      action: 'paymentMethod',
      id: customerObject.id
    }, {})
    .then(customer => {
      customerObject = customer
      expect(customerObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  // Cleanup
  after(() => {
    if (server) server.close()
  })
})

*/
