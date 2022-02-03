use solana_program::program_error::ProgramError;
use std::convert::TryInto;

use crate::error::RiverError::InvalidInstruction;

pub enum RiverInstruction {
    /// Init account.
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` The account of the person initializing the contract
    /// 1. `[writable]` The config account, it will hold all necessary info about the contract.
    /// 2. `[]` The rent sysvar
    Init,
    /// add amount to accumulator. If last caller differs from current, increment user_changes
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` The account of user
    /// 1. `[writable]` The config account, it will hold all necessary info about contract state.
    AccumInstruction { amount: u64 },
    /// Init account.
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` The account of the person initializing the contract
    /// 1. `[writable]` The config account, it will hold all necessary info about the contract.
    ///
    Close,
}

impl RiverInstruction {
    /// Unpacks a byte buffer into a [EscrowInstruction](enum.EscrowInstruction.html).
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (tag, rest) = input.split_first().ok_or(InvalidInstruction)?;

        Ok(match tag {
            0 => Self::Init,
            1 => Self::AccumInstruction {
                amount: Self::unpack_amount(rest)?,
            },
            2 => Self::Close,
            _ => return Err(InvalidInstruction.into()),
        })
    }

    fn unpack_amount(input: &[u8]) -> Result<u64, ProgramError> {
        let amount = input
            .get(..8)
            .and_then(|slice| slice.try_into().ok())
            .map(u64::from_le_bytes)
            .ok_or(InvalidInstruction)?;
        Ok(amount)
    }
}
