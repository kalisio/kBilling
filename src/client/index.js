import logger from 'loglevel'
import * as mixins from './mixins'

export { mixins }
export * from '../common'

export default function init () {
  const api = this

  // Declare the services
  api.declareService('billing')

  logger.debug('Initializing kalisio billing')
}
