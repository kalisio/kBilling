import makeDebug from 'debug'

const debug = makeDebug('kalisio:kBilling:billing:hooks')

export async function removeBilling (hook) {
  if (hook.type !== 'after') {
    throw new Error(`The 'removeBilling' hook should only be used as a 'after' hook.`)
  }

  let billingObjectId = hook.result._id
  let billingObjectService = hook.service
  let customerId = hook.result.billing.customer.id
  debug('Removing billing from object ' + billingObjectId + ' of service ' + billingObjectService)
  const billingService = hook.app.getService('billing')
  await billingService.remove(customerId, {
    query: {
      action: 'customer',
      billingObjectId: billingObjectId,
      billingObjectService: billingObjectService
    },
    patch: !hook.result.deleted
  })
  return hook
}
