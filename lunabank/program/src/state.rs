use solana_program::{
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

use arrayref::{array_mut_ref, array_ref, array_refs, mut_array_refs};

#[derive(Debug)]
pub struct Lunabank {
    pub is_initialized: bool,
    pub owner: Pubkey,
    pub base_token_mint: Pubkey,
    pub recipe_token_mint: Pubkey,
    pub base_token_account: Pubkey,
    pub coef: u64,
}

impl Sealed for Lunabank {}

impl IsInitialized for Lunabank {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl Pack for Lunabank {
    const LEN: usize = 137;
    fn pack_into_slice(&self, dst: &mut [u8]) {
        let dst = array_mut_ref![dst, 0, Lunabank::LEN];
        let (
            is_initialized_dst,
            owner_dst,
            base_token_mint_dst,
            recipe_token_mint_dst,
            base_token_account_dst,
            coef_dst,
        ) = mut_array_refs![dst, 1, 32, 32, 32, 32, 8];

        let Lunabank {
            is_initialized,
            owner,
            base_token_mint,
            recipe_token_mint,
            base_token_account,
            coef,
        } = self;

        is_initialized_dst[0] = *is_initialized as u8;
        owner_dst.copy_from_slice(owner.as_ref());
        base_token_mint_dst.copy_from_slice(base_token_mint.as_ref());
        recipe_token_mint_dst.copy_from_slice(recipe_token_mint.as_ref());
        base_token_account_dst.copy_from_slice(base_token_account.as_ref());
        *coef_dst = coef.to_le_bytes();
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let src = array_ref![src, 0, Lunabank::LEN];
        let (is_initialized, owner, base_token_mint, recipe_token_mint, base_token_account, coef) =
            array_refs![src, 1, 32, 32, 32, 32, 8];
        let is_initialized = match is_initialized {
            [0] => false,
            [1] => true,
            _ => return Err(ProgramError::InvalidAccountData),
        };

        Ok(Lunabank {
            is_initialized,
            owner: Pubkey::new_from_array(*owner),
            base_token_mint: Pubkey::new_from_array(*base_token_mint),
            recipe_token_mint: Pubkey::new_from_array(*recipe_token_mint),
            base_token_account: Pubkey::new_from_array(*base_token_account),
            coef: u64::from_le_bytes(*coef),
        })
    }
}


#[derive(Debug)]
pub struct LunaDeposit {
    pub is_initialized: bool,
    pub owner: Pubkey,
    pub amount: u64,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
}

impl Sealed for LunaDeposit {}

impl IsInitialized for LunaDeposit {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl Pack for LunaDeposit {
    const LEN: usize = 57;
    fn pack_into_slice(&self, dst: &mut [u8]) {
        let dst = array_mut_ref![dst, 0, LunaDeposit::LEN];
        let (
            is_initialized_dst,
            owner_dst,
            amount_dst,
            start_timestamp_dst,
            end_timestamp_dst,
        ) = mut_array_refs![dst, 1, 32, 8, 8, 8];

        let LunaDeposit {
            is_initialized,
            owner,
            amount,
            start_timestamp,
            end_timestamp,
        } = self;

        is_initialized_dst[0] = *is_initialized as u8;
        owner_dst.copy_from_slice(owner.as_ref());
        *amount_dst = amount.to_le_bytes();
        *start_timestamp_dst = start_timestamp.to_le_bytes();
        *end_timestamp_dst = end_timestamp.to_le_bytes();
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let src = array_ref![src, 0, LunaDeposit::LEN];
        let (is_initialized, owner, amount, start_timestamp, end_timestamp) =
            array_refs![src, 1, 32, 8, 8, 8];
        let is_initialized = match is_initialized {
            [0] => false,
            [1] => true,
            _ => return Err(ProgramError::InvalidAccountData),
        };

        Ok(LunaDeposit {
            is_initialized,
            owner: Pubkey::new_from_array(*owner),
            amount: u64::from_le_bytes(*amount),
            start_timestamp: u64::from_le_bytes(*start_timestamp),
            end_timestamp: u64::from_le_bytes(*end_timestamp),
        })
    }
}
