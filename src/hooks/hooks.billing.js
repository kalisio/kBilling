import makeDebug from 'debug'
import { hooks } from 'kCore'

const debug = makeDebug('kalisio:kBilling:billing:hooks')

export function populateBillingObject (hook) {
  if (hook.type !== 'before') {
    throw new Error(`The 'populateBillingObject' hook should only be used as a 'before' hook.`)
  }

  // This hook is only for some of the operations
  let action = ''
  if (hook.data) {
    action = hook.data.action
  } else if (hook.params && hook.params.query) {
    action = hook.params.query.action
  }

  if (action !== 'paymentMethod') return Promise.resolve(hook)

  debug('populateBillingObject')
  return hooks.populateObject({ serviceField: 'billingObjectService', idField: 'billingObjectId', throwOnNotFound: true })(hook)
}
