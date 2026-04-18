import { waitForEvenAppBridge, TextContainerProperty, CreateStartUpPageContainer } from '@evenrealities/even_hub_sdk'

const bridge = await waitForEvenAppBridge()

const textContainer = new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 288,
  borderWidth: 0,
  borderColor: 5,
  paddingLength: 4,
  containerID: 1,
  containerName: 'main',
  content: 'Hello from G2!',
  isEventCapture: 1,
})

const createContainer = new CreateStartUpPageContainer({
  containerTotalNum: 1,
  textObject: [textContainer],
})

const result = await bridge.createStartUpPageContainer(createContainer)
console.log('createStartUpPageContainer result', result)
// result: 0 = success, 1 = invalid, 2 = oversize, 3 = out of memory