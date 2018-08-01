import makeDebug from 'debug'
import _ from 'lodash'
import { Customer, Card, Subscription } from 'feathers-stripe'
import { BadRequest } from '@feathersjs/errors'

const debug = makeDebug('kalisio:kBilling:billing:service')

const customerInputFields = ['email', 'description', 'business_vat_id']
const customerOuputFields = ['id', 'email', 'description', 'business_vat_id']

export default function (name, app, options) {
  const config = app.get('billing')
  return {
    async createCard (customerId, token) {
      debug('Create card ' + token + ' for customer ' + customerId)
      const cardService = app.service('billing/card')
      let card = await cardService.create({source: token}, {customer: customerId})
      return { id: card.id, brand: card.brand, last4: card.last4 }
    },
    async removeCard (customerId) {
      debug('Remove card from customer ' + customerId)
      const cardService = app.service('billing/card')
      let cards = await cardService.find({customer: customerId})
      for (var i = 0; i < cards.data.length; i++) {
        await cardService.remove(cards.data[i].id, {customer: customerId})
      }
    },
    async createCustomer (data) {
      let customerData = _.pick(data, customerInputFields)
      if (_.isNil(customerData.email)) throw new BadRequest(`createCustomer: missing 'email' parameter`)
      debug('Create customer ' + customerData.email)
      const customerService = app.service('billing/customer')
      let stripeCustomer = await customerService.create(customerData)
      let customerObject = Object.assign(_.pick(stripeCustomer, customerOuputFields))
      if (!_.isNil(_.get(data, 'token', null))) {
        let card = await this.createCard(stripeCustomer.id, data.token)
        customerObject = Object.assign(customerObject, {card: card})
      }
      const billingObjectService = app.getService(data.billingObjectService)
      await billingObjectService.patch(data.billingObjectId, { 'billing.customer': customerObject })
      return customerObject
    },
    async updateCustomer (customerId, data) {
      let customerData = _.pick(data, customerInputFields)
      debug('Update customer ' + customerId)
      const customerService = app.service('billing/customer')
      let stripeCustomer = await customerService.update(customerId, customerData)
      if (stripeCustomer.sources.total_count > 0) {
        await this.removeCard(customerId)
      }
      if (stripeCustomer.subscriptions.total_count > 0) {
        // FIXME: manage existing subscription
      }
      let customerObject = Object.assign(_.pick(stripeCustomer, customerOuputFields))
      if (!_.isNil(_.get(data, 'token', null))) {
        let card = await this.createCard(customerId, data.token)
        customerObject = Object.assign(customerObject, {card: card})
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
      // Map the input parameters to the parameters requested by the underlying feathers service
      let subscriptionData = _.mapKeys(_.pick(data, ['customerId', 'planId', 'billing']), (value, key) => {
        if (key === 'customerId') return 'customer'
        if (key === 'planId') return 'plan'
        if (key === 'billing') return 'billing'
      })
      let billingMethod = _.get(subscriptionData, 'billing', 'charge_automatically')
      if (billingMethod === 'send_invoice') subscriptionData['days_until_due'] = config.daysUntilInvoiceDue
      // Check the required parameters
      if (_.isNil(subscriptionData.customer)) throw new BadRequest(`createSubscription: missing 'customer' parameter`)
      if (_.isNil(subscriptionData.plan)) throw new BadRequest(`createSubscription: missing 'plan' parameter`)
      // Create the subscription
      debug('Create subscription for ' + data.customer + ' for plan ' + subscriptionData.plan)
      let subscriptionService = app.service('billing/subscription')
      let stripeSubscription = await subscriptionService.create(subscriptionData)
      let subscriptionObject = _.pick(stripeSubscription, ['id', 'plan.id', 'plan.nickname'])
      const billingObjectService = app.getService(data.billingObjectService)
      await billingObjectService.patch(data.billingObjectId, { 'billing.subscription': subscriptionObject })
      return subscriptionObject
    },
    async removeSubscription (subscriptionId, query, patch) {
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
      app.use('/billing/card', new Card({ secretKey: config.secretKey }))
      app.use('/billing/subscription', new Subscription({ secretKey: config.secretKey }))
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
