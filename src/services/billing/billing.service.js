import makeDebug from 'debug'
import { Customer, Charge, Subscription, InvoiceItem } from 'feathers-stripe'

const debug = makeDebug('kalisio:kBilling:billing:service')

export default function (name, app, options) {
  return {
    createCustomer (data, params) {
      return new Promise((resolve, reject) => {
        let customerService = app.service('billing/customer')

        let customer = {
          email: data.email,
          source: data.src
        }

        customerService.create(customer).then(result => {
          console.log('Customer created', result)
          resolve(result)
        }).catch(error => {
          console.log('Error creating customer', error)
          reject(error)
        })
      })
    },
    removeCustomer (id, params) {
      return new Promise((resolve, reject) => {
        let customerService = app.service('billing/customer')

        customerService.remove(id)
        .then(result => {
          console.log('Customer removed', result)
          resolve(result)
        }).catch(error => {
          console.log('Error removing customer', error)
          reject(error)
        })
      })
    },
    createCharge (src, params) {
      return new Promise((resolve, reject) => {
        let chargeService = app.service('billing/charges')

        let charge = {
          amount: 400,
          currency: 'cad',
          source: src,
          description: 'Charge publisher'
        }

        chargeService.create(charge).then(result => {
          console.log('Charge created', result)
          resolve(result)
        }).catch(error => {
          console.log('Error creating charge', error)
          reject(error)
        })
      })
    },
    createSubscription (data, params) {
      return new Promise((resolve, reject) => {
        let subscriptionService = app.service('billing/subscription')

        let subscription = {
          customer: data.idCustomer,
          items: [
            {
              plan: data.plan
            }
          ]
        }

        subscriptionService.create(subscription).then(result => {
          console.log('Subscription created', result)
          resolve(result)
        }).catch(error => {
          console.log('Error creating subscription', error)
          reject(error)
        })
      })
    },
    updateSubscription (id, params) {
      return new Promise((resolve, reject) => {
        let subscriptionService = app.service('billing/subscription')

        subscriptionService.update(id, params).then(result => {
          console.log('Subscription updated', result)
          resolve(result)
        }).catch(error => {
          console.log('Error updating subscription', error)
          reject(error)
        })
      })
    },
    createInvoiceItems (params) {
      return new Promise((resolve, reject) => {
        let invoiceService = app.service('billing/invoice-items')

        invoiceService.create(params)
        .then(result => {
          console.log('Invoice item created', result)
          resolve(result)
        })
        .catch(error => {
          console.log('Error creating invoice item', error)
          reject(error)
        })
      })
    },
    setup (app) {
      app.use('/billing/customer', new Customer({ secretKey: app.get('billing').secretKey }))
      app.use('/billing/charges', new Charge({ secretKey: app.get('billing').secretKey }))
      app.use('/billing/subscription', new Subscription({ secretKey: app.get('billing').secretKey }))
      app.use('/billing/invoice-items', new InvoiceItem({ secretKey: app.get('billing').secretKey }))
    },
    // Used to perform service actions such as create a billing customer, subscription, charge etc.
    create (data, params) {
      debug(`billing service called for create action=${data.action}`)

      switch (data.action) {
        case 'customer':
          return this.createCustomer(data, params)
        case 'charge':
          return this.createCharge(data.src, params)
        case 'subscription':
          return this.createSubscription(data, params)
        case 'invoiceItems':
          return this.createInvoiceItems(data.params)
      }
    },
    // Used to perform service actions such as create a billing subscription etc.
    update (data, params) {
      debug(`billing service called for update action=${data.action}`)

      switch (data.action) {
        case 'subscription':
          return this.updateSubscription(data.id, data.params)
      }
    },
    // Used to perform service actions such as remove a billing customer etc.
    remove (data, params) {
      debug(`billing service called for remove action=${data.action}`)

      switch (data.action) {
        case 'customer':
          return this.removeCustomer(data.id, params)
      }
    }
  }
}
