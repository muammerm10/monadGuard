/**
 * MonadGuard Heuristics Engine — TypeScript port of the C++ analysis agent.
 * Runs natively in Node.js / Vercel serverless without any native binary.
 */
import crypto from "crypto";

// Known malicious ImpHashes (matches the C++ agent list)
const KNOWN_MALICIOUS_IMPHASHES = [
  "d41d8cd98f00b204e9800998ecf8427e",
  "1234567890abcdef1234567890abcdef",
  "b89bf263884c7e6c518d6a78229f3c14",
  "deadbeefdeadbeefdeadbeefdeadbeef",
];

// Packer/obfuscation section names
const SUSPICIOUS_SECTIONS = [".vmp", ".packed", "upx0", "upx1", ".aspack", ".themida"];

// Common malware strings found in binaries
const SUSPICIOUS_STRINGS = [
  "CreateRemoteThread",
  "VirtualAllocEx",
  "WriteProcessMemory",
  "SetWindowsHookEx",
  "keylog",
  "ransomware",
  "bitcoin",
  "TOR",
  "cmd.exe",
  "powershell",
  "regsvr32",
  "WScript",
  "mimikatz",
];

// ─── Entropy ─────────────────────────────────────────────────────────────────

/**
 * Calculate Shannon entropy of a buffer (0 = uniform, 8 = maximum randomness).
 * High entropy (> 7.2) indicates packing or encryption.
 */
