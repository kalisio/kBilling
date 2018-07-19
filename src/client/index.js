import logger from 'loglevel'
export * as mixins from './mixins'
export * from '../common'

export default function init () {
  const api = this

  // Declare the services
  api.declareService('stripe')

  logger.debug('Initializing kalisio billing')
}
