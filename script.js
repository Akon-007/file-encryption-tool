const tabEncryptButton = document.getElementById('tab-encrypt');
const tabHashButton = document.getElementById('tab-hash');
const panelEncrypt = document.getElementById('panel-encrypt');
const panelHash = document.getElementById('panel-hash');
const encryptDropzone = document.getElementById('encrypt-dropzone');
const encryptFileInput = document.getElementById('encrypt-file');
const hashDropzone = document.getElementById('hash-dropzone');
const hashFileInput = document.getElementById('hash-file');
const modeSelect = document.getElementById('mode-select');
const passwordInput = document.getElementById('password');
const processButton = document.getElementById('process-button');
const encryptStatus = document.getElementById('encrypt-status');
const hashAlgo = document.getElementById('hash-algo');
const hashOutput = document.getElementById('hash-output');
const hashCompare = document.getElementById('hash-compare');
const hashResult = document.getElementById('hash-result');

let selectedEncryptFile = null;
let selectedHashFile = null;
let currentHash = '';

function activateTab(tab) {
  if (tab === 'encrypt') {
    panelEncrypt.classList.add('tab-active');
    panelHash.classList.remove('tab-active');
    tabEncryptButton.classList.remove('bg-slate-900', 'text-slate-400');
    tabEncryptButton.classList.add('bg-slate-800', 'text-slate-100');
    tabHashButton.classList.remove('bg-slate-800', 'text-slate-100');
    tabHashButton.classList.add('bg-slate-900', 'text-slate-400');
  } else {
    panelEncrypt.classList.remove('tab-active');
    panelHash.classList.add('tab-active');
    tabHashButton.classList.remove('bg-slate-900', 'text-slate-400');
    tabHashButton.classList.add('bg-slate-800', 'text-slate-100');
    tabEncryptButton.classList.remove('bg-slate-800', 'text-slate-100');
    tabEncryptButton.classList.add('bg-slate-900', 'text-slate-400');
  }
}

tabEncryptButton.addEventListener('click', () => activateTab('encrypt'));
tabHashButton.addEventListener('click', () => activateTab('hash'));

function highlightDropzone(dropzone, active) {
  dropzone.classList.toggle('border-sky-500', active);
  dropzone.classList.toggle('bg-slate-900', active);
}

function setupDropzone(dropzone, input, onFileSelected) {
  dropzone.addEventListener('click', () => input.click());
  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    highlightDropzone(dropzone, true);
  });
  dropzone.addEventListener('dragleave', () => {
    highlightDropzone(dropzone, false);
  });
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    highlightDropzone(dropzone, false);
    if (event.dataTransfer.files.length === 0) return;
    input.files = event.dataTransfer.files;
    onFileSelected(input.files[0]);
  });
  input.addEventListener('change', () => {
    if (input.files.length === 0) return;
    onFileSelected(input.files[0]);
  });
}

setupDropzone(encryptDropzone, encryptFileInput, (file) => {
  selectedEncryptFile = file;
  encryptDropzone.querySelector('p').textContent = `Selected: ${file.name}`;
});

setupDropzone(hashDropzone, hashFileInput, (file) => {
  selectedHashFile = file;
  hashDropzone.querySelector('p').textContent = `Selected: ${file.name}`;
  computeHashForFile();
});

function updateStatus(message, positive = true) {
  encryptStatus.textContent = message;
  encryptStatus.classList.remove('hidden');
  encryptStatus.classList.toggle('border-emerald-400', positive);
  encryptStatus.classList.toggle('border-amber-500', !positive);
  encryptStatus.classList.toggle('text-emerald-300', positive);
  encryptStatus.classList.toggle('text-amber-300', !positive);
}

async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 250000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptFile(file, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const data = await file.arrayBuffer();
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  const output = new Uint8Array(salt.byteLength + iv.byteLength + cipher.byteLength);
  output.set(salt, 0);
  output.set(iv, salt.byteLength);
  output.set(new Uint8Array(cipher), salt.byteLength + iv.byteLength);
  return new Blob([output], { type: 'application/octet-stream' });
}

async function decryptFile(file, password) {
  const raw = new Uint8Array(await file.arrayBuffer());
  if (raw.byteLength < 28) {
    throw new Error('File data is too short to contain salt and IV.');
  }
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const cipher = raw.slice(28);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipher
  );
  return new Blob([plain], { type: 'application/octet-stream' });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

processButton.addEventListener('click', async () => {
  encryptStatus.classList.add('hidden');
  const file = selectedEncryptFile;
  const password = passwordInput.value;
  const mode = modeSelect.value;

  if (!file) {
    updateStatus('Please choose a file before processing.', false);
    return;
  }
  if (!password) {
    updateStatus('Enter a password or passphrase to continue.', false);
    return;
  }

  try {
    if (mode === 'encrypt') {
      const encryptedBlob = await encryptFile(file, password);
      downloadBlob(encryptedBlob, `${file.name}.enc`);
      updateStatus('Encryption complete. Download should begin automatically.');
    } else {
      const decryptedBlob = await decryptFile(file, password);
      const outputName = file.name.replace(/\.enc$/i, '') || `${file.name}.dec`;
      downloadBlob(decryptedBlob, outputName);
      updateStatus('Decryption complete. Download should begin automatically.');
    }
  } catch (error) {
    console.error(error);
    updateStatus(`Operation failed: ${error.message}`, false);
  }
});

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hashArrayBuffer(data, algorithm) {
  const digest = await crypto.subtle.digest(algorithm, data);
  return bufferToHex(digest);
}

async function computeHashForFile() {
  if (!selectedHashFile) return;
  const data = await selectedHashFile.arrayBuffer();
  const algorithm = hashAlgo.value;
  currentHash = await hashArrayBuffer(data, algorithm);
  hashOutput.textContent = currentHash;
  updateHashResult();
}

function normalizeHash(value) {
  return value.trim().toLowerCase();
}

function updateHashResult() {
  const expected = normalizeHash(hashCompare.value);
  if (!expected) {
    hashResult.innerHTML = '<p class="text-sm">No hash compared yet.</p>';
    hashResult.classList.remove('border-emerald-400', 'bg-emerald-950', 'text-emerald-200');
    hashResult.classList.remove('border-amber-500', 'bg-amber-950', 'text-amber-200');
    return;
  }

  const match = normalizeHash(currentHash) === expected;
  if (match) {
    hashResult.innerHTML = '<p class="text-base font-semibold text-emerald-200">Match: Integrity verified</p>';
    hashResult.classList.add('border-emerald-400', 'bg-emerald-950', 'text-emerald-200');
    hashResult.classList.remove('border-amber-500', 'bg-amber-950', 'text-amber-200');
  } else {
    hashResult.innerHTML = '<p class="text-base font-semibold text-amber-200">Fail: Hash does not match</p>';
    hashResult.classList.add('border-amber-500', 'bg-amber-950', 'text-amber-200');
    hashResult.classList.remove('border-emerald-400', 'bg-emerald-950', 'text-emerald-200');
  }
}

hashAlgo.addEventListener('change', computeHashForFile);
hashCompare.addEventListener('input', updateHashResult);
