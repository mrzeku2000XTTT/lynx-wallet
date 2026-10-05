import init, { new_wallet, address_from_seed, fvk_hex } from '../vendor/zkas-signer/firecash_signer.js';

const NETWORK = 'mainnet';
const VAULT_KEY = 'lynx.vault.v1';
const KDF_ITERS = 210_000;

const session = {
  seedHex: null,
  address: null,
  fvkHex: null,
};
let pending = null;
let signerReady = false;

const $ = (id) => document.getElementById(id);

function show(id) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('hidden', el.id !== id);
  });
}

function setText(id, text, isError = false) {
  const el = $(id);
  if (!el) return;
  el.hidden = !text;
  el.textContent = text || '';
  el.classList.toggle('err', !!isError);
  el.classList.toggle('ok', !!text && !isError);
}

function errMsg(e) {
  if (!e) return 'Unknown error';
  if (typeof e === 'string') return e;
  return e.message || String(e);
}

function groupHex(hex) {
  return (hex || '').replace(/(.{4})/g, '$1 ').trim();
}

function normalizeSeed(raw) {
  return String(raw || '')
    .trim()
    .replace(/^0x/i, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function looksLikePhrase(raw) {
  const words = String(raw || '').trim().split(/\s+/).filter(Boolean);
  return words.length >= 12 && words.every((w) => /^[a-zA-Z]+$/.test(w));
}

function bytesToB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveKey(pin, salt) {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: KDF_ITERS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptVault(pin, payload) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return {
    v: 1,
    network: NETWORK,
    address: payload.address,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERS },
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ct: bytesToB64(new Uint8Array(ct)),
  };
}

async function decryptVault(pin, vault) {
  const key = await deriveKey(pin, b64ToBytes(vault.salt));
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(vault.iv) },
    key,
    b64ToBytes(vault.ct),
  );
  return JSON.parse(new TextDecoder().decode(pt));
}

