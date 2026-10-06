# JPT Alert Event Map V1

These are stable semantic event identifiers for source/runtime documentation.

- JPT_RESTAURANT_NEW_ORDER_ALERT -> ./ringtones/1000449570.mp4
  Restaurant Partner: customer places a NEW order. Continuous alert. Stop on server-confirmed ACCEPT or REJECT.

- JPT_DELIVERY_NEW_OFFER_ALERT -> ./ringtones/1000449571.mp4
  Delivery Partner: new delivery OFFER arrives. Continuous alert. Stop on server-confirmed ACCEPT or REJECT.

- JPT_DELIVERY_READY_ALERT -> ./ringtones/1000449491.mp4
  Delivery Partner: assigned order becomes READY. One-shot alert.

- JPT_ORDER_ACCEPTED_ALERT -> ./ringtones/1000449572.mp4
  Restaurant Partner + Customer: order / delivery assignment accepted. One-shot alert.

IMPORTANT:
The event identifiers are code-level names only. GitHub does not rename or reject binary files based on their semantic names. The production binary filenames remain the locked filenames above, and their SHA-256 identity is enforced by the production gate.
