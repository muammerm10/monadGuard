import os
import sys
import time
from web3 import Web3
from web3.exceptions import ContractLogicError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

# Minimal ABI for submitThreat(bytes32,uint8,string)
ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "_hash", "type": "bytes32"},
            {"internalType": "uint8", "name": "_score", "type": "uint8"},
            {"internalType": "string", "name": "_malwareFamily", "type": "string"}
        ],
        "name": "submitThreat",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
]

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 bridge.py <hash> <score> <verdict_string>")
        sys.exit(1)

    file_hash_str = sys.argv[1]
    threat_score = int(sys.argv[2])
    verdict_string = sys.argv[3]

    print("[+] Handshaking with Monad Testnet...")

    # Connect to Monad Testnet
    w3 = Web3(Web3.HTTPProvider("https://testnet-rpc.monad.xyz"))
    
    if not w3.is_connected():
        print("[-] Error: Failed to connect to Monad Testnet.")
        sys.exit(1)

    if not PRIVATE_KEY or not CONTRACT_ADDRESS:
        print("[-] Error: PRIVATE_KEY or CONTRACT_ADDRESS not set in .env file.")
        sys.exit(1)

    try:
        # Prepare account
        account = w3.eth.account.from_key(PRIVATE_KEY)
        contract_addr = w3.to_checksum_address(CONTRACT_ADDRESS)
        contract = w3.eth.contract(address=contract_addr, abi=ABI)

        # Ensure hash is 32 bytes (64 hex chars + '0x')
        if not file_hash_str.startswith("0x"):
            file_hash_str = "0x" + file_hash_str
        
        # If it's SHA-256 it should be 32 bytes (64 hex characters without 0x)
        if len(file_hash_str) != 66:
            print(f"[-] Error: Invalid hash length. Expected 32 bytes (64 hex characters).")
            sys.exit(1)

        hash_bytes = w3.to_bytes(hexstr=file_hash_str)

        print("[+] Staking 10 MON for Threat Verification...")

        # Build transaction
        nonce = w3.eth.get_transaction_count(account.address)
        
        tx = contract.functions.submitThreat(
            hash_bytes,
            threat_score,
            verdict_string
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'value': w3.to_wei(10, 'ether'),
            'gas': 3000000, # A safe gas limit
            'gasPrice': w3.eth.gas_price
        })

        # Sign transaction
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)

        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        if receipt.status == 1:
            print(f"[!] SUCCESS: Threat Hash {file_hash_str} is now immutable on-chain.")
            print(f"[i] Tx: {tx_hash.hex()}")
        else:
            print(f"[-] Error: Transaction reverted. Tx: {tx_hash.hex()}")

    except ValueError as e:
        error_msg = str(e).lower()
        if "insufficient funds" in error_msg:
            print("[-] Error: Insufficient funds for gas * price + value.")
            print("    Make sure you have enough MON in your wallet to cover the 10 MON stake + gas fees.")
        elif "nonce too low" in error_msg or "nonce" in error_msg:
            print("[-] Error: Nonce issue detected. The transaction nonce may be out of sync. Please try again.")
        else:
            print(f"[-] Error: {e}")
    except ContractLogicError as e:
        print(f"[-] Smart Contract Revert Error: {e}")
    except Exception as e:
        print(f"[-] Unexpected Error: {e}")

if __name__ == "__main__":
    main()
