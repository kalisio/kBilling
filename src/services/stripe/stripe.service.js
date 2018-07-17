import makeDebug from 'debug'
import _ from 'lodash'
import core, { kalisio, permissions } from 'kCore'

const debug = makeDebug('kalisio:kBilling:stripe:service')

export default function (name, app, options) {
  let userService = app.getService('users')

  return {
    create (data, params) {
      return new Promise((resolve, reject) => {
        let userObject
        let customerService = app.service('stripe/customer');
        let tokenService = app.service('stripe/tokens');

        let customer = {
          email: data.email,
          source: 'tok_visa',
        }

        customerService.create(customer).then(result => {
          return userService.create({ email: result.email, name: data.email, stripe_id:result.id }, { checkAuthorisation: true })
          .then(user => {
            userObject = user
            return userService.find({ query: { 'profile.name': result.email }, user: userObject, checkAuthorisation: true })
          })
        }).catch(error => {
          console.log('Error creating customer', error);
        });

        resolve();
      })
    },
    remove (email, params) {
      return new Promise((resolve, reject) => {
        let userObject;
        let customerService = app.service('stripe/customer');

        userService.find({ query: { email: email }})
        .then(users => {
          userObject = users.data[0]
          if (userObject) {
            customerService.remove(
              userObject.stripe_id,
              function(err, confirmation) {
                console.log(err);
              }
            )
            .then((result)=>{
              userService.remove(userObject._id, {
                user: userObject,
                checkAuthorisation: true
              })
              .catch(error => {
                console.log('Error removing customer from db', error);
              });

            })
            .catch(error => {
              console.log('Error removing customer', error);
            });
          }
        })

        resolve();
      })
    },
    charge (src, params) {
      return new Promise((resolve, reject) => {
        let chargeService = app.service('stripe/charges');

        let charge = {
          source: src, // obtained with Stripe.js
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
    setup (app) {
      const config = app.get('stripe')
      if (config && config.cache) {
        // Store abilities of the N most active users in LRU cache (defaults to 1000)
        this.cache = new LruCache(config.cache.maxUsers || 1000)
        debug('Using LRU cache for user abilities')
      } else {
        debug('Do not use LRU cache for user abilities')
      }
    },
  }

}