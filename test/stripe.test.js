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
  let kalisioApp, server, port,
    stripeService, userService
  
  before(() => {
    chailint(chai, util)

    // Register all default hooks for authorisation
    // Default rules for all users
    permissions.defineAbilities.registerHook(permissions.defineUserAbilities)
    // Then rules for billing
    // TODO

    kalisioApp = kalisio()
    port = kalisioApp.get('port')

    kalisioApp.hooks({
      before: { all: [hooks.authorise] }
    })
    // Register authorisation hook
    return kalisioApp.db.connect()
  })

  it('is CommonJS compatible', () => {
    expect(typeof core).to.equal('function')
  })

  it('registers the billing', (done) => {
    kalisioApp.configure(billing)
    // Now kalisioApp is configured launch the server
    server = kalisioApp.listen(port)
    server.once('listening', _ => done())
  })

})
