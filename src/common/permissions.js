import { permissions } from 'kCore/common'

export function defineBillingAbilities (subject, can, cannot) {
  if (subject && subject._id) {
    if (subject.organisations) {
      subject.organisations.forEach(organisation => {
        const role = permissions.Roles[organisation.permissions]
        if (role >= permissions.Roles.owner) {
          if (organisation._id) {
            can('service', 'billing')
            can('all', 'billing', { billingObjectId: organisation._id, billingObjectService: 'organisations' })
          }
        }
      })
    }
  }
}
