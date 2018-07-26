import makeDebug from 'debug'
import stripe from 'feathers-stripe';
import { Customer, Card, Charge, Subscription, Invoice, InvoiceItem } from 'feathers-stripe'

const debug = makeDebug('kalisio:kBilling:billing:service')

export default function (name, app, options) {
  return {
    createCustomer (data, params) {
      return new Promise((resolve, reject) => {
        let customerService = app.service('billing/customer')

        let customer = {
          email: data.email,
          source: data.src,
          description: data.description
        }

        customerService.create(customer).then(result => {
          debug('Customer created', result)
          resolve(result)
        }).catch(error => {
          debug('Error creating customer', error)
          reject(error)
        })
      })
    },
    removeCustomer (id, params) {
      return new Promise((resolve, reject) => {
        let customerService = app.service('billing/customer')

        customerService.remove(id)
        .then(result => {
          debug('Customer removed', result)
          resolve(result)
        }).catch(error => {
          debug('Error removing customer', error)
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
          debug('Charge created', result)
          resolve(result)
        }).catch(error => {
          debug('Error creating charge', error)
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
          debug('Subscription created', result)
          resolve(result)
        }).catch(error => {
          debug('Error creating subscription', error)
          reject(error)
        })
      })
    },
    updateSubscription (id, params) {
      return new Promise((resolve, reject) => {
        let subscriptionService = app.service('billing/subscription')

        subscriptionService.update(id, params).then(result => {
          debug('Subscription updated', result)
          resolve(result)
        }).catch(error => {
          debug('Error updating subscription', error)
          reject(error)
        })
      })
    },
    createInvoice (params) {
      return new Promise((resolve, reject) => {
        let invoiceService = app.service('billing/invoice')

        invoiceService.create(params)
        .then(result => {
          debug('Invoice created', result)
          resolve(result)
        })
        .catch(error => {
          debug('Error creating invoice', error)
          reject(error)
        })
      })
    },
    createInvoiceItems (params) {
      return new Promise((resolve, reject) => {
        let invoiceService = app.service('billing/invoice-items')

        invoiceService.create(params)
        .then(result => {
          debug('Invoice item created', result)
          resolve(result)
        })
        .catch(error => {
          debug('Error creating invoice item', error)
          reject(error)
        })
      })
    },
    cancelSubscription (id, params) {
      return new Promise((resolve, reject) => {
        let subscriptionService = app.service('billing/subscription')

        subscriptionService.remove(id, params).then(result => {
          debug('Subscription canceled', result)
          resolve(result)
        }).catch(error => {
          debug('Error canceling subscription', error)
          reject(error)
        })
      })
    },
    removeInvoiceItem (id, params) {
      return new Promise((resolve, reject) => {
        let invoiceService = app.service('billing/invoice-items')

        invoiceService.remove(id)
        .then(result => {
          debug('Invoice item removed', result)
          resolve(result)
        })
        .catch(error => {
          debug('Error removing invoice item', error)
          reject(error)
        })
      })
    },
    listCustomer (data, params) {
      return new Promise((resolve, reject) => {
        let customerService = app.service('billing/customer')

        customerService.find().then(result => {
          resolve(result)
        }).catch(error => {
          debug('Error customer list', error)
          reject(error)
        })

      })
    },
    listCard (id) {
      return new Promise((resolve, reject) => {
        let cardService = app.service('billing/card')

        cardService.find({customer:id}).then(result => {
          resolve(result)
        }).catch(error => {
          debug('Error card list', error)
          reject(error)
        })

      })
    },
    createPaymentMethod (data, params) {
      return new Promise((resolve, reject) => {
        let _data = {
          description: data.payment.customerDescription + ' ' + data.organisationID,
          email: data.payment.customerContact,

        }

        this.createCustomer(_data, params)
        .then(customer => {
          debug('Customer created', customer)
          if (data.payment.token) {
            return this.createCard(customer.id, { source: data.payment.token });
          } else {
            resolve(customer)
          }
        })
        .then(res => {
          debug('Card created', res)
          resolve(res)
        })
        .catch(error => {
          debug('Error creating payment method', error)
          reject(error)
        })
        
      })
    },
    updatePaymentMethod (data, params) {
      return new Promise((resolve, reject) => {

        this.listCard(data.customerID)
        .then(result => {
          debug('Card list', result)
          let cardPromises = []
          result.data.forEach(card=>{
            cardPromises.push(this.removeCard(card.id, { customer: data.customerID }))
          });

          return Promise.all(cardPromises);
        })
        .then(results=>{
          if (data.payment.token) {
            return this.createCard(data.customerID, { source: data.payment.token });
          } else {
            resolve(results)
          }
        })
        .then(res => {
          debug('Card created', res)
          resolve(res)
        })
        .catch(error => {
          debug('Error updating payment method', error)
          reject(error)
        })
        
      })
    },
    removePaymentMethod (id, params) {
      return new Promise((resolve, reject) => {

        this.removeCustomer(id, params)
        .then(result => {
          debug('Customer removed', result)
          resolve(result)
        }).catch(error => {
          debug('Error removing customer', error)
          reject(error)
        })
        
      })
    },
    createCard (customerID, params) {
      return new Promise((resolve, reject) => {
        let cardService = app.service('billing/card')

        cardService.create(params, {customer: customerID}).then(result => {
          debug('Card created', result)
          resolve(result)
        }).catch(error => {
          debug('Error creating card', error)
          reject(error)
        })

      })
    },
    removeCard (id, params) {
      return new Promise((resolve, reject) => {
        let cardService = app.service('billing/card')

        cardService.remove(id, params).then(result => {
          debug('Card removed', result)
          resolve(result)
        }).catch(error => {
          debug('Error removing card', error)
          reject(error)
        })

      })
    },

    setup (app) {
      app.use('/billing/customer', new Customer({ secretKey: app.get('billing').secretKey }))
      app.use('/billing/card', new Card({ secretKey: app.get('billing').secretKey }))
      app.use('/billing/charges', new Charge({ secretKey: app.get('billing').secretKey }))
      app.use('/billing/subscription', new Subscription({ secretKey: app.get('billing').secretKey }))
      app.use('/billing/invoice', new Invoice({ secretKey: app.get('billing').secretKey }))
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
        case 'card':
          return this.createCard(data.id, data.params)
        case 'subscription':
          return this.createSubscription(data, params)
        case 'invoice':
          return this.createInvoice(data.params)
        case 'invoiceItems':
          return this.createInvoiceItems(data.params)
        case 'paymentMethod':
          return this.createPaymentMethod(data, params)
      }
    },
    // Used to perform service actions such as update a billing subscription etc.
    update (data, params) {
      debug(`billing service called for update action=${data.action}`)

      switch (data.action) {
        case 'subscription':
          return this.updateSubscription(data.id, data.params)
        case 'paymentMethod':
          return this.updatePaymentMethod(data, params)
      }
    },
    // Used to perform service actions such as remove a billing customer etc.
    remove (data, params) {
      debug(`billing service called for remove action=${data.action}`)

      switch (data.action) {
        case 'customer':
          return this.removeCustomer(data.id, params)
        case 'subscription':
          return this.cancelSubscription(data.id, params)
        case 'invoiceItems':
          return this.removeInvoiceItem(data.id, params)
        case 'paymentMethod':
          return this.removePaymentMethod(data.id, params)
      }
    },
    // Used to perform service actions such as get list of billing customers etc.
    list (data, params) {
      debug(`billing service called for remove action=${data.action}`)

      switch (data.action) {
        case 'customer':
          return this.listCustomer(data, params)
        case 'customer':
          return this.listCard(data)
      }
    }
  }
}
