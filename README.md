<h1 align="center">MonadGuard: 0-Day Threat Registry</h1>

<p align="center">
  <strong>Fortifying the Ledger through Decentralized Heuristics</strong><br>
  A high-performance C++ heuristic engine bridged to the Monad network.
</p>

## Overview

MonadGuard is a next-generation 0-day malware detection system and threat registry built on the **Monad network**. 
It combines a blazing fast C++ heuristic analysis engine with an immutable smart contract backend, allowing security researchers to analyze executables, register zero-day threats on-chain, and earn $MON rewards for securing the ecosystem.

## 🏗️ Repository Structure

This repository uses a monorepo architecture to tightly couple the blockchain smart contracts, the frontend application, and the high-performance C++ analysis engine.

```text
monadGuard/
├── agent/                  # C++ Heuristic Analysis Engine (Backend)
│   ├── src/                # C++ source code for PE/ELF parsing
│   └── CMakeLists.txt      # Build configuration for the agent
├── packages/               # Scaffold-ETH 2 Workspaces
│   ├── hardhat/            # Smart Contracts & Deployment Scripts
│   └── nextjs/             # React/Next.js Frontend Dashboard
└── README.md               # You are here
```

> **Why this structure?** By keeping the `agent` (C++ engine) in the same repository as the `packages` (Scaffold-ETH UI/Contracts), we ensure that the API bindings and the data schemas for threat reporting are always in sync. The `.gitignore` is heavily optimized to keep binaries, `node_modules`, and virtual environments out of the version history.

## Features

- **Decentralized Threat Feed:** Watch a real-time stream of zero-day threats staked and logged on the Monad testnet.
- **C++ Heuristic Engine:** Deep parsing of PE and ELF binaries to generate threat scores based on structural anomalies.
- **Monad Reward System:** Submitters of valid threats are rewarded with $MON directly via the `MonadGuard.sol` smart contract.
- **Anti-Farming:** Staking mechanisms and duplicate hash prevention ensures the registry remains high-quality and spam-free.

## Quick Start

### 1. Smart Contracts
Run a local network and deploy the MonadGuard contract:
```bash
yarn install
yarn chain
# In a new terminal:
yarn deploy
```

### 2. Frontend Dashboard
Start the Next.js frontend:
```bash
yarn start
```
Navigate to `http://localhost:3000` to access the MonadGuard dashboard.

### 3. C++ Agent (Optional/Advanced)
To build the native C++ engine (requires CMake and a C++ compiler):
```bash
cd agent
mkdir build && cd build
cmake ..
make
```
*Note: The frontend will gracefully fallback to a simulated Node.js analysis if the C++ binary is not compiled.*

## Smart Contract Reward Logic

The `MonadGuard.sol` contract implements a strict staking and reward mechanism:
1. **Stake:** A researcher stakes exactly `10 MON` to submit a threat hash.
2. **Registry:** The hash is marked as known to prevent duplicate farming.
3. **Reward:** An admin (Owner) can verify the threat. If verified, the `rewardSubmitter` function returns the `10 MON` stake plus an additional `10 MON` reward.

## License
MIT License
