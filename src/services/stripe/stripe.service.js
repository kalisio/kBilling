import makeDebug from 'debug'
import _ from 'lodash'
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import core, { kalisio, permissions } from 'kCore'
import feathers from 'feathers'
import rest from 'feathers-rest'
import hooks from 'feathers-hooks'
import socketio from 'feathers-socketio'
import stripe from 'feathers-stripe'
import bodyParser from 'body-parser';
import errorHandler from 'feathers-errors/handler';

const debug = makeDebug('kalisio:kBilling:stripe:service')

export default function (name, kalisioApp, options) {
  let userService, userObject

  var app = feathers()
    .configure(rest())
    .configure(socketio())
    .configure(hooks())
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))
    .use('/stripe/customer', stripe.customer({ secretKey: 'sk_test_J9ttuxferQkOZdlmYQCc6pkx' }))



  function validateCustomer() {
    return function(hook) {
      console.log('Validating customer code goes here');
    };
  }

  var customerService = app.service('stripe/customer');

  customerService.before({
    create: [validateCustomer()]
  });

  var customer = {
    email: 'jenny@example.com',
    // source: 'tok_87rau6axWXeqLq',
  }
 

  kalisioApp.configure(core)
  userService = kalisioApp.getService('users')
  expect(userService).toExist()


  customerService.create(customer).then(result => {
    return userService.create({ email: result.email, name: result.email }, { checkAuthorisation: true })
    .then(user => {
      userObject = user
      return userService.find({ query: { 'profile.name': result.email }, user: userObject, checkAuthorisation: true })
    })
    .then(users => {
      expect(users.data.length > 0).beTrue()
    })
  }).catch(error => {
    console.log('Error creating charge', error);
  });

  const servicePath = kalisioApp.get('apiPath') + '/stripe'


  return kalisioApp.service(servicePath)

}
