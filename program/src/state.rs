use solana_program::{
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

use arrayref::{array_mut_ref, array_ref, array_refs, mut_array_refs};

#[derive(Debug)]
pub struct River {
    pub is_initialized: bool,
    pub owner: Pubkey,
    pub last_user: Pubkey,
    pub accumulator: u64,
    pub user_changes: u64,
}

impl Sealed for River {}

impl IsInitialized for River {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl Pack for River {
    const LEN: usize = 81;
    fn pack_into_slice(&self, dst: &mut [u8]) {
        let dst = array_mut_ref![dst, 0, River::LEN];
        let (
            is_initialized_dst,
            owner_dst,
            last_user_dst,
            accumulator_dst,
            user_changes_dst,
        ) = mut_array_refs![dst, 1, 32, 32, 8, 8];

        let River {
            is_initialized,
            owner,
            last_user,
            accumulator,
            user_changes,
        } = self;

        is_initialized_dst[0] = *is_initialized as u8;
        owner_dst.copy_from_slice(owner.as_ref());
        last_user_dst.copy_from_slice(last_user.as_ref());
        *accumulator_dst = accumulator.to_le_bytes();
        *user_changes_dst = user_changes.to_le_bytes();
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let src = array_ref![src, 0, River::LEN];
        let (
            is_initialized,
            owner,
            last_user,
            accumulator,
            user_changes,
        ) = array_refs![src, 1, 32, 32, 8, 8];
        let is_initialized = match is_initialized {
            [0] => false,
            [1] => true,
            _ => return Err(ProgramError::InvalidAccountData),
        };

        Ok(River {
            is_initialized,
            owner: Pubkey::new_from_array(*owner),
            last_user: Pubkey::new_from_array(*last_user),
            accumulator: u64::from_le_bytes(*accumulator),
            user_changes: u64::from_le_bytes(*user_changes),
        })
    }
}
