import makeDebug from 'debug'
import _ from 'lodash'
import core, { kalisio, permissions } from 'kCore'
import stripe from 'feathers-stripe'

const debug = makeDebug('kalisio:kBilling:stripe:service')

export default function (name, app, options) {

  return {
    createCustomer (data, params) {
      return new Promise((resolve, reject) => {
        let customerService = app.service('stripe/customer');

        let customer = {
          email: data.email,
          source: data.src,
        }

        customerService.create(customer).then(result => {
          console.log('Customer created', result);
        }).catch(error => {
          console.log('Error creating customer', error);
        });

        resolve();
      })
    },
    removeCustomer (id, params) {
      return new Promise((resolve, reject) => {
        let customerService = app.service('stripe/customer');

        customerService.remove(
          id,
          function(err, confirmation) {
            console.log(err);
          }
        )
        .catch(error => {
          console.log('Error removing customer', error);
        });

        resolve();
      })
    },
    createCharge (src, params) {
      return new Promise((resolve, reject) => {
        let chargeService = app.service('stripe/charges');

        let charge = {
          amount: 400,
          currency: "cad",
          source: src,
          description: "Charge publisher"
        };

        chargeService.create(charge).then(result => {
          console.log('Charge created', result);
        }).catch(error => {
          console.log('Error creating charge', error);
        });

        resolve();
      })
    },
    createSubscription (data, params) {
      return new Promise((resolve, reject) => {
        let subscriptionService = app.service('stripe/subscription');

        let subscription = {
          customer: data.idCustomer,
          items: [
            {
              plan: data.plan,
            },
          ]
        };

        subscriptionService.create(subscription).then(result => {
          console.log('Subscription created', result);
        }).catch(error => {
          console.log('Error creating subscription', error);
        });

        resolve();
      })
    },
    updateSubscription (id, params) {
      return new Promise((resolve, reject) => {
        let subscriptionService = app.service('stripe/subscription');

        subscriptionService.update(id, params).then(result => {
          console.log('Subscription updated', result);
        }).catch(error => {
          console.log('Error updating subscription', error);
        });

        resolve();
      })
    },
    createInvoiceItems (params) {
      return new Promise((resolve, reject) => {
        let invoiceService = app.service('stripe/invoice-items');

        invoiceService.create(params,
          function(err, confirmation) {
            console.log(err);
          }
        )
        .catch(error => {
          console.log('Error creating invoice', error);
        });

        resolve();
      })
    },
    setup (app) {
      app.configure(core)
      app.use('/stripe/customer', stripe.customer({ secretKey: app.get('stripe').secretKey }))
      app.use('/stripe/charges', stripe.charge({ secretKey: app.get('stripe').secretKey }))
      app.use('/stripe/subscription', stripe.subscription({ secretKey: app.get('stripe').secretKey }))
      app.use('/stripe/invoice-items', stripe.invoiceItem({ secretKey: app.get('stripe').secretKey }))
    },
    // Used to perform service actions such as create a stripe customer, subscription, charge etc.
    create (data, params) {
      debug(`stripe service called for create action=${data.action}`)

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
    // Used to perform service actions such as create a stripe subscription etc.
    update (data, params) {
      debug(`stripe service called for update action=${data.action}`)

      switch (data.action) {
        case 'subscription':
          return this.updateSubscription(data.id, data.params)
      }
    },
    // Used to perform service actions such as remove a stripe customer etc.
    remove (data, params) {
      debug(`stripe service called for remove action=${data.action}`)

      switch (data.action) {
        case 'customer':
          return this.removeCustomer(data.id, params)
      }
    },
  }

}