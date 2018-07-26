import path from 'path'

module.exports = async function () {
  const app = this
  const servicesPath = path.join(__dirname, '..', 'services')

  app.createService('billing', { servicesPath })
}
