use solana_program::program_error::ProgramError;
use std::convert::TryInto;

use crate::error::LunabankError::InvalidInstruction;

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

impl LunabankInstruction {
    /// Unpacks a byte buffer into a [EscrowInstruction](enum.EscrowInstruction.html).
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (tag, rest) = input.split_first().ok_or(InvalidInstruction)?;
        Ok(match tag {
            0 => Self::Init,
            1 => Self::Close,
            2 => {
                let (amount, rest) = Self::unpack_u64(rest)?;
                let (deposit_time, _rest) = Self::unpack_u64(rest)?;
                Self::DepositInstruction {
                    amount,
                    deposit_time,
                }
            },
            3 => Self::WithdrawInstruction,
            _ => return Err(InvalidInstruction.into()),
        })
    }

    fn unpack_u64(rest: &[u8]) -> Result<(u64, &[u8]), ProgramError> {
        let (amount, rest) = rest.split_at(8);
        let amount = amount
            .try_into()
            .ok()
            .map(u64::from_le_bytes)
            .ok_or(InvalidInstruction)?;
        Ok((amount, rest))
    }
}
