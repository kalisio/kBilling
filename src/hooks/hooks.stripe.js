import _ from 'lodash'
import { BadRequest } from 'feathers-errors'
import { getItems } from 'feathers-hooks-common'
import makeDebug from 'debug'

const debug = makeDebug('kalisio:kBilling:stripe:hooks')

export function validateCharge (hook) {
  console.log('Validating charge code goes here');
  return hook;
}