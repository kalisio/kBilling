/*
import makeDebug from 'debug'

const debug = makeDebug('kalisio:kBilling:billing:hooks')

export function validateCharge (hook) {
  return hook
  // console.log(hook);
  // console.log('Validating charge code goes here')
}

export function createCustomer (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.create({
    action: 'customer',
    email: hook.result.email,
    description: hook.result.description,
    src: hook.result.src
  })
  .then(customer => {
    debug('Customer created for ' + hook.result.email)
    return hook
  })
}

export function removeCustomer (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.remove({
    action: 'customer',
    id: hook.result.customerID
  })
  .then(customer => {
    debug('Customer removed')
    return hook
  })
}

export function createCharge (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.create({
    action: 'charge',
    src: hook.result._src
  })
  .then(charge => {
    debug('Charge created')
    return hook
  })
}

export function createSubscription (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.create({
    action: 'subscription',
    customerID: hook.result.customerID,
    plan: hook.result.plan
  }, {})
  .then(subscription => {
    debug('Subscription created')
    return hook
  })
}

export function updateSubscription (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.update({
    action: 'subscription',
    subscriptionID: hook.result.subscriptionID,
    params: hook.result.params
  }, {})
  .then(subscription => {
    debug('Subscription updated')
    return hook
  })
}

export function cancelSubscription (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.remove({
    action: 'subscription',
    subscriptionID: hook.result.subscriptionID
  }, {})
  .then(subscription => {
    debug('Subscription canceled')
    return hook
  })
}

export function createInvoiceItems (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.create({
    action: 'invoiceItems',
    params: hook.result.params
  }, {})
  .then(customer => {
    debug('Invoice item created')
    return hook
  })
}

export function createInvoice (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.create({
    action: 'invoice',
    params: hook.result.params
  }, {})
  .then(customer => {
    debug('Invoice created')
    return hook
  })
}

export function removeInvoiceItems (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.remove({
    action: 'invoiceItems',
    id: hook.result.invoiceItemsID
  }, {})
  .then(customer => {
    debug('Invoice item removed')
    return hook
  })
}

export function createPaymentMethod (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.create({
    action: 'paymentMethod',
    organisationID: hook.result.organisationID,
    payment: hook.result.payment
  }, {})
  .then(customer => {
    debug('Payment method created')
    return hook
  })
}

export function updatePaymentMethod (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.update({
    action: 'paymentMethod',
    customerID: hook.result.customerID,
    payment: hook.result.payment
  }, {})
  .then(customer => {
    debug('Payment method updated')
    return hook
  })
}

export function removePaymentMethod (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.remove({
    action: 'paymentMethod',
    customerID: hook.result.customerID
  }, {})
  .then(customer => {
    debug('Payment method removed')
    return hook
  })
}

export function createPayment (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.create({
    action: 'payment',
    customerEmail: hook.result.customerEmail,
    customerDescription: hook.result.customerDescription
  })

  return hook
}

export function removePayment (hook) {
  let app = hook.app
  let billingService = app.getService('billing')

  return billingService.remove(hook.result.id, {
    query: {
      action: 'payment'
    }
  })

  return hook
}
*/
