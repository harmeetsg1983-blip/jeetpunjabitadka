# JPT Exact Ringtones

This directory is reserved for the original ringtone binaries used by the live apps.

Do not rename, convert, compress, substitute, or interchange these files.

## Locked GitHub event-code mapping

| GitHub event code | Role | Event | Behaviour | Required file |
|---|---|---|---|---|
| JPT_RESTAURANT_NEW_ORDER_ALERT | Restaurant Partner | Customer places NEW order | Continuous loop until ACCEPT or REJECT | 1000449570.mp4 |
| JPT_DELIVERY_NEW_OFFER_ALERT | Delivery Partner | New delivery OFFER arrives | Continuous loop until ACCEPT or REJECT | 1000449571.mp4 |
| JPT_DELIVERY_READY_ALERT | Delivery Partner | Assigned order becomes READY | One-shot only | 1000449491.mp4 |
| JPT_ORDER_ACCEPTED_ALERT | Restaurant Partner + Customer | Order / delivery assignment accepted | One-shot only | 1000449572.mp4 |

## Exact binary identity

| Required file | Size | SHA-256 |
|---|---:|---|
| 1000449570.mp4 | 2,780,660 bytes | 9106a098deac4d9493924457ea676ec3bc2bc2460e54d902703aa1c878fd63c4 |
| 1000449571.mp4 | 2,825,197 bytes | d491bc664f55ac0c4e717e60b9b85827fad589c15153436000367e6264a3860c |
| 1000449491.mp4 | 240,411 bytes | a58e72cf61fb57a380cdbdb570468afa72e85f795499fc8485a6d8faffbaaefa |
| 1000449572.mp4 | 237,252 bytes | 34231d662e3416f66278820b187c4116189019e7bae4122e9d0295d10cedbb15 |

The application source uses these exact paths under ./ringtones/. The semantic event code is documentation/mapping only; the binary filename remains the locked production filename.

The binary files themselves must be present before the ringtone feature can be considered deployment-verified.
