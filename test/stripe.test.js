import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio, hooks, permissions } from 'kCore'
import feathers from 'feathers'
import rest from 'feathers-rest'
import socketio from 'feathers-socketio'
import stripe from 'feathers-stripe'
import bodyParser from 'body-parser';
import errorHandler from 'feathers-errors/handler';
import billing from '../src'

describe('kBilling:stripe', () => {
  let app, server, port,
    stripeService, userService
  
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
    app.configure(core)
    userService = app.getService('users')
    expect(userService).toExist()

    app.use('/stripe/customer', stripe.customer({ secretKey: app.get('stripe').secretKey }))
    app.use('/stripe/tokens', stripe.customer({ secretKey: app.get('stripe').secretKey }))
    app.use('/stripe/charges', stripe.customer({ secretKey: app.get('stripe').secretKey }))

    app.configure(billing)
    stripeService = app.getService('stripe')
    expect(stripeService).toExist()
    // Now app is configured launch the server
    server = app.listen(port)
    server.once('listening', _ => done())
  })

  it('create customer', () => {
    return stripeService.create({
      email: 'publisher@kalisio.xyz',
      name: 'publisher-user'
    })
    .catch(error => {
      expect(error).toExist()
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('remove customer', () => {
    return stripeService.remove('publisher@kalisio.xyz')
    .catch(error => {
      expect(error).toExist()
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)

  it('create charge', () => {
    return stripeService.charge('tok_visa')
    .catch(error => {
      expect(error).toExist()
      done()
    })
  })
  // Let enough time to process
  .timeout(5000)

})