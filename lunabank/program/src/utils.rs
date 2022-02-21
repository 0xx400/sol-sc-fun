// use arrayref::{array_mut_ref, array_ref, array_refs, mut_array_refs};
// use borsh::{BorshDeserialize, BorshSerialize};
use crate::error::LunabankError;
use solana_program::{
    account_info::AccountInfo,
    // borsh::try_from_slice_unchecked,
    entrypoint::ProgramResult,
    // msg,
    // program::{invoke, invoke_signed},
    program_error::ProgramError,
    // program_option::COption,
    // program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    // system_instruction,
    // sysvar::{rent::Rent, Sysvar},
};
// use spl_token::{
//     instruction::{set_authority, AuthorityType},
//     state::{Account, Mint},
// };

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

pub fn assert_acc_eq(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.key != owner {
        Err(ProgramError::IllegalOwner)
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
