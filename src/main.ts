import './style.css'
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { initState } from './state'
import { initGlasses } from './glasses'
import { renderPhone } from './phone'

const bridge = await waitForEvenAppBridge()
await initState(bridge)

const root = document.querySelector<HTMLDivElement>('#app')!
renderPhone(root, bridge)

await initGlasses(bridge)
