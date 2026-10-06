# JPT Alert Sound Policy V1

Locked role/event mapping for the production alert system.

| Asset | Role | Event | Behaviour |
|---|---|---|---|
| ringtones/1000449570.mp4 | Restaurant Partner | Customer places NEW order | Continuous loop until ACCEPT or REJECT |
| ringtones/1000449571.mp4 | Delivery Partner | New delivery OFFER arrives | Continuous loop until ACCEPT or REJECT |
| ringtones/1000449491.mp4 | Delivery Partner | Assigned order becomes READY | One-shot only |
| ringtones/1000449572.mp4 | Restaurant Partner + Customer | Delivery assignment accepted / customer order accepted | One-shot only |

## Identity checks
- 1000449570.mp4: 2,780,660 bytes; SHA-256 9106a098deac4d9493924457ea676ec3bc2bc2460e54d902703aa1c878fd63c4
- 1000449571.mp4: 2,825,197 bytes; SHA-256 d491bc664f55ac0c4e717e60b9b85827fad589c15153436000367e6264a3860c
- 1000449491.mp4: 240,411 bytes; SHA-256 a58e72cf61fb57a380cdbdb570468afa72e85f795499fc8485a6d8faffbaaefa
- 1000449572.mp4: 237,252 bytes; SHA-256 34231d662e3416f66278820b187c4116189019e7bae4122e9d0295d10cedbb15

## Stop rules
- Continuous Restaurant NEW ORDER alert stops immediately on server-confirmed ACCEPT or REJECT.
- Continuous Delivery OFFER alert stops immediately on server-confirmed ACCEPT or REJECT.
- One-shot READY/ASSIGNMENT/CUSTOMER-ACCEPTED alerts never loop.
- Alerts are keyed by order/assignment identity so one event cannot stop another event accidentally.

## Background behaviour
Push notifications are used for background/off-screen delivery. A normal PWA/browser cannot guarantee arbitrary custom audio playback while Android has fully suspended the page; native foreground-service behaviour would be required for a hard OS-level guarantee.

The four binary assets must be present under /ringtones before the production Gate can turn GREEN.
