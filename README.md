# Lynx

**Lynx** is a Scorpion-style PWA for **ZKas** (`ZKAS`). Scorpion is the Kaspa / KCC20 wallet. Lynx is the ZKas sibling: silent, fast, shielded by default.

This is not an official ZKas product. The ZKas mark is used as-is from [zkas.info/branding](https://zkas.info/branding).

## Name

| | Kaspa | ZKas |
|---|---|---|
| Chain | Transparent BlockDAG | Shielded BlockDAG (Orchard + Halo 2) |
| Speed | Fast | ~1 second target |
| Wallet | **Scorpion** | **Lynx** |
| Animal | Striker you can see | Night hunter you do not |

A lynx sits still, then takes the animal in one move. That is ZKas: private by construction, one-second blocks.

## Brand

Official ZKas palette ([branding](https://zkas.info/branding)):

| Token | Hex |
|---|---|
| Mint | `#18D8BD` |
| Ink | `#07100E` |
| Panel | `#0C1815` |
| Paper | `#F1F8F5` |

- Project name: **ZKas** (capital Z, capital K). Ticker: **ZKAS**.
- Official circular **ZK** mark stays untouched. Lynx is our wallet face. They sit side by side, never fused into one lockup.

## What Jack-Kane’s repo is

[Jack-Kane2468/zkas-easy-node-and-wallet](https://github.com/Jack-Kane2468/zkas-easy-node-and-wallet) is a **Windows node manager**. It runs `zkas-rusty`, a local wallet daemon on `http://127.0.0.1:8501`, and the official signer WASM. Browser CORS is off. Seeds stay on that PC.

Lynx does not wrap that EXE. Lynx is a phone/desktop PWA. The manager is an optional **local daemon** later (`127.0.0.1:8501`), the same localhost hole the official web wallet already allows.

## Real stack (no fake addresses)

| Piece | Source |
|---|---|
| Client | [`@zkas/sdk`](https://github.com/firecash/zkas-sdk) — watch, balance, history, prepare → verify → sign → submit |
| Signer | [`firecash/zkas-signer`](https://github.com/firecash/zkas-signer) WASM. Seed never leaves the device. No blind signing. Fee ceiling 0.1 ZKAS. |
| Scan / prove | Hosted `walletd` **or** the user’s local Jack-Kane / `zkas-rusty` daemon. Daemon gets an **FVK**, never the seed. |
| Official web wallet | https://wallet.zkas.info — same hybrid model we follow |

Create / receive / send stay closed until the official signer WASM is pinned. This app will not invent a `zkas:` address.

## Trust

1. Spending key stays in Lynx (PIN vault).
2. Daemon may see activity (FVK). It cannot move funds.
3. Signer rebuilds the bundle on device and refuses a fee above the quote.

## Live

- GitHub: https://github.com/mrzeku2000XTTT/lynx-wallet
- Web app: https://mrzeku2000xttt.github.io/lynx-wallet/
- Vercel: import that GitHub repo at https://vercel.com/new (project name `lynx-wallet`)

Safari / Chrome → Share / Install → Add to Home Screen for the PWA.

## Run locally

Open over HTTPS (or a local static server). `file://` is not a wallet origin.

```powershell
npx --yes serve "C:\Users\mrzek\lynx-wallet" -p 4173
```
