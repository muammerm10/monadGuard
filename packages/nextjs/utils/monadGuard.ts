export const MONAD_GUARD_ADDRESS = "0x1234567890123456789012345678901234567890"; // Placeholder address

export const MONAD_GUARD_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_hash", "type": "bytes32" },
      { "internalType": "uint8", "name": "_score", "type": "uint8" },
      { "internalType": "string", "name": "_malwareFamily", "type": "string" }
    ],
    "name": "submitThreat",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "hash", "type": "bytes32" }
    ],
    "name": "threats",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "hash", "type": "bytes32" },
      { "indexed": false, "internalType": "uint8", "name": "score", "type": "uint8" },
      { "indexed": false, "internalType": "string", "name": "family", "type": "string" },
      { "indexed": true, "internalType": "address", "name": "submitter", "type": "address" }
    ],
    "name": "ThreatLogged",
    "type": "event"
  }
] as const;
