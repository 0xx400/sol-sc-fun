use crate::{error::LunabankError, state::Key};
use borsh::BorshDeserialize;
use solana_program::{
    account_info::AccountInfo, borsh::try_from_slice_unchecked, entrypoint::ProgramResult,
    program_error::ProgramError, pubkey::Pubkey,
};

pub fn assert_derivation(
    program_id: &Pubkey,
    account: &AccountInfo,
    path: &[&[u8]],
) -> Result<u8, ProgramError> {
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        return Err(LunabankError::DerivedKeyInvalid.into());
    }
    Ok(bump)
}

pub fn assert_signer(account_info: &AccountInfo) -> ProgramResult {
    if !account_info.is_signer {
        Err(ProgramError::MissingRequiredSignature)
    } else {
        Ok(())
    }
}

pub fn assert_writable(account_info: &AccountInfo) -> ProgramResult {
    if !account_info.is_writable {
        Err(ProgramError::InvalidAccountData)
    } else {
        Ok(())
    }
}

pub fn assert_account_key(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.key != owner {
        Err(ProgramError::InvalidAccountData)
    } else {
        Ok(())
    }
}
pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.owner != owner {
        Err(ProgramError::IllegalOwner)
    } else {
        Ok(())
    }
}

pub fn try_from_slice_checked<T: BorshDeserialize>(
    data: &[u8],
    data_type: Key,
    data_size: usize,
) -> Result<T, ProgramError> {
    if (data[0] != data_type as u8 && data[0] != Key::Uninitialized as u8)
        || data.len() != data_size
    {
        return Err(LunabankError::DataTypeMismatch.into());
    }

    let result: T = try_from_slice_unchecked(data)?;

    Ok(result)
}
