const note = document.getElementById('note');

function say(msg) {
  if (note) note.textContent = msg;
}

document.getElementById('create')?.addEventListener('click', () => {
  say('Create stays closed until firecash/zkas-signer WASM is pinned. Seed would be born on this device, FVK registered with walletd, never a fake zkas: address.');
});

document.getElementById('import')?.addEventListener('click', () => {
  say('Import accepts a 12-word ZIP-32 phrase or 64-hex spending key from the official signer. Same rule: no address until that WASM verifies it.');
});
