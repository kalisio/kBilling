import makeDebug from 'debug'
import _ from 'lodash'
const debug = makeDebug('kalisio:kBilling:billing:hooks')

export async function removeBilling (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'removeBilling' hook should only be used as a 'after' hook.`)
  }

  let customer = _.get(hook.result, 'billing.customer', null)
  if (!_.isNil(customer)) {
    let billingObjectId = hook.result._id
    let billingObjectService = hook.service.path
    let customerId = hook.result.billing.customer.id
    debug('Removing billing from object ' + billingObjectId + ' of service ' + billingObjectService)
    const billingService = hook.app.getService('billing')
    await billingService.remove(customerId, {
      query: {
        action: 'customer',
        billingObjectId: billingObjectId,
        billingObjectService: billingObjectService
      },
      patch: false
    })
  }
  return hook
}
