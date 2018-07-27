import makeDebug from 'debug'
import _ from 'lodash'
import { Customer, Card, Subscription } from 'feathers-stripe'

const debug = makeDebug('kalisio:kBilling:billing:service')

const customerFields = ['email', 'description', 'business_vat_id']

export default function (name, app, options) {
  const config = app.get('billing')
  return {
    async createCard (customerId, token) {
      debug('Create card ' + token + ' for customer ' + customerId)
      const cardService = app.service('billing/card')
      let card = await cardService.create({source: token}, {customer: customerId})
      return card
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
      let customerData = _.pick(data, customerFields)
      debug('Create customer ' + customerData.email)
      const customerService = app.service('billing/customer')
      let customer = await customerService.create(customerData)
      let card = {}
      if (!_.isNil(data.token)) {
        card = await this.createCard(customer.id, data.token)
      }
      return Object.assign(customer, {card: card})
    },
    async updateCustomer (customerId, data) {
      let customerData = _.pick(data, customerFields)
      debug('Update customer ' + customerId)
      const customerService = app.service('billing/customer')
      let customer = await customerService.update(customerId, customerData)
      let card = {}
      if (!_.isNil(data.token)) {
        await this.removeCard(customerId)
        card = await this.createCard(customerId, data.token)
      }
      return Object.assign(customer, {card: card})
    },
    async removeCustomer (customerId) {
      debug('Remove customer: ' + customerId)
      const customerService = app.service('billing/customer')
      await customerService.remove(customerId)
    },
    async createSubscription (data) {
      let subscriptionData = _.pick(data, ['customer', 'plan'])
      debug('Create subscription for ' + data.customer + ' for plan ' + subscriptionData.plan)
      let subscriptionService = app.service('billing/subscription')
      let subscription = await subscriptionService.create(subscriptionData)
      return subscription
    },
    async removeSubscription (subscriptionId, customerId) {
      debug('Remove subscripton: ' + subscriptionId + ' for customer ' + customerId)
      const subscriptionService = app.service('billing/subscription')
      await subscriptionService.remove(subscriptionId, {customer: customerId})
    },
    setup (app) {
      app.use('/billing/customer', new Customer({ secretKey: config.secretKey }))
      app.use('/billing/card', new Card({ secretKey: config.secretKey }))
      app.use('/billing/subscription', new Subscription({ secretKey: config.secretKey }))
    },
    // Used to perform service actions such as create a billing customer, subscription, charge etc.
    async create (data, params) {
      debug(`billing service called for create action=${data.action}`)

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

      switch (query.action) {
        case 'customer':
          await this.removeCustomer(id)
          break
        case 'subscription':
          await this.removeSubscription(id, params)
          break
      }
    }
  }
}
