import makeDebug from 'debug'
import _ from 'lodash'
import { disallow } from 'feathers-hooks-common'
import { Customer, Card, Subscription } from 'feathers-stripe'
import { BadRequest } from '@feathersjs/errors'

const debug = makeDebug('kalisio:kBilling:billing:service')

const propertiesToOmit = ['billingObjectId', 'billingObjectService', 'action']

function toStripeCustomerData (data) {
  if (_.isNil(data.email)) throw new BadRequest(`createCustomer: missing 'email' parameter`)
  return {
    email: data.email,
    description: _.get(data, 'description', ''),
    business_vat_id: _.get(data, 'vatNumber', '')
  }
}

export default function (name, app, options) {
  const config = app.get('billing')
  return {
    async getBillingPerspective (billingObjectId, billingObjectServiceName) {
      debug('get billing perspective for ' + billingObjectId + ' [service: ' + billingObjectServiceName + ']')
      const objectBillingService = app.getService(billingObjectServiceName)
      let billing = await objectBillingService.get(billingObjectId, { query: { $select: ['billing'] } })
      return billing
    },
    async createStripeSubscription (customerId, planId, billingMethod) {
      debug('create Stripe subscription to ' + planId + ' for ' + customerId + ' [billing method: ' + billingMethod + ']')
      const subscriptionService = app.service('billing/subscription')
      let stripeSubscriptionData = {
        customer: customerId,
        plan: planId,
        billing: billingMethod
      }
      if (billingMethod === 'send_invoice') stripeSubscriptionData['days_until_due'] = config.daysUntilInvoiceDue
      let stripeSubscription = await subscriptionService.create(stripeSubscriptionData)
      return stripeSubscription.id
    },
    async removeStripeSubscription (customerId, subscriptionId) {
      debug('remove Stripe subscription ' + subscriptionId + ' from ' + customerId)
      const subscriptionService = app.service('billing/subscription')
      await subscriptionService.remove(subscriptionId, {customer: customerId})
    },
    async createStripeCard (customerId, token) {
      debug('create card ' + token + ' for customer ' + customerId)
      const cardService = app.service('billing/card')
      let card = await cardService.create({source: token}, {customer: customerId})
      return { stripeId: card.id, brand: card.brand, last4: card.last4 }
    },
    async removeStripeCard (customerId, cardId) {
      debug('remove card from customer ' + customerId)
      const cardService = app.service('billing/card')
      await cardService.remove(cardId, {customer: customerId})
    },
    async updateBillingMethod (subscriptionId, billingMethod) {
      debug('update billing for subscription ' + subscriptionId + ' with method ' + billingMethod)
      let subscriptionData = { billing: billingMethod }
      if (billingMethod === 'send_invoice') subscriptionData['days_until_due'] = config.daysUntilInvoiceDue
      const subscriptionService = app.service('billing/subscription')
      await subscriptionService.update(subscriptionId, subscriptionData)
    },
    async createCustomer (data) {
      let stripeCustomerData = toStripeCustomerData(data)
      debug('create customer ' + stripeCustomerData.email)
      const customerService = app.service('billing/customer')
      let stripeCustomer = await customerService.create(stripeCustomerData)
      let customerObject = Object.assign({ stripeId: stripeCustomer.id }, _.omit(data, propertiesToOmit))
      if (!_.isNil(_.get(data, 'token', null))) {
        let card = await this.createStripeCard(stripeCustomer.id, data.token)
        customerObject = Object.assign(customerObject, {card: card})
      }
      const billingObjectService = app.getService(data.billingObjectService)
      await billingObjectService.patch(data.billingObjectId, { 'billing.customer': customerObject })
      return customerObject
    },
    async updateCustomer (customerId, data) {
      let stripeCustomerData = toStripeCustomerData(data)
      debug('update customer ' + customerId)
      const customerService = app.service('billing/customer')
      let stripeCustomer = await customerService.update(customerId, stripeCustomerData)
      let customerObject = Object.assign({ stripeId: customerId }, _.omit(data, propertiesToOmit))
      if (stripeCustomer.sources.total_count > 0) {
        // do we need to remove the card
        if (_.isNil(data.card)) {
          // Card has been removed
          await this.removeStripeCard(customerId, stripeCustomer.sources.data[0].id)
          // Update subscription if needed
          if (stripeCustomer.subscriptions.total_count > 0) {
            if (_.isNil(data.token)) await this.updateBillingMethod(stripeCustomer.subscriptions.data[0].id, 'send_invoice')
          }
        }
        if (!_.isNil(data.token)) {
          // Card has been replaced
          if (!_.isNil(data.card)) await this.removeStripeCard(customerId, stripeCustomer.sources.data[0].id)
          let card = await this.createStripeCard(customerId, data.token)
          customerObject = Object.assign(customerObject, {card: card})
        }
      } else if (!_.isNil(data.token)) {
        // Card has been added
        let card = await this.createStripeCard(customerId, data.token)
        customerObject = Object.assign(customerObject, {card: card})
        // Update subscription if needed
        if (stripeCustomer.subscriptions.total_count > 0) {
          await this.updateBillingMethod(stripeCustomer.subscriptions.data[0].id, 'charge_automatically')
        }
      }
      const billingObjectService = app.getService(data.billingObjectService)
      await billingObjectService.patch(data.billingObjectId, { 'billing.customer': customerObject })
      return customerObject
    },
    async removeCustomer (customerId, query, patch) {
      debug('remove customer: ' + customerId)
      const customerService = app.service('billing/customer')
      await customerService.remove(customerId)
      if (patch) {
        const billingObjectService = app.getService(query.billingObjectService)
        await billingObjectService.patch(query.billingObjectId, { 'billing.customer': null, 'billing.subscription': null })
      }
    },
    async createSubscription (data) {
      if (_.isNil(data.plan)) throw new BadRequest(`createSubscription: missing 'plan' parameter`)
      debug('create subscripton for ' + data.billingObjectId + ' to plan ' + data.plan)
      let subscription = { plan: data.plan }
      if (!_.isNil(config.plans[data.plan].stripeId)) {
        let billing = await this.getBillingPerspective(data.billingObjectId, data.billingObjectService)
        let customerId = _.get(billing, 'billing.customer.stripeId')
        let customerCard = _.get(billing, 'billing.customer.card')
        if (_.isNil(customerId)) throw new BadRequest(`updateSubscription: you must create a customer before subscribing to a product`)
        let billingMethod = 'send_invoice'
        if (!_.isNil(customerCard)) billingMethod = 'charge_automatically'
        subscription['stripeId'] = await this.createStripeSubscription(customerId, config.plans[data.plan].stripeId, billingMethod)
      }
      const billingObjectService = app.getService(data.billingObjectService)
      await billingObjectService.patch(data.billingObjectId, { 'billing.subscription': subscription })
      return subscription
    },
    async updateSubscription (plan, data) {
      debug('update subscripton for ' + data.billingObjectId + ' to plan ' + plan)
      let billing = await this.getBillingPerspective(data.billingObjectId, data.billingObjectService)
      let customerId = _.get(billing, 'billing.customer.stripeId')
      let customerCard = _.get(billing, 'billing.customer.card')
      let subscriptionId = _.get(billing, 'billing.subscription.stripeId')
      if (!_.isNil(subscriptionId)) {
        if (_.isNil(customerId)) throw new BadRequest(`updateSubscription: inconsistent billing perspective`)
        await this.removeStripeSubscription(customerId, subscriptionId)
      }
      let subscription = { plan: plan }
      if (!_.isNil(config.plans[plan].stripeId)) {
        if (_.isNil(customerId)) throw new BadRequest(`updateSubscription: you must create a customer before subscribing to a product`)
        let billingMethod = 'send_invoice'
        if (!_.isNil(customerCard)) billingMethod = 'charge_automatically'
        subscription['stripeId'] = await this.createStripeSubscription(customerId, config.plans[plan].stripeId, billingMethod)
      }
      const billingObjectService = app.getService(data.billingObjectService)
      await billingObjectService.patch(data.billingObjectId, { 'billing.subscription': subscription })
      return subscription
    },
    async removeSubscription (plan, query, patch) {
      debug('remove subscription from ' + query.billingObjectId)
      let billing = await this.getBillingPerspective(query.billingObjectId, query.billingObjectService)
      let currentPlan = _.get(billing, 'billing.subscription.plan')
      if (currentPlan !== plan) throw new BadRequest(`removeSubscription: invalid plan`)
      let customerId = _.get(billing, 'billing.customer.stripeId')
      let subscriptionId = _.get(billing, 'billing.subscription.stripeId')
      if (!_.isNil(subscriptionId)) {
        if (_.isNil(customerId)) throw new BadRequest(`removeSubscription: inconsistent billing perspective`)
        await this.removeStripeSubscription(customerId, subscriptionId)
      }
      if (patch) {
        const billingObjectService = app.getService(query.billingObjectService)
        await billingObjectService.patch(query.billingObjectId, { 'billing.subscription': null })
      }
    },
    setup (app) {
      app.use('/billing/customer', new Customer({ secretKey: config.secretKey }))
      app.service('billing/customer').hooks({ before: { all: disallow('external') } })
      app.use('/billing/card', new Card({ secretKey: config.secretKey }))
      app.service('billing/card').hooks({ before: { all: disallow('external') } })
      app.use('/billing/subscription', new Subscription({ secretKey: config.secretKey }))
      app.service('billing/subscription').hooks({ before: { all: disallow('external') } })
    },
    // Used to perform service actions such as create a billing customer, subscription, charge etc.
    async create (data, params) {
      debug(`billing service called for create action=${data.action}`)
      if (_.isNil(data.billingObjectId)) throw new BadRequest('create: missing billing object id')
      if (_.isNil(data.billingObjectService)) throw new BadRequest('update: missing billing object service')
      switch (data.action) {
        case 'customer':
          let customer = await this.createCustomer(data)
          return customer
        case 'subscription':
          let subscription = await this.createSubscription(data)
          return subscription
      }
    },
    // Used to perform service actions such as update a billing subscription etc.
    async update (id, data, params) {
      debug(`billing service called for update action=${data.action}`)
      if (_.isNil(data.billingObjectId)) throw new BadRequest('create: missing billing object id')
      if (_.isNil(data.billingObjectService)) throw new BadRequest('update: missing billing object service')
      switch (data.action) {
        case 'customer':
          let customer = await this.updateCustomer(id, data)
          return customer
        case 'subscription':
          let subscription = await this.updateSubscription(id, data)
          return subscription
      }
    },
    // Used to perform service actions such as remove a billing customer etc.
    async remove (id, params) {
      const query = params.query
      debug(`billing service called for remove action=${query.action}`)
      if (_.isNil(query.billingObjectId)) throw new BadRequest('create: missing billing object id')
      if (_.isNil(query.billingObjectService)) throw new BadRequest('remove: missing billing object service')
      switch (query.action) {
        case 'customer':
          await this.removeCustomer(id, query, _.get(params, 'patch', true))
          break
        case 'subscription':
          await this.removeSubscription(id, query, _.get(params, 'patch', true))
          break
      }
    }
  }
}
