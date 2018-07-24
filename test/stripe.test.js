import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio, hooks, permissions } from 'kCore'
import billing, { billingHooks } from '../src'

describe('kBilling:billing', () => {
  let app, server, port,
    billingService, customerObject, subscriptionObject, invoiceItemObject

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
    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
  })

  it('create a customer', () => {
    return billingService.create({
      action: 'customer',
      email: 'customer@kalisio.xyz',
      name: 'customer',
      src: 'tok_visa'
    })
    .then(customer => {
      customerObject = customer
      expect(customerObject).toExist()
    })
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
    return billingService.create({ action: 'subscription', idCustomer: customerObject.id, plan: 'test' })
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

  it('remove customer', () => {
    return billingService.remove({ action: 'customer', id: customerObject.id })
    .then(customer => {
      customerObject = customer
      expect(customerObject).toExist()
    })
  })
  // Let enough time to process
  .timeout(5000)

  

  // Cleanup
  // after(() => {
  //   // if (server) server.close()
  //   billingService.list({action: 'customer'})
  //   .then(customer => {
  //     customerObject = customer
  //     expect(customerObject).toExist()
  //     customerObject.data.map(customer=>{
  //       // console.log(customer.id);
  //       billingService.remove({ action: 'customer', id: customer.id })
  //       .then(customer => {
  //         console.log(customer.id);
  //         customerObject = customer
  //         expect(customerObject).toExist()
  //       })
  //     })
  //   })

  // })
})