export function calculateEntropy(buf: Buffer): number {
  const freq = new Array(256).fill(0);
  for (const byte of buf) freq[byte]++;
  let entropy = 0;
  for (const f of freq) {
    if (f === 0) continue;
    const p = f / buf.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// ─── PE Parser ───────────────────────────────────────────────────────────────

export type PEResult = {
  isPE: boolean;
  scoreModifier: number;
  impHash: string;
  details: string[];
};

/**
 * Parse a Windows PE (MZ) binary and score it for maliciousness.
 * Extracts: machine type, section table, suspicious section names,
 * and computes a pseudo-ImpHash from machine+characteristics+section names.
 */
export function analyzePE(buf: Buffer): PEResult {
  const result: PEResult = { isPE: false, scoreModifier: 0, impHash: "", details: [] };

  if (buf.length < 64) return result;
  // MZ magic
  if (buf[0] !== 0x4d || buf[1] !== 0x5a) return result;

  // PE header pointer at 0x3C
  const peOffset = buf.readUInt32LE(0x3c);
  if (peOffset + 24 >= buf.length) return result;

  // PE\0\0 signature
  if (buf.readUInt32LE(peOffset) !== 0x00004550) return result;
  result.isPE = true;

  // COFF header (immediately after PE signature)
  const machine = buf.readUInt16LE(peOffset + 4);
  const numSections = buf.readUInt16LE(peOffset + 6);
  const characteristics = buf.readUInt16LE(peOffset + 22);
  const sizeOfOptionalHeader = buf.readUInt16LE(peOffset + 20);

  // Score characteristics
  if (numSections > 8) {
    result.scoreModifier += 15;
    result.details.push(`High section count (${numSections})`);
  }
  if (numSections < 2) {
    result.scoreModifier += 10;
    result.details.push(`Suspiciously low section count (${numSections})`);
  }

  // Optional header magic (PE32 = 0x10B, PE32+ = 0x20B)
  const optHeaderOffset = peOffset + 24;
  if (optHeaderOffset + 2 < buf.length) {
    const magic = buf.readUInt16LE(optHeaderOffset);

    // Check for no subsystem (driver) or GUI app hiding as console
    if (optHeaderOffset + 68 < buf.length) {
      const subsystem = buf.readUInt16LE(optHeaderOffset + (magic === 0x20b ? 68 : 68));
      if (subsystem === 1) {
        result.scoreModifier += 20; // Native/kernel driver
        result.details.push("Native kernel subsystem");
      }
    }
  }

  // Section table
  const sectionTableOffset = peOffset + 24 + sizeOfOptionalHeader;
  const sectionNames: string[] = [];

  for (let i = 0; i < Math.min(numSections, 24); i++) {
    const off = sectionTableOffset + i * 40;
    if (off + 40 > buf.length) break;

    const nameBytes = buf.subarray(off, off + 8);
    const name = nameBytes.toString("ascii").replace(/\0/g, "").toLowerCase();
    sectionNames.push(name);

    if (SUSPICIOUS_SECTIONS.some(s => name.startsWith(s))) {
      result.scoreModifier += 25;
      result.details.push(`Packer section detected: ${name}`);
    }

    // Check section entropy (high entropy in code section = packed)
    const rawDataOffset = buf.readUInt32LE(off + 20);
    const rawDataSize = buf.readUInt32LE(off + 16);
    if (rawDataSize > 0 && rawDataOffset + rawDataSize <= buf.length) {
      const sectionBuf = buf.subarray(rawDataOffset, rawDataOffset + Math.min(rawDataSize, 8192));
      const sectionEntropy = calculateEntropy(sectionBuf);
      if (sectionEntropy > 7.5) {
        result.scoreModifier += 10;
        result.details.push(`High-entropy section: ${name || "(unnamed)"} (${sectionEntropy.toFixed(2)})`);
      }
    }
  }

  // Pseudo-ImpHash: MD5 of "machine-numSections-characteristics-sectionnames"
  // Mirrors the intent of the real ImpHash (import table fingerprint)
  const hashInput = `${machine}-${numSections}-${characteristics}-${sectionNames.join(",")}`;
  result.impHash = crypto.createHash("md5").update(hashInput).digest("hex");

  return result;
}

// ─── ELF Parser ──────────────────────────────────────────────────────────────

export type ELFResult = {
  isELF: boolean;
  scoreModifier: number;
  details: string[];
};

/**
 * Parse a Linux ELF binary and score it.
 * Checks: class, type, section count (stripped = suspicious), ABI.
 */
export function analyzeELF(buf: Buffer): ELFResult {
  const result: ELFResult = { isELF: false, scoreModifier: 0, details: [] };

  if (buf.length < 16) return result;
  // \x7FELF magic
  if (buf[0] !== 0x7f || buf[1] !== 0x45 || buf[2] !== 0x4c || buf[3] !== 0x46) return result;
  result.isELF = true;

  const elfClass = buf[4]; // 1=32bit, 2=64bit
  const elfType = buf.readUInt16LE(16); // 1=relocatable, 2=exec, 3=shared, 4=core

  let numSections = 0;
  try {
    if (elfClass === 1 && buf.length >= 52) {
      numSections = buf.readUInt16LE(48);
    } else if (elfClass === 2 && buf.length >= 64) {
      numSections = buf.readUInt16LE(60);
    }
  } catch {
    // Malformed header
  }

  if (numSections === 0) {
    result.scoreModifier += 20;
    result.details.push("Stripped binary (no section headers)");
  }

  // ET_DYN with no sections is a common malware / rootkit pattern
  if (elfType === 3 && numSections === 0) {
    result.scoreModifier += 15;
    result.details.push("Position-independent stripped executable");
  }

  return result;
}

// ─── String Scanner ──────────────────────────────────────────────────────────

/**
 * Scan for suspicious plaintext strings in the binary.
 */
function scanStrings(buf: Buffer): { score: number; found: string[] } {
  const text = buf.toString("ascii");
  const found: string[] = [];
  let score = 0;

  for (const s of SUSPICIOUS_STRINGS) {
    if (text.includes(s)) {
      found.push(s);
      score += 8;
    }
  }
  return { score: Math.min(score, 30), found };
}

// ─── Main Entry ──────────────────────────────────────────────────────────────

export type HeuristicsResult = {
  score: number;
  isCheapClone: boolean;
  details: string[];
  fileType: "PE" | "ELF" | "UNKNOWN";
  entropy: number;
};

/**
 * Run the full heuristics pipeline on a file buffer.
 * Returns a score 0-100 and a cheap-clone flag.
 * This is a direct TypeScript port of the C++ agent logic.
 */
export function runHeuristics(buf: Buffer): HeuristicsResult {
  const details: string[] = [];
  let score = 0;
  let isCheapClone = false;
  let fileType: "PE" | "ELF" | "UNKNOWN" = "UNKNOWN";
  let impHash = "";

  // 1. Shannon entropy
  const entropy = calculateEntropy(buf);
  details.push(`Shannon Entropy: ${entropy.toFixed(2)}`);
  if (entropy > 7.2) {
    score += 30;
    details.push("High entropy detected — possible packer/encryptor");
  }

  // 2. PE or ELF analysis
  const peResult = analyzePE(buf);
  if (peResult.isPE) {
    fileType = "PE";
    score += peResult.scoreModifier;
    impHash = peResult.impHash;
    details.push(...peResult.details);
  } else {
    const elfResult = analyzeELF(buf);
    if (elfResult.isELF) {
      fileType = "ELF";
      score += elfResult.scoreModifier;
      details.push(...elfResult.details);
    }
  }

  // 3. Suspicious string scan
  const strResult = scanStrings(buf);
  if (strResult.found.length > 0) {
    score += strResult.score;
    details.push(`Suspicious API strings: ${strResult.found.slice(0, 5).join(", ")}`);
  }

  // 4. Anti-farming: cheap clone check
  if (impHash && KNOWN_MALICIOUS_IMPHASHES.includes(impHash)) {
    isCheapClone = true;
    details.push("ALERT: Cheap clone detected — matches known malicious ImpHash");
  }

  return {
    score: Math.min(100, score),
    isCheapClone,
    details,
    fileType,
    entropy,
  };
}
