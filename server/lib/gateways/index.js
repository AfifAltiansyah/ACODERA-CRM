import * as midtrans from './midtrans.js'
import { register } from './registry.js'

register(midtrans.name, midtrans)

export { processPayment } from './processor.js'
export { getAdapter, register, listAdapters } from './registry.js'
