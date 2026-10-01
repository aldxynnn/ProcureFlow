# Goods Receipt Workflow

A PO can be received in multiple transactions.

Example:

`ordered = 100`

`receipt #1 = 60`

`receipt #2 = 40`

`remaining = 0`

The PO moves to `PARTIALLY_RECEIVED` after the first receipt and `FULLY_RECEIVED` once all PO item quantities are received. The PO row is locked before the remaining quantity is calculated.
