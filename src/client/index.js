import makeDebug from 'debug'
import logger from 'loglevel'
export * as mixins from './mixins'
export * from '../common'

const debug = makeDebug('kalisio:kBilling')

export default function init () {
  const api = this

  debug('Initializing kalisio billing')
}
