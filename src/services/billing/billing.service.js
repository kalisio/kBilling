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
    async createCard (customerId, token) {
      debug('Create card ' + token + ' for customer ' + customerId)
      const cardService = app.service('billing/card')
      let card = await cardService.create({source: token}, {customer: customerId})
      return { id: card.id, brand: card.brand, last4: card.last4 }
    },
    async removeCard (customerId, cardId) {
      debug('Remove card from customer ' + customerId)
      const cardService = app.service('billing/card')
      await cardService.remove(cardId, {customer: customerId})
    },
    async updateBilling (subscriptionId, billingMethod) {
      debug('Update billing for subscription ' + subscriptionId + ' with method ' + billingMethod)
      let subscriptionData = { billing: billingMethod }
      if (billingMethod === 'send_invoice') subscriptionData['days_until_due'] = config.daysUntilInvoiceDue
      const subscriptionService = app.service('billing/subscription')
      await subscriptionService.update(subscriptionId, subscriptionData)
    },
    async createCustomer (data) {
      let stripeCustomerData = toStripeCustomerData(data)
      debug('Create customer ' + stripeCustomerData.email)
      const customerService = app.service('billing/customer')
      let stripeCustomer = await customerService.create(stripeCustomerData)
      let customerObject = Object.assign({id: stripeCustomer.id}, _.omit(data, propertiesToOmit))
      if (!_.isNil(_.get(data, 'token', null))) {
        let card = await this.createCard(stripeCustomer.id, data.token)
        customerObject = Object.assign(customerObject, {card: card})
      }
      const billingObjectService = app.getService(data.billingObjectService)
      await billingObjectService.patch(data.billingObjectId, { 'billing.customer': customerObject })
      return customerObject
    },
    async updateCustomer (customerId, data) {
      let stripeCustomerData = toStripeCustomerData(data)
      debug('Update customer ' + customerId)
      const customerService = app.service('billing/customer')
      let stripeCustomer = await customerService.update(customerId, stripeCustomerData)
      let customerObject = Object.assign({id: customerId}, _.omit(data, propertiesToOmit))
      if (stripeCustomer.sources.total_count > 0) {
        // do we need to remove the card
        if (_.isNil(data.card)) {
          // Card has been removed
          await this.removeCard(customerId, stripeCustomer.sources.data[0].id)
          // Update subscription if needed
          if (stripeCustomer.subscriptions.total_count > 0) {
            if (_.isNil(data.token)) await this.updateBilling(stripeCustomer.subscriptions.data[0].id, 'send_invoice')
          }
        }
        if (!_.isNil(data.token)) {
          // Card has been replaced
          if (!_.isNil(data.card)) await this.removeCard(customerId, stripeCustomer.sources.data[0].id)
          let card = await this.createCard(customerId, data.token)
          customerObject = Object.assign(customerObject, {card: card})
        }
      } else if (!_.isNil(data.token)) {
        // Card has been added
        let card = await this.createCard(customerId, data.token)
        customerObject = Object.assign(customerObject, {card: card})
        // Update subscription if needed
        if (stripeCustomer.subscriptions.total_count > 0) {
          await this.updateBilling(stripeCustomer.subscriptions.data[0].id, 'charge_automatically')
        }
      }
      const billingObjectService = app.getService(data.billingObjectService)
      await billingObjectService.patch(data.billingObjectId, { 'billing.customer': customerObject })
      return customerObject
    },
    async removeCustomer (customerId, query, patch) {
      debug('Remove customer: ' + customerId)
      const customerService = app.service('billing/customer')
      await customerService.remove(customerId)
      if (patch) {
        const billingObjectService = app.getService(query.billingObjectService)
        await billingObjectService.patch(query.billingObjectId, { 'billing.customer': null, 'billing.subscription': null })
      }
    },
    async createSubscription (data) {
      if (_.isNil(data.customerId)) throw new BadRequest(`createSubscription: missing 'customerId' parameter`)
      if (_.isNil(data.planId)) throw new BadRequest(`createSubscription: missing 'planId' parameter`)
      let stripeSubscriptionData = {
        customer: data.customerId,
        plan: data.planId,
        billing: _.get(data, 'billing', 'charge_automatically')
      }
      if (stripeSubscriptionData.billing === 'send_invoice') stripeSubscriptionData['days_until_due'] = config.daysUntilInvoiceDue
      // Create the subscription
      debug('Create subscription for ' + data.customer + ' for plan ' + stripeSubscriptionData.plan)
      const subscriptionService = app.service('billing/subscription')
      let stripeSubscription = await subscriptionService.create(stripeSubscriptionData)
      let subscriptionObject = {
        id: stripeSubscription.id,
        plan: {
          id: stripeSubscription.plan.id,
          name: stripeSubscription.plan.nickname
        }
      }
      const billingObjectService = app.getService(data.billingObjectService)
      await billingObjectService.patch(data.billingObjectId, { 'billing.subscription': subscriptionObject })
      return subscriptionObject
    },
    async removeSubscription (subscriptionId, query, patch) {
      if (_.isNil(query.customerId)) throw new BadRequest(`removeSubscription: missing 'customerId' parameter`)
      if (_.isNil(query.subscriptionId)) throw new BadRequest(`removeSubscription: missing 'subscriptionId' parameter`)
      debug('Remove subscripton: ' + subscriptionId + ' for customer ' + query.customerId)
      const subscriptionService = app.service('billing/subscription')
      await subscriptionService.remove(subscriptionId, {customer: query.customerId})
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
      if (_.isNil(data.billingObjectId) || _.isNil(data.billingObjectService)) throw new BadRequest('create: missing billing object parameters')
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
      if (_.isNil(data.billingObjectId) || _.isNil(data.billingObjectService)) throw new BadRequest('update: missing billing object parameters')
      switch (data.action) {
        case 'customer':
          let customer = await this.updateCustomer(id, data)
          return customer
      }
    },
    // Used to perform service actions such as remove a billing customer etc.
    async remove (id, params) {
      const query = params.query
      debug(`billing service called for remove action=${query.action}`)
      if (_.isNil(query.billingObjectId) || _.isNil(query.billingObjectService)) throw new BadRequest('remove: missing billing object parameters')
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
