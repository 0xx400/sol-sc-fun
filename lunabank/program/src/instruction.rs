use borsh::{BorshDeserialize, BorshSerialize};
//use solana_program::program_error::ProgramError;
//use std::convert::TryInto;

//use crate::error::LunabankError::InvalidInstruction;

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub enum LunabankInstruction {
    /// Init account.
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` The account of the person initializing the contract
    /// 1. `[writable]` The config account, it will hold all necessary info about the contract.
    /// 2. `[]` base token mint
    /// 3. `[]` base token account
    /// 4. `[writable]` recipe token mint
    /// 5. `[]` The rent sysvar
    /// 6. `[]` The token program
    Init,
    /// Close account, return all the
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` The account of the person initializing the contract
    /// 1. `[writable]` The config account, it will hold all necessary info about the contract.
    /// 2. `[writable]` base token account
    /// 3. `[writable]` recipe token mint
    /// 4. `[]` The token program
    /// 5. `[]` PDA owner (config + "lunaowner")
    ///
    Close,
    /// Deposit,
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` The account of the person initializing the contract
    /// 1. `[]` The config account, it will hold all necessary info about the contract.
    /// 2. `[]` base token mint
    /// 3. `[writable]` base token account
    /// 4. `[writable]` user base token account
    /// 5. `[writable]` recipe token mint
    /// 6. `[writable]` user recipe token account
    /// 7. `[writable]` PDA user subaccount owner (config + initializer + "deposit")
    /// 8. `[]` PDA owner (config + "lunaowner")
    /// 9. `[]` The token program
    /// 10. `[]` The rent sysvar
    /// 11. `[]` The system program
    /// 12. `[]` The system clock program
    ///
    DepositInstruction { amount: u64, deposit_time: u64 },
    /// Withdraw,
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` The account of the person initializing the contract
    /// 1. `[]` The config account, it will hold all necessary info about the contract.
    /// 2. `[]` base token mint
    /// 3. `[writable]` base token account
    /// 4. `[writable]` user base token account
    /// 5. `[writable]` recipe token mint
    /// 6. `[writable]` user recipe token account
    /// 7. `[writable]` PDA user subaccount owner (config + initializer + "deposit")
    /// 8. `[]` PDA owner (config + "lunaowner")
    /// 9. `[]` The token program
    /// 10. `[]` The system program
    /// 11. `[]` The system clock program
    ///
    WithdrawInstruction,
}
