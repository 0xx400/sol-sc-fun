use thiserror::Error;

use solana_program::program_error::ProgramError;

#[derive(Error, Debug, Copy, Clone)]
pub enum LunabankError {
    /// Invalid instruction
    #[error("Invalid Instruction")]
    InvalidInstruction,
    /// Not Rent Exempt
    #[error("Not Rent Exempt")]
    NotRentExempt,
    /// Expected Amount Mismatch
    #[error("Expected Amount Mismatch")]
    ExpectedAmountMismatch,
    /// Amount Overflow
    #[error("Amount Overflow")]
    AmountOverflow,
    /// Time Overflow
    #[error("Time overflow")]
    TimeOverflow,
    /// Derived key is invalid
    #[error("Derived key is invalid")]
    DerivedKeyInvalid,
    /// Incorrect Owner
    #[error("Incorrect Owner")]
    IncorrectOwner,
    /// WaitPeriod Breach
    #[error("WaitPeriod Breach")]
    WaitPeriodBreach,
}

impl From<LunabankError> for ProgramError {
    fn from(e: LunabankError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
