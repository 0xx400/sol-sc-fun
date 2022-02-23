use crate::utils::try_from_slice_checked;
//use arrayref::{array_mut_ref, array_ref, array_refs, mut_array_refs};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

pub const LUNA_OWNER_PREFIX: &str = "lunaowner";
pub const LUNA_DEPOSIT_PREFIX: &str = "deposit";

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone, Copy)]
pub enum Key {
    Uninitialized,
    LunabankV1,
    LunaDepositV1,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct Lunabank {
    pub key: Key,
    pub owner: Pubkey,
    pub base_token_mint: Pubkey,
    pub recipe_token_mint: Pubkey,
    pub base_token_account: Pubkey,
    pub coef: u64,
}

impl IsInitialized for Lunabank {
    fn is_initialized(&self) -> bool {
        self.key != Key::Uninitialized
    }
}

impl Sealed for Lunabank {}

impl Pack for Lunabank {
    const LEN: usize = 1 //  key
        + 32 // owner
        + 32 // base_token_mint
        + 32 // recipe_token_mint
        + 32 // base_token_account
        + 8; // coef
    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut slice = dst;
        self.serialize(&mut slice).unwrap();
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let luna_bank: Lunabank = try_from_slice_checked(src, Key::LunabankV1, Self::LEN)?;
        Ok(luna_bank)
    }
}

impl Lunabank {
    pub fn from_account_info(a: &AccountInfo) -> Result<Lunabank, ProgramError> {
        let lunabank: Lunabank = Self::unpack_from_slice(&a.data.borrow_mut())?;
        Ok(lunabank)
    }
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct LunaDeposit {
    pub key: Key,
    pub owner: Pubkey,
    pub amount: u64,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
}

impl Sealed for LunaDeposit {}

impl Pack for LunaDeposit {
    const LEN: usize = 1 // key
        + 32 // owner
        + 8 // amount
        + 8 // start_timestamp
        + 8; // end_timestamp
    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut slice = dst;
        self.serialize(&mut slice).unwrap();
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let luna_deposit: LunaDeposit = try_from_slice_checked(src, Key::LunaDepositV1, Self::LEN)?;
        Ok(luna_deposit)
    }
}

impl IsInitialized for LunaDeposit {
    fn is_initialized(&self) -> bool {
        self.key != Key::Uninitialized
    }
}

impl LunaDeposit {
    pub fn from_account_info(a: &AccountInfo) -> Result<LunaDeposit, ProgramError> {
        let luna_deposit: LunaDeposit = Self::unpack_from_slice(&a.data.borrow_mut())?;
        Ok(luna_deposit)
    }
}
