# firecash/zkas-signer (pkg-new)

Pinned copies of the official money signer. Lynx does not reimplement Orchard.

| | |
|---|---|
| Upstream | https://github.com/firecash/zkas-signer |
| Path | `pkg-new/` |
| Fetched | 2026-10-04 |
| Repo tip at fetch | `156891034be536c58346a49857e29cc5bdfdd3ac` |
| WASM git blob | `2ea9b7ec8f3641111338c648649e04bf85cbc59a` |
| WASM bytes | 498824 |
| WASM SHA-256 | `A22DFABAB0B6129AE4D924A51A1A12608523C1DC3E07965C2897F87DC8A936E9` |
| JS SHA-256 | `832212715FE38BBB9C320036137EA71E0B5635BED5837BD3BCDC5C2C4D42D614` |

Exports used by Lynx: `new_wallet`, `address_from_seed`, `fvk_hex`. Seed stays in the page; the daemon may receive an FVK later, never the seed.

This WASM has no BIP-39 export. Create yields a 32-byte hex spending seed. Import accepts that hex.
