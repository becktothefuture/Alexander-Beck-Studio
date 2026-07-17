const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function hashByte(hash, byte) {
  return Math.imul(hash ^ byte, FNV_PRIME) >>> 0;
}
function hashString(hash, value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hash = hashByte(hash, code & 0xff);
    hash = hashByte(hash, code >>> 8);
  }
  return hash;
}

function hashFloat32Array(hash, array) {
  const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (let index = 0; index < bytes.length; index += 1) hash = hashByte(hash, bytes[index]);
  return hash;
}

export function fingerprintAboutNarrativeOutput(output) {
  let hash = FNV_OFFSET;
  hash = hashString(hash, 'positions');
  hash = hashFloat32Array(hash, output.positions);
  hash = hashString(hash, 'presence');
  hash = hashFloat32Array(hash, output.presence);
  hash = hashString(hash, 'size');
  hash = hashFloat32Array(hash, output.size);
  Object.keys(output.attributes || {}).sort().forEach((name) => {
    hash = hashString(hash, name);
    hash = hashFloat32Array(hash, output.attributes[name]);
  });
  return `fnv1a32-v1:${hash.toString(16).padStart(8, '0')}`;
}

export function fingerprintAboutNarrativePairInput({
  fromFingerprint,
  targetFingerprint,
  strategyId,
  strategyVersion,
  fromMatrix,
  toMatrix,
}) {
  let hash = FNV_OFFSET;
  [fromFingerprint, targetFingerprint, strategyId, strategyVersion].forEach((value) => {
    hash = hashString(hash, String(value));
  });
  [...fromMatrix, ...toMatrix].forEach((value) => {
    hash = hashString(hash, Object.is(value, -0) ? '0' : String(value));
  });
  return `fnv1a32-v1:${hash.toString(16).padStart(8, '0')}`;
}
