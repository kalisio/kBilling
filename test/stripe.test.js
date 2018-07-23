import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio, hooks, permissions } from 'kCore'
import billing, { billingHooks } from '../src'

describe('kBilling:billing', () => {
  let app, server, port,
    billingService, userService

  before(() => {
    chailint(chai, util)

    // Register all default hooks for authorisation
    // Default rules for all users
    permissions.defineAbilities.registerHook(permissions.defineUserAbilities)
    // Then rules for billing
    // TODO

    app = kalisio()
    port = app.get('port')

    app.hooks({
      before: { all: [hooks.authorise] }
    })
    // Register authorisation hook
    return app.db.connect()
  })

  it('is CommonJS compatible', () => {
    expect(typeof core).to.equal('function')
  })

  it('registers the billing', (done) => {
    app.configure(billing)

    billingService = app.getService('billing')
    expect(billingService).toExist()
    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
  })

  it('create customer', () => {
    return billingService.create({
      action: 'customer',
      email: 'publisher@kalisio.xyz',
      name: 'publisher-user',
      src: 'tok_visa'
    })
    .catch(error => {
      expect(error).toExist()
      console.log(error)
      done()
    });
  })
  // Let enough time to process
  .timeout(5000)

  it('remove customer', () => {
    return billingService.remove({action: 'customer', id: 'cus_DG7BdGMLB4F79E'})
    .catch(error => {
      expect(error).toExist()
      console.log(error)
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('create charge', () => {
    app.hooks({
      before: { all: [billingHooks.validateCharge] }
    })
    return billingService.create({action: 'charge', src: 'tok_visa'})
    .catch(error => {
      expect(error).toExist()
      console.log(error)
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('create subscription', () => {
    return billingService.create({action: 'subscription', idCustomer: 'cus_DG84janbD4WQpc', plan: 'test'})
    .catch(error => {
      expect(error).toExist()
      console.log(error)
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('update subscription', () => {
    return billingService.update({action: 'subscription', id: 'sub_DG87EwNdOtSZaK', params: { tax_percent: 10 }}, {})
    .catch(error => {
      expect(error).toExist()
      console.log(error)
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('create invoice items', () => {
    return billingService.create({action: 'invoiceItems', params: {customer: 'cus_DG84janbD4WQpc', amount: 2500, currency: 'usd', description: 'One-time setup fee'}})
    .catch(error => {
      expect(error).toExist()
      console.log(error)
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)
})
