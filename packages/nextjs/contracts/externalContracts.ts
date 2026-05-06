import { MONAD_GUARD_ABI, MONAD_GUARD_ADDRESS } from "~~/utils/monadGuard";
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const externalContracts = {
  31337: {
    MonadGuard: {
      address: MONAD_GUARD_ADDRESS,
      abi: MONAD_GUARD_ABI,
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
