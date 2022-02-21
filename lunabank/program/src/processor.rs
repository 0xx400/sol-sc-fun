use mpl_token_metadata::utils::assert_owned_by;
use solana_program::program::invoke_signed;
use solana_program::program_option::COption;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    system_instruction, system_program, sysvar,
    sysvar::{clock::Clock, rent::Rent, Sysvar},
};

use spl_token::instruction::AuthorityType;

use spl_token::state::{Account as TokenAccount, Mint};

use crate::state::LunaDeposit;
use crate::{error::LunabankError, instruction::LunabankInstruction, state::Lunabank};
use crate::utils::{assert_signer, assert_writable, assert_acc_eq};

//use mpl_token_metadata::instruction::MetadataInstruction;

pub struct Processor;
impl Processor {
    fn get_pda_for_config(config_address: &Pubkey, program_id: &Pubkey) -> Pubkey {
        Pubkey::find_program_address(&[&config_address.to_bytes(), b"lunaowner"], program_id).0
    }

    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = LunabankInstruction::unpack(instruction_data)?;

        match instruction {
            LunabankInstruction::Init => {
                msg!("Instruction: Init");
                Self::process_init(accounts, program_id)
            }
            LunabankInstruction::Close => {
                msg!("Instruction: Close");
                Self::process_close(accounts, program_id)
            }
            LunabankInstruction::DepositInstruction {
                amount,
                deposit_time,
            } => {
                msg!(
                    "Instruction: DepositInstruction {} {}",
                    amount,
                    deposit_time
                );
                Self::process_deposit(accounts, program_id, amount, deposit_time)
            }
            LunabankInstruction::WithdrawInstruction => {
                msg!("Instruction: WithdrawInstruction");
                Self::process_withdraw(accounts, program_id)
            }
        }
    }

    fn process_init(accounts: &[AccountInfo], program_id: &Pubkey) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let initializer_info = next_account_info(account_info_iter)?;
        assert_signer(initializer_info)?;

        let config_account_info = next_account_info(account_info_iter)?;
        assert_writable(config_account_info)?;
        assert_owned_by(config_account_info, program_id)?;

        let base_token_mint_info = next_account_info(account_info_iter)?;
        assert_owned_by(base_token_mint_info, &spl_token::id())?;
        // if *base_token_mint.owner != spl_token::id() {
        //     return Err(ProgramError::IllegalOwner);
        // }

        let base_token_account_info = next_account_info(account_info_iter)?;
        assert_owned_by(base_token_account_info, &spl_token::id())?;
        //
        // if *base_token_account.owner != spl_token::id() {
        //     return Err(ProgramError::IllegalOwner);
        // }

        let recipe_token_mint_info = next_account_info(account_info_iter)?;
        //msg!("recipe_token_mint... {:?}", recipe_token_mint);
        assert_writable(recipe_token_mint_info)?;
        assert_owned_by(recipe_token_mint_info, &spl_token::id())?;
        //
        // if !recipe_token_mint.is_writable {
        //     return Err(ProgramError::InvalidInstructionData);
        // }
        // if *recipe_token_mint.owner != spl_token::id() {
        //     return Err(ProgramError::IllegalOwner);
        // }

        let sysvar_account_info = next_account_info(account_info_iter)?;
        assert_acc_eq(sysvar_account_info, &sysvar::rent::id())?;
        //
        // if *sysvar_account.key != sysvar::rent::id() {
        //     return Err(ProgramError::IncorrectProgramId);
        // }

        let tokenprogram_account_info = next_account_info(account_info_iter)?;
        assert_acc_eq(tokenprogram_account_info, &spl_token::id())?;
        //
        // if *tokenprogram_account.key != spl_token::id() {
        //     return Err(ProgramError::IncorrectProgramId);
        // }

        let recipe_token_account_data = Mint::unpack(&recipe_token_mint_info.try_borrow_data()?)?;
        //msg!("recipe_token_mint...{:?}", recipetoken_account_info);

        let recipe_token_owner = Self::get_pda_for_config(config_account_info.key, program_id);

        msg!(
            "pda = {}, cur owner = {:?}",
            recipe_token_owner,
            recipe_token_account_data.mint_authority
        );
        if recipe_token_account_data.mint_authority != COption::Some(*initializer_info.key) {
            return Err(ProgramError::IllegalOwner);
        }

        if recipe_token_account_data.freeze_authority != COption::Some(*initializer_info.key) {
            return Err(ProgramError::IllegalOwner);
        }

        let rent = &Rent::from_account_info(sysvar_account_info)?;

        if !rent.is_exempt(config_account_info.lamports(), config_account_info.data_len()) {
            return Err(LunabankError::NotRentExempt.into());
        }
        msg!("config_account: {:?}...", &config_account_info);

        let mut config_data = Lunabank::unpack_unchecked(&config_account_info.try_borrow_data()?)?;
        msg!("unpack done: {:?}...", &config_data);
        if config_data.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }

        // setup config
        config_data.is_initialized = true;
        config_data.owner = *initializer_info.key;
        config_data.base_token_mint = *base_token_mint_info.key;
        config_data.recipe_token_mint = *recipe_token_mint_info.key;
        config_data.base_token_account = *base_token_account_info.key;
        config_data.owner = *initializer_info.key;
        Lunabank::pack(config_data, &mut config_account_info.try_borrow_mut_data()?)?;

        // transfer authority of reciepe token

        let transfer_to_pda_ix = spl_token::instruction::set_authority(
            tokenprogram_account_info.key,
            recipe_token_mint_info.key,
            Some(&recipe_token_owner),
            AuthorityType::MintTokens,
            initializer_info.key,
            &[initializer_info.key],
        )?;
        msg!("Calling the token program to transfer authority of recipe mint to the bank...");
        invoke(
            &transfer_to_pda_ix,
            &[
                recipe_token_mint_info.clone(),
                initializer_info.clone(),
            ],
        )?;

        let transfer_freeze_to_pda_ix = spl_token::instruction::set_authority(
            tokenprogram_account_info.key,
            recipe_token_mint_info.key,
            Some(&recipe_token_owner),
            AuthorityType::FreezeAccount,
            initializer_info.key,
            &[initializer_info.key],
        )?;

        msg!("Calling the token program to transfer authority of recipe mint to the bank...");
        invoke(
            &transfer_freeze_to_pda_ix,
            &[
                recipe_token_mint_info.clone(),
                initializer_info.clone()
            ],
        )?;

        // owner of

        let transfer_basetoken_to_pda_ix = spl_token::instruction::set_authority(
            tokenprogram_account_info.key,
            base_token_account_info.key,
            Some(&recipe_token_owner),
            AuthorityType::AccountOwner,
            initializer_info.key,
            &[initializer_info.key],
        )?;

        msg!("Calling the token program to transfer owner of token acc to the bank...");
        invoke(
            &transfer_basetoken_to_pda_ix,
            &[
                base_token_account_info.clone(),
                initializer_info.clone(),
            ],
        )?;

        //TODO: create & error check

        Ok(())
    }

    fn process_close(accounts: &[AccountInfo], program_id: &Pubkey) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let initializer = next_account_info(account_info_iter)?;

        if !initializer.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let config_account = next_account_info(account_info_iter)?;
        if !config_account.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }

        let base_token_account = next_account_info(account_info_iter)?;
        if *base_token_account.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }
        if !base_token_account.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }

        let recipe_token_mint = next_account_info(account_info_iter)?;
        //msg!("recipe_token_mint... {:?}", recipe_token_mint);
        if !recipe_token_mint.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }
        if *recipe_token_mint.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }

        let tokenprogram_account = next_account_info(account_info_iter)?;
        //msg!("tokenprogram_account... {:?}", tokenprogram_account);
        if *tokenprogram_account.key != spl_token::id() {
            return Err(ProgramError::IncorrectProgramId);
        }

        let pda_account = next_account_info(account_info_iter)?;

        let base_token_account_info = TokenAccount::unpack(&base_token_account.try_borrow_data()?)?;

        let derive_info = [&config_account.key.to_bytes()[..], &b"lunaowner"[..]];
        let (pda_owner, pda_seed) = Pubkey::find_program_address(&derive_info[..], program_id);
        let mut derive_exinfo = derive_info.to_vec();
        let seed_vec = [pda_seed];

        derive_exinfo.push(&seed_vec);
        //        let pda_owner = Self::get_pda_for_config(config_account.key, program_id);

        //msg!("pda_account... {:?}", pda_account);
        if *pda_account.key != pda_owner {
            return Err(ProgramError::InvalidAccountData);
        }

        //msg!("recipe_token_mint...");
        let recipetoken_account_info = Mint::unpack(&recipe_token_mint.try_borrow_data()?)?;
        //msg!("recipe_token_mint...{:?}", recipetoken_account_info);
        msg!(
            "pda = {}, cur owner = {:?}",
            pda_owner,
            recipetoken_account_info.mint_authority
        );

        if recipetoken_account_info.mint_authority != COption::Some(pda_owner) {
            return Err(ProgramError::IllegalOwner);
        }

        if recipetoken_account_info.freeze_authority != COption::Some(pda_owner) {
            return Err(ProgramError::IllegalOwner);
        }

        if base_token_account_info.owner != pda_owner {
            return Err(ProgramError::IllegalOwner);
        }

        if config_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }

        let config_info = Lunabank::unpack_unchecked(&config_account.try_borrow_data()?)?;
        msg!("unpack config done");
        //msg!("unpack done: {:?}...", &config_info);
        if !config_info.is_initialized() {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_info.owner != *initializer.key {
            return Err(ProgramError::IllegalOwner);
        }
        if config_info.base_token_mint != base_token_account_info.mint {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_info.recipe_token_mint != *recipe_token_mint.key {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_info.base_token_account != *base_token_account.key {
            return Err(ProgramError::InvalidAccountData);
        }

        // transfer authority of reciepe token
        let transfer_to_initializer_ix = spl_token::instruction::set_authority(
            tokenprogram_account.key,
            recipe_token_mint.key,
            Some(initializer.key),
            AuthorityType::MintTokens,
            &pda_owner,
            &[&pda_owner],
        )?;

        msg!("Calling the token program to transfer authority of recipe mint to the bank...");

        //TODO: check add new account inside invoke
        invoke_signed(
            &transfer_to_initializer_ix,
            &[
                recipe_token_mint.clone(),
                pda_account.clone(),
                tokenprogram_account.clone(),
            ],
            &[&derive_exinfo],
        )?;

        let transfer_freeze_to_initializer_ix = spl_token::instruction::set_authority(
            tokenprogram_account.key,
            recipe_token_mint.key,
            Some(initializer.key),
            AuthorityType::FreezeAccount,
            &pda_owner,
            &[&pda_owner],
        )?;

        msg!("Calling the token program to transfer authority of recipe mint to the bank...");
        invoke_signed(
            &transfer_freeze_to_initializer_ix,
            &[
                recipe_token_mint.clone(),
                pda_account.clone(),
                tokenprogram_account.clone(),
            ],
            &[&derive_exinfo],
        )?;

        // owner of

        let transfer_basetoken_to_initializer_ix = spl_token::instruction::set_authority(
            tokenprogram_account.key,
            base_token_account.key,
            Some(initializer.key),
            AuthorityType::AccountOwner,
            &pda_owner,
            &[&pda_owner],
        )?;

        msg!("Calling the token program to transfer owner of token acc to the bank...");
        invoke_signed(
            &transfer_basetoken_to_initializer_ix,
            &[
                base_token_account.clone(),
                pda_account.clone(),
                tokenprogram_account.clone(),
            ],
            &[&derive_exinfo],
        )?;

        msg!("Closing config account...");
        **initializer.try_borrow_mut_lamports()? = initializer
            .lamports()
            .checked_add(config_account.lamports())
            .ok_or(LunabankError::AmountOverflow)?;
        **config_account.try_borrow_mut_lamports()? = 0;
        *config_account.try_borrow_mut_data()? = &mut [];

        Ok(())
    }

    fn update_last_with_seed<'a>(
        derives: &mut [&'a [u8]],
        seed_dest: &'a mut [u8],
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        let (pda, seed) = Pubkey::find_program_address(&derives[..derives.len() - 1], program_id);
        seed_dest[0] = seed;
        derives[derives.len() - 1] = seed_dest;
        (pda, seed)
    }

    fn process_deposit(
        accounts: &[AccountInfo],
        program_id: &Pubkey,
        amount: u64,
        deposit_time: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let payer = next_account_info(account_info_iter)?;
        if !payer.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let config_account = next_account_info(account_info_iter)?;

        let base_token_mint = next_account_info(account_info_iter)?;
        if *base_token_mint.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }

        let base_token_account = next_account_info(account_info_iter)?;
        if *base_token_account.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }
        if !base_token_account.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }

        let user_base_token_account = next_account_info(account_info_iter)?;
        if *user_base_token_account.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }
        if !user_base_token_account.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }

        let recipe_token_mint = next_account_info(account_info_iter)?;
        //msg!("recipe_token_mint... {:?}", recipe_token_mint);
        if !recipe_token_mint.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }
        if *recipe_token_mint.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }

        let user_recipe_token_account = next_account_info(account_info_iter)?;
        if *user_recipe_token_account.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }
        if !user_recipe_token_account.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }
        let pda_user_account = next_account_info(account_info_iter)?;
        if !pda_user_account.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }

        let pda_account = next_account_info(account_info_iter)?;

        let tokenprogram_account = next_account_info(account_info_iter)?;
        //msg!("tokenprogram_account... {:?}", tokenprogram_account);
        if *tokenprogram_account.key != spl_token::id() {
            return Err(ProgramError::IncorrectProgramId);
        }

        let sysvar_account = next_account_info(account_info_iter)?;
        if *sysvar_account.key != sysvar::rent::id() {
            return Err(ProgramError::IncorrectProgramId);
        }

        let system_program = next_account_info(account_info_iter)?;
        if *system_program.key != system_program::id() {
            return Err(ProgramError::IncorrectProgramId);
        }
        let clock_sysvar_info = next_account_info(account_info_iter)?;
        if *clock_sysvar_info.key != sysvar::clock::id() {
            return Err(ProgramError::IncorrectProgramId);
        }

        msg!("accounts.. ok");
        let base_token_account_info = TokenAccount::unpack(&base_token_account.try_borrow_data()?)?;
        let recipe_token_account_info = Mint::unpack(&recipe_token_mint.try_borrow_data()?)?;
        //let base_token_mint_info = Mint::unpack(&base_token_mint.try_borrow_data()?)?;
        let config_info = Lunabank::unpack_unchecked(&config_account.try_borrow_data()?)?;

        msg!("unpack config done");
        //msg!("unpack done: {:?}...", &config_info);
        if !config_info.is_initialized() {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_info.base_token_mint != base_token_account_info.mint {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_info.recipe_token_mint != *recipe_token_mint.key {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_info.base_token_account != *base_token_account.key {
            return Err(ProgramError::InvalidAccountData);
        }

        //TODO: refactor
        let mut seed_deposit_vec = [0u8];
        let mut derive_deposit_info = [
            &config_account.key.to_bytes()[..],
            &payer.key.to_bytes()[..],
            &b"deposit"[..],
            &b""[..],
        ];
        let (pda_deposit_pubkey, _pda_deposit_seed) = Self::update_last_with_seed(
            &mut derive_deposit_info[..],
            &mut seed_deposit_vec[..],
            program_id,
        );

        if *pda_user_account.key != pda_deposit_pubkey {
            return Err(ProgramError::InvalidAccountData);
        }

        let mut seed_vec = [0u8];
        let mut derive_info = [
            &config_account.key.to_bytes()[..],
            &b"lunaowner"[..],
            &b""[..],
        ];
        let (pda_owner, _pda_seed) =
            Self::update_last_with_seed(&mut derive_info[..], &mut seed_vec[..], program_id);

        if *pda_account.key != pda_owner {
            return Err(ProgramError::InvalidAccountData);
        }

        if recipe_token_account_info.mint_authority != COption::Some(pda_owner) {
            return Err(ProgramError::IllegalOwner);
        }

        if recipe_token_account_info.freeze_authority != COption::Some(pda_owner) {
            return Err(ProgramError::IllegalOwner);
        }

        if base_token_account_info.owner != pda_owner {
            return Err(ProgramError::IllegalOwner);
        }

        if config_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }
        // ///////////
        // // end of checks
        // //////////
        //
        let rent = &Rent::from_account_info(sysvar_account)?;
        let balance_for_user_deposit = rent.minimum_balance(LunaDeposit::LEN);
        // ///////////////////
        //
        invoke_signed(
            &system_instruction::create_account(
                payer.key,
                pda_user_account.key,
                balance_for_user_deposit.max(1),
                LunaDeposit::LEN as u64,
                program_id,
            ),
            &[
                payer.clone(),
                pda_user_account.clone(),
                system_program.clone(),
            ],
            &[&derive_deposit_info[..]],
        )?;

        let mut deposit_acc_info =
            LunaDeposit::unpack_unchecked(&pda_user_account.try_borrow_data()?)?;
        msg!("unpack done: {:?}...", &deposit_acc_info);
        if deposit_acc_info.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        let clock = Clock::from_account_info(&clock_sysvar_info)?;
        let cur_ts = clock.unix_timestamp as u64;
        // setup config
        deposit_acc_info.is_initialized = true;
        deposit_acc_info.owner = *payer.key;
        deposit_acc_info.amount = amount;
        deposit_acc_info.start_timestamp = cur_ts;
        deposit_acc_info.end_timestamp = cur_ts
            .checked_add(deposit_time)
            .ok_or(LunabankError::TimeOverflow)?;
        msg!("unpack done: {:?}...", &deposit_acc_info);
        LunaDeposit::pack(
            deposit_acc_info,
            &mut pda_user_account.try_borrow_mut_data()?,
        )?;

        // transfer base tokens
        //let transfer_basetoken_to_pda_ix = ;

        msg!("Calling the token program to transfer owner of token acc to the bank...{} -> {}, pay: {}",
            user_base_token_account.key,
            base_token_account.key,
            payer.key,
        );
        invoke(
            &spl_token::instruction::transfer(
                tokenprogram_account.key,
                user_base_token_account.key,
                base_token_account.key,
                payer.key,
                &[payer.key],
                amount,
            )?,
            &[
                user_base_token_account.clone(),
                base_token_account.clone(),
                payer.clone(),
            ],
        )?;

        msg!(
            "mint_to... {} {} {}",
            recipe_token_mint.key,
            recipe_token_mint.key,
            user_recipe_token_account.key
        );
        invoke_signed(
            &spl_token::instruction::mint_to(
                tokenprogram_account.key,
                recipe_token_mint.key,
                user_recipe_token_account.key,
                &pda_owner,
                &[pda_account.key],
                amount,
            )?,
            &[
                recipe_token_mint.clone(),
                user_recipe_token_account.clone(),
                pda_account.clone(),
                tokenprogram_account.clone(),
            ],
            &[&derive_info[..]],
        )?;

        invoke_signed(
            &spl_token::instruction::freeze_account(
                tokenprogram_account.key,
                user_recipe_token_account.key,
                recipe_token_mint.key,
                &pda_owner,
                &[pda_account.key],
            )?,
            &[
                user_recipe_token_account.clone(),
                recipe_token_mint.clone(),
                pda_account.clone(),
                tokenprogram_account.clone(),
            ],
            &[&derive_info[..]],
        )?;
        //

        Ok(())
    }

    fn process_withdraw(accounts: &[AccountInfo], program_id: &Pubkey) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let payer = next_account_info(account_info_iter)?;
        if !payer.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let config_account = next_account_info(account_info_iter)?;

        let base_token_mint = next_account_info(account_info_iter)?;
        if *base_token_mint.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }

        let base_token_account = next_account_info(account_info_iter)?;
        if *base_token_account.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }
        if !base_token_account.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }

        let user_base_token_account = next_account_info(account_info_iter)?;
        if *user_base_token_account.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }
        if !user_base_token_account.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }

        let recipe_token_mint = next_account_info(account_info_iter)?;
        if !recipe_token_mint.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }
        if *recipe_token_mint.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }

        let user_recipe_token_account = next_account_info(account_info_iter)?;
        if *user_recipe_token_account.owner != spl_token::id() {
            return Err(ProgramError::IllegalOwner);
        }
        if !user_recipe_token_account.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }
        let pda_user_account = next_account_info(account_info_iter)?;
        if !pda_user_account.is_writable {
            return Err(ProgramError::InvalidInstructionData);
        }

        let pda_account = next_account_info(account_info_iter)?;

        let tokenprogram_account = next_account_info(account_info_iter)?;
        if *tokenprogram_account.key != spl_token::id() {
            return Err(ProgramError::IncorrectProgramId);
        }

        let system_program = next_account_info(account_info_iter)?;
        if *system_program.key != system_program::id() {
            return Err(ProgramError::IncorrectProgramId);
        }
        let clock_sysvar_info = next_account_info(account_info_iter)?;
        if *clock_sysvar_info.key != sysvar::clock::id() {
            return Err(ProgramError::IncorrectProgramId);
        }

        msg!("accounts.. ok");
        let base_token_account_info = TokenAccount::unpack(&base_token_account.try_borrow_data()?)?;
        let recipe_token_account_info = Mint::unpack(&recipe_token_mint.try_borrow_data()?)?;
        let config_info = Lunabank::unpack_unchecked(&config_account.try_borrow_data()?)?;

        msg!("unpack config done");
        //msg!("unpack done: {:?}...", &config_info);
        if !config_info.is_initialized() {
            return Err(ProgramError::InvalidAccountData);
        }

        if config_info.base_token_mint != base_token_account_info.mint {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_info.recipe_token_mint != *recipe_token_mint.key {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_info.base_token_account != *base_token_account.key {
            return Err(ProgramError::InvalidAccountData);
        }

        //TODO: refactor
        let mut seed_deposit_vec = [0u8];
        let mut derive_deposit_info = [
            &config_account.key.to_bytes()[..],
            &payer.key.to_bytes()[..],
            &b"deposit"[..],
            &b""[..],
        ];
        let (pda_deposit_pubkey, _pda_deposit_seed) = Self::update_last_with_seed(
            &mut derive_deposit_info[..],
            &mut seed_deposit_vec[..],
            program_id,
        );

        if *pda_user_account.key != pda_deposit_pubkey {
            return Err(ProgramError::InvalidAccountData);
        }

        let mut seed_vec = [0u8];
        let mut derive_info = [
            &config_account.key.to_bytes()[..],
            &b"lunaowner"[..],
            &b""[..],
        ];
        let (pda_owner, _pda_seed) =
            Self::update_last_with_seed(&mut derive_info[..], &mut seed_vec[..], program_id);
        // let (pda_owner, pda_seed) = Pubkey::find_program_address(&derive_info[..], program_id);
        // let mut derive_exinfo = derive_info.to_vec();
        // let seed_vec = [pda_seed];
        // derive_exinfo.push(&seed_vec);

        if *pda_account.key != pda_owner {
            return Err(ProgramError::InvalidAccountData);
        }

        if recipe_token_account_info.mint_authority != COption::Some(pda_owner) {
            return Err(ProgramError::IllegalOwner);
        }

        if recipe_token_account_info.freeze_authority != COption::Some(pda_owner) {
            return Err(ProgramError::IllegalOwner);
        }

        if base_token_account_info.owner != pda_owner {
            return Err(ProgramError::IllegalOwner);
        }

        if config_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }
        // ///////////
        // // end of checks
        // //////////

        let deposit_acc_info = LunaDeposit::unpack_unchecked(&pda_user_account.try_borrow_data()?)?;
        //msg!("unpack done: {:?}...", &deposit_acc_info);
        if !deposit_acc_info.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        let clock = Clock::from_account_info(&clock_sysvar_info)?;
        let cur_ts = clock.unix_timestamp as u64;
        if cur_ts < deposit_acc_info.end_timestamp {
            return Err(LunabankError::TimeOverflow.into());
        }
        // setup config
        let amount = deposit_acc_info.amount;
        if deposit_acc_info.owner != *payer.key {
            return Err(ProgramError::IllegalOwner);
        }

        // transfer base tokens
        //let transfer_basetoken_to_pda_ix = ;

        msg!("Calling the token program to transfer owner of token acc to the bank...{} -> {}, pay: {}",
            user_base_token_account.key,
            base_token_account.key,
            payer.key,
        );
        invoke_signed(
            &spl_token::instruction::transfer(
                tokenprogram_account.key,
                base_token_account.key,
                user_base_token_account.key,
                pda_account.key,
                &[pda_account.key],
                amount,
            )?,
            &[
                user_base_token_account.clone(),
                base_token_account.clone(),
                pda_account.clone(),
                tokenprogram_account.clone(),
            ],
            &[&derive_info[..]],
        )?;

        invoke_signed(
            &spl_token::instruction::thaw_account(
                tokenprogram_account.key,
                user_recipe_token_account.key,
                recipe_token_mint.key,
                &pda_owner,
                &[pda_account.key],
            )?,
            &[
                user_recipe_token_account.clone(),
                recipe_token_mint.clone(),
                pda_account.clone(),
                tokenprogram_account.clone(),
            ],
            &[&derive_info[..]],
        )?;
        msg!("burn {}", user_recipe_token_account.key);
        invoke(
            &spl_token::instruction::burn(
                tokenprogram_account.key,
                user_recipe_token_account.key,
                recipe_token_mint.key,
                &payer.key,
                &[payer.key],
                amount,
            )?,
            &[
                user_recipe_token_account.clone(),
                recipe_token_mint.clone(),
                payer.clone(),
                tokenprogram_account.clone(),
            ],
        )?;

        msg!("close {}", user_recipe_token_account.key);
        invoke(
            &spl_token::instruction::close_account(
                tokenprogram_account.key,
                user_recipe_token_account.key,
                payer.key,
                &payer.key,
                &[payer.key],
            )?,
            &[
                user_recipe_token_account.clone(),
                payer.clone(),
                payer.clone(),
                tokenprogram_account.clone(),
            ],
        )?;
        //TODO

        **payer.try_borrow_mut_lamports()? = payer
            .lamports()
            .checked_add(pda_user_account.lamports())
            .ok_or(LunabankError::AmountOverflow)?;
        **pda_user_account.try_borrow_mut_lamports()? = 0;
        *pda_user_account.try_borrow_mut_data()? = &mut [];

        Ok(())
    }
}
