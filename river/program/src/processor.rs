use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    //program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
    //system_instruction,
};

// use spl_token::state::Account as TokenAccount;

use crate::{error::RiverError, instruction::RiverInstruction, state::River};

pub struct Processor;
impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = RiverInstruction::unpack(instruction_data)?;

        match instruction {
            RiverInstruction::AccumInstruction { amount } => {
                msg!("Instruction: SomeSimpleInstruction");
                Self::process_accum(accounts, amount, program_id)
            }
            RiverInstruction::Init => {
                msg!("Instruction: Init");
                Self::process_init(accounts, program_id)
            }
            RiverInstruction::Close => {
                msg!("Instruction: Close");
                Self::process_close(accounts, program_id)
            }
        }
    }
    fn process_init(accounts: &[AccountInfo], program_id: &Pubkey) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let initializer = next_account_info(account_info_iter)?;
        if !initializer.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        // use this for PDA for some static data
        // system_instruction::create_account();

        let config_account = next_account_info(account_info_iter)?;
        if config_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }
        let rent = &Rent::from_account_info(next_account_info(account_info_iter)?)?;

        if !rent.is_exempt(config_account.lamports(), config_account.data_len()) {
            return Err(RiverError::NotRentExempt.into());
        }
        msg!("config_account: {:?}...", &config_account);

        let mut config_info = River::unpack_unchecked(&config_account.try_borrow_data()?)?;
        msg!("unpack done: {:?}...", &config_info);
        if config_info.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }

        config_info.owner = *initializer.key;
        config_info.is_initialized = true;
        config_info.accumulator = 0;
        config_info.user_changes = 0;
        config_info.last_user = *initializer.key;

        River::pack(config_info, &mut config_account.try_borrow_mut_data()?)?;

        Ok(())
    }

    fn process_close(accounts: &[AccountInfo], program_id: &Pubkey) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let initializer = next_account_info(account_info_iter)?;
        if !initializer.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        // use this for PDA for some static data
        //system_instruction::create_account();

        let config_account = next_account_info(account_info_iter)?;
        if config_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }

        let config_info = River::unpack_unchecked(&config_account.try_borrow_data()?)?;
        msg!("unpack done: {:?}...", &config_info);

        if !config_info.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        //let initializers_main_account = next_account_info(account_info_iter)?;

        if config_info.owner != *initializer.key {
            return Err(ProgramError::InvalidAccountData);
        }

        msg!("Closing config account...");
        **initializer.try_borrow_mut_lamports()? = initializer
            .lamports()
            .checked_add(config_account.lamports())
            .ok_or(RiverError::AmountOverflow)?;
        **config_account.try_borrow_mut_lamports()? = 0;
        *config_account.try_borrow_mut_data()? = &mut [];

        Ok(())
    }

    fn process_accum(accounts: &[AccountInfo], amount: u64, program_id: &Pubkey) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let initializer = next_account_info(account_info_iter)?;
        if !initializer.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let config_account = next_account_info(account_info_iter)?;
        if config_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }
        //msg!("config_account: {:?}...", &config_account);

        let mut config_info = River::unpack_unchecked(&config_account.try_borrow_data()?)?;
        //msg!("unpack done: {:?}...", &config_info);
        if !config_info.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        config_info.accumulator = config_info
            .accumulator
            .checked_add(amount)
            .ok_or(RiverError::AmountOverflow)?;

        if config_info.last_user != *initializer.key {
            config_info.user_changes = config_info
                .user_changes
                .checked_add(1)
                .ok_or(RiverError::AmountOverflow)?;
        }
        config_info.last_user = *initializer.key;

        River::pack(config_info, &mut config_account.try_borrow_mut_data()?)?;
        Ok(())
    }
}
