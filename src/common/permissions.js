export function defineUserAbilities (subject, can, cannot) {
  can('service', 'billing')
  can('create', 'billing')
  can('update', 'billing')
  can('remove', 'billing')
}