function loadVault() {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveVault(vault) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

function clearVault() {
  localStorage.removeItem(VAULT_KEY);
  session.seedHex = null;
  session.address = null;
  session.fvkHex = null;
  pending = null;
}

function holdWallet({ seedHex, address, fvkHex }) {
  session.seedHex = seedHex;
  session.address = address;
  session.fvkHex = fvkHex;
}

function shortAddr(addr) {
  if (!addr) return '';
  return addr.length < 20 ? addr : `${addr.slice(0, 12)}…${addr.slice(-8)}`;
}

async function copy(text, noteId, ok) {
  try {
    await navigator.clipboard.writeText(text);
    if (noteId) setText(noteId, ok || 'Copied.');
  } catch {
    if (noteId) setText(noteId, 'Copy failed — select the text instead.', true);
  }
}

function goHome() {
  $('home-address').textContent = session.address || '';
  $('home-seed-box').classList.add('hidden');
  $('home-seed-text').textContent = '';
  setText('home-note', 'Signer: firecash/zkas-signer pkg-new. Seed never leaves this device.');
  show('screen-home');
}

function openBackup(wallet) {
  pending = wallet;
  $('backup-address').textContent = wallet.address;
  $('backup-seed').textContent = groupHex(wallet.seedHex);
  $('backup-ok').checked = false;
  $('backup-continue').disabled = true;
  setText('backup-err', '');
  show('screen-backup');
}

function openPin() {
  $('pin-a').value = '';
  $('pin-b').value = '';
  setText('pin-err', '');
  show('screen-pin');
}

function walletFromSigner(w) {
  const seedHex = w.seed_hex;
  const address = w.address;
  try { w.free(); } catch { /* older glue may omit free */ }
  if (!address || !address.startsWith('zkas:')) {
    throw new Error('Signer returned an address that is not zkas:. Refusing it.');
  }
  if (!/^[0-9a-f]{64}$/.test(seedHex)) {
    throw new Error('Signer returned a seed that is not 32 bytes hex.');
  }
  const fvkHex = fvk_hex(seedHex);
  const check = address_from_seed(seedHex, NETWORK);
  if (check !== address) throw new Error('Address did not round-trip through the signer.');
  return { seedHex, address, fvkHex };
}

async function onCreate() {
  if (!signerReady) return;
  const btn = $('create');
  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = 'Creating…';
  setText('welcome-note', 'Asking the official signer for a new seed on this device.');
  try {
    const w = new_wallet(NETWORK);
    openBackup({ ...walletFromSigner(w), from: 'create' });
  } catch (e) {
    setText('welcome-note', errMsg(e), true);
  } finally {
    btn.textContent = prev;
    btn.disabled = !signerReady;
  }
}

function onImport() {
  if (!signerReady) return;
  $('import-seed').value = '';
  setText('import-err', '');
  setText('import-preview', '');
  show('screen-import');
}

function onImportGo() {
  const raw = $('import-seed').value;
  setText('import-err', '');
  setText('import-preview', '');
  if (looksLikePhrase(raw)) {
    setText(
      'import-err',
      'A recovery phrase is not in firecash/zkas-signer pkg-new. Paste the 64-character hex spending seed from a Lynx backup or from the official signer.',
      true,
    );
    return;
  }
  const seedHex = normalizeSeed(raw);
  if (!/^[0-9a-f]{64}$/.test(seedHex)) {
    setText('import-err', 'Need exactly 64 hex characters (32-byte spending seed).', true);
    return;
  }
  try {
    const address = address_from_seed(seedHex, NETWORK);
    const fvkHex = fvk_hex(seedHex);
    if (!address.startsWith('zkas:')) throw new Error('Derived address is not zkas:.');
    pending = { seedHex, address, fvkHex, from: 'import' };
    setText('import-preview', address);
    openPin();
  } catch (e) {
    setText('import-err', errMsg(e), true);
  }
}

async function onPinSave() {
  const a = $('pin-a').value.trim();
  const b = $('pin-b').value.trim();
  setText('pin-err', '');
  if (!pending) {
    setText('pin-err', 'Nothing to lock. Start from Create or Import.', true);
    return;
  }
  if (!/^[0-9]{6,8}$/.test(a)) {
    setText('pin-err', 'PIN must be 6 to 8 digits.', true);
    return;
  }
  if (a !== b) {
    setText('pin-err', 'PINs do not match.', true);
    return;
  }
  const btn = $('pin-save');
  btn.disabled = true;
  try {
    const vault = await encryptVault(a, pending);
    saveVault(vault);
    holdWallet(pending);
    pending = null;
    $('pin-a').value = '';
    $('pin-b').value = '';
    $('backup-seed').textContent = '';
    goHome();
  } catch (e) {
    setText('pin-err', errMsg(e), true);
  } finally {
    btn.disabled = false;
  }
}

async function onUnlock() {
  const vault = loadVault();
  const pin = $('unlock-pin').value.trim();
  setText('unlock-err', '');
  if (!vault) {
    show('screen-welcome');
    return;
  }
  if (!pin) {
    setText('unlock-err', 'Enter your PIN.', true);
    return;
  }
  const btn = $('unlock-go');
  btn.disabled = true;
  try {
    const payload = await decryptVault(pin, vault);
    const address = address_from_seed(payload.seedHex, NETWORK);
    if (vault.address && address !== vault.address) {
      throw new Error('Unlocked seed does not match the saved address.');
    }
    holdWallet({
      seedHex: payload.seedHex,
      address,
      fvkHex: payload.fvkHex || fvk_hex(payload.seedHex),
    });
    $('unlock-pin').value = '';
    goHome();
  } catch (e) {
    setText('unlock-err', 'Wrong PIN or damaged vault.', true);
    console.warn('unlock failed', errMsg(e));
  } finally {
    btn.disabled = false;
  }
}

function confirmWipe() {
  const ok = window.confirm('Remove this wallet from this browser? The seed is gone unless you saved it.');
  if (!ok) return;
  clearVault();
  $('unlock-pin').value = '';
  $('home-seed-text').textContent = '';
  setText('welcome-note', signerReady
    ? 'Signer ready. Create a wallet or import a 64-hex seed. Keys stay on this device.'
    : 'Loading official ZKas signer…');
  show('screen-welcome');
}

async function boot() {
  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => show(btn.getAttribute('data-back')));
  });
  $('create').addEventListener('click', onCreate);
  $('import').addEventListener('click', onImport);
  $('import-go').addEventListener('click', onImportGo);
  $('backup-ok').addEventListener('change', () => {
    $('backup-continue').disabled = !$('backup-ok').checked;
  });
  $('backup-continue').addEventListener('click', () => {
    if (!$('backup-ok').checked) {
      setText('backup-err', 'Confirm you saved the seed first.', true);
      return;
    }
    openPin();
  });
  $('backup-copy-addr').addEventListener('click', () => copy($('backup-address').textContent, 'backup-err', 'Address copied.'));
  $('backup-copy-seed').addEventListener('click', () => copy(normalizeSeed($('backup-seed').textContent), 'backup-err', 'Seed copied.'));
  $('pin-back').addEventListener('click', () => {
    show(pending?.from === 'create' ? 'screen-backup' : 'screen-import');
  });
  $('pin-save').addEventListener('click', onPinSave);
  $('unlock-go').addEventListener('click', onUnlock);
  $('unlock-pin').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onUnlock();
  });
  $('unlock-wipe').addEventListener('click', confirmWipe);
  $('home-lock').addEventListener('click', () => {
    session.seedHex = null;
    session.fvkHex = null;
    $('home-seed-text').textContent = '';
    const vault = loadVault();
    $('unlock-address').textContent = shortAddr(vault?.address || session.address || '');
    $('unlock-pin').value = '';
    setText('unlock-err', '');
    show('screen-unlock');
  });
  $('home-copy').addEventListener('click', () => copy(session.address, 'home-note', 'Address copied.'));
  $('home-receive').addEventListener('click', () => {
    $('home-address').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setText('home-note', 'This zkas: address is yours. Copy it to receive.');
  });
  $('home-send').addEventListener('click', () => {
    setText(
      'home-note',
      'Send uses verify_and_sign_payment on this device after a daemon prepares the bundle. Connect hosted walletd or local 127.0.0.1:8501 next. Receive already works.',
    );
  });
  $('home-seed').addEventListener('click', () => {
    if (!session.seedHex) {
      setText('home-note', 'Unlock again to show the seed.', true);
      return;
    }
    $('home-seed-text').textContent = groupHex(session.seedHex);
    $('home-seed-box').classList.remove('hidden');
  });
  $('home-copy-seed').addEventListener('click', () => copy(session.seedHex, 'home-note', 'Seed copied.'));
  $('home-wipe').addEventListener('click', confirmWipe);

  try {
    await init();
    signerReady = true;
    $('create').disabled = false;
    $('import').disabled = false;
    const vault = loadVault();
    if (vault?.address) {
      $('unlock-address').textContent = shortAddr(vault.address);
      setText('unlock-err', '');
      show('screen-unlock');
    } else {
      setText('welcome-note', 'Signer ready. Create a wallet or import a 64-hex seed. Keys stay on this device.');
    }
  } catch (e) {
    signerReady = false;
    setText('welcome-note', `Signer failed to load: ${errMsg(e)}`, true);
  }
}

boot();
