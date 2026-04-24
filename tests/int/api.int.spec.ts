import { getPayload, Payload } from 'payload'
import { getPayloadConfig } from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
const shouldRunPayloadIntegration = process.env.RUN_PAYLOAD_INT === '1'

describe('API', () => {
  beforeAll(async () => {
    if (!shouldRunPayloadIntegration) {
      return
    }

    const payloadConfig = await getPayloadConfig()
    payload = await getPayload({ config: payloadConfig })
  })

  it.skipIf(!shouldRunPayloadIntegration)('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })
})
