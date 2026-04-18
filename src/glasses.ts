import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import {
  CreateStartUpPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
} from '@evenrealities/even_hub_sdk'
import { isPaused, pickNext } from './state'

const CONTAINER_ID = 1
const CONTAINER_NAME = 'quote'
const RECYCLE_NOTICE = 'Starting fresh...'
const RECYCLE_HOLD_MS = 1200

export async function initGlasses(bridge: EvenAppBridge): Promise<void> {
  const first = await pickNext()
  const content = first?.quote.text ?? 'No quotes available'

  const text = new TextContainerProperty({
    xPosition: 0,
    yPosition: 0,
    width: 576,
    height: 288,
    borderWidth: 0,
    borderColor: 0,
    paddingLength: 16,
    containerID: CONTAINER_ID,
    containerName: CONTAINER_NAME,
    content,
    isEventCapture: 1,
  })

  const result = await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [text],
  }))

  if (result !== 0) {
    console.error('[glasses] createStartUpPageContainer failed with code', result)
    return
  }

  bridge.onEvenHubEvent(async (event) => {
    if (!event.textEvent) return
    if (isPaused()) return
    await hitMeNow(bridge)
  })
}

export async function hitMeNow(bridge: EvenAppBridge): Promise<void> {
  const next = await pickNext()
  if (!next) {
    await updateContent(bridge, 'No quotes available')
    return
  }

  if (next.recycled) {
    await updateContent(bridge, RECYCLE_NOTICE)
    await new Promise(r => setTimeout(r, RECYCLE_HOLD_MS))
  }

  await updateContent(bridge, next.quote.text)
}

async function updateContent(bridge: EvenAppBridge, content: string): Promise<void> {
  await bridge.textContainerUpgrade(new TextContainerUpgrade({
    containerID: CONTAINER_ID,
    containerName: CONTAINER_NAME,
    content,
  }))
}
