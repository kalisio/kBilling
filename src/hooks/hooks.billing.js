import makeDebug from 'debug'
import _ from 'lodash'
import { hooks } from 'kCore'
const debug = makeDebug('kalisio:kBilling:billing:hooks')

export function populateBillingObject (hook) {
  if (hook.type !== 'before') {
    throw new Error(`The 'populateBillingObject' hook should only be used as a 'before' hook.`)
  }
  return hooks.populateObject({ serviceField: 'billingObjectService', idField: 'billingObject', perspectiveField: 'billingPerspective', throwOnNotFound: true })(hook)
}

export function unpopulateBillingObject (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'unpopulateBillingObject' hook should only be used as a 'after' hook.`)
  }
  return hooks.unpopulateObject({ serviceField: 'billingObjectService', idField: 'billingObject', perspectiveField: 'billingPerspective' })(hook)
}

export async function removeBilling (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'removeBilling' hook should only be used as a 'after' hook.`)
  }

  let customer = _.get(hook.result, 'billing.customer', null)
  if (!_.isNil(customer)) {
    let billingObjectId = hook.result._id
    let billingObjectService = hook.service.path
    debug('Removing billing from object ' + billingObjectId + ' of service ' + billingObjectService)
    const billingService = hook.app.getService('billing')
    await billingService.remove(billingObjectId, {
      query: {
        action: 'customer'
      },
      billingObject: hook.result,
      patch: false
    })
  }
  return hook
}

export async function subscribeDefaultPlan (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'subscribeDefaultPlan' hook should only be used as a 'after' hook.`)
  }

  let billingObjectId = hook.result._id
  let billingObjectService = hook.service.path
  debug('Subscribing object ' + billingObjectId + ' of service ' + billingObjectService + ' to default plan')
  const plans = _.get(hook.app.get('billing'), 'plans')
  if (_.isNil(plans)) {
    throw new Error(`The 'subscribeDefaultPlan' requires billing plans to be defined`)
  }
  let defaultPlan = _.findKey(plans, { default: true })
  if (_.isNil(defaultPlan)) {
    throw new Error(`The 'subscribeDefaultPlan' requires a default billing plan to be defined`)
  }
  const billingService = hook.app.getService('billing')
  await billingService.create({
    action: 'subscription',
    plan: defaultPlan,
    billingObject: billingObjectId,
    billingObjectService: billingObjectService,
    billingPerspective: 'billing'
  })
  return hook
}
