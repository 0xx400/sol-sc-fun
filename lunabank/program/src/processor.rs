use borsh::BorshDeserialize;
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

use crate::state::{Key, LunaDeposit};
use crate::utils::{
    assert_account_key, assert_derivation, assert_owned_by, assert_signer, assert_writable,
};
use crate::{
    error::LunabankError,
    instruction::LunabankInstruction,
    state::{Lunabank, LUNA_DEPOSIT_PREFIX, LUNA_OWNER_PREFIX},
};
//use mpl_token_metadata::instruction::MetadataInstruction;

pub struct Processor;
impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        //let instruction = LunabankInstruction::unpack(instruction_data)?;
        let instruction = LunabankInstruction::try_from_slice(instruction_data)?;

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

        let base_token_account_info = next_account_info(account_info_iter)?;
        assert_owned_by(base_token_account_info, &spl_token::id())?;

        let recipe_token_mint_info = next_account_info(account_info_iter)?;
        //msg!("recipe_token_mint... {:?}", recipe_token_mint);
        assert_writable(recipe_token_mint_info)?;
        assert_owned_by(recipe_token_mint_info, &spl_token::id())?;

        let sysvar_account_info = next_account_info(account_info_iter)?;
        assert_account_key(sysvar_account_info, &sysvar::rent::id())?;

        let tokenprogram_account_info = next_account_info(account_info_iter)?;
        assert_account_key(tokenprogram_account_info, &spl_token::id())?;

        let recipe_token_account_data = Mint::unpack(&recipe_token_mint_info.try_borrow_data()?)?;
        msg!("recipe_token_mint...{:?}", recipe_token_account_data);

        let (recipe_token_owner, _) = Pubkey::find_program_address(
            &[
                &config_account_info.key.as_ref(),
                LUNA_OWNER_PREFIX.as_bytes(),
            ],
            program_id,
        );

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

        if !rent.is_exempt(
            config_account_info.lamports(),
            config_account_info.data_len(),
        ) {
            return Err(LunabankError::NotRentExempt.into());
        }
        msg!("config_account: {:?}...", &config_account_info);

        let mut config_data = Lunabank::from_account_info(config_account_info)?;

        msg!("unpack done: {:?}...", &config_data);
        if config_data.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }

        // setup config
        config_data.key = Key::LunabankV1;
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
            &[recipe_token_mint_info.clone(), initializer_info.clone()],
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
            &[recipe_token_mint_info.clone(), initializer_info.clone()],
        )?;

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
            &[base_token_account_info.clone(), initializer_info.clone()],
        )?;

        //TODO: create & error check
        Ok(())
    }

    fn process_close(accounts: &[AccountInfo], program_id: &Pubkey) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let initializer_info = next_account_info(account_info_iter)?;
        assert_signer(initializer_info)?;

        let config_account_info = next_account_info(account_info_iter)?;
        assert_writable(config_account_info)?;
        assert_owned_by(config_account_info, program_id)?;

        let base_token_account_info = next_account_info(account_info_iter)?;
        assert_owned_by(base_token_account_info, &spl_token::id())?;
        assert_writable(base_token_account_info)?;

        let recipe_token_mint_info = next_account_info(account_info_iter)?;
        //msg!("recipe_token_mint... {:?}", recipe_token_mint);
        assert_writable(recipe_token_mint_info)?;
        assert_owned_by(recipe_token_mint_info, &spl_token::id())?;

        let tokenprogram_account_info = next_account_info(account_info_iter)?;
        //msg!("tokenprogram_account... {:?}", tokenprogram_account);
        assert_account_key(tokenprogram_account_info, &spl_token::id())?;

        let pda_account_info = next_account_info(account_info_iter)?;

        let base_token_account_data =
            TokenAccount::unpack(&base_token_account_info.try_borrow_data()?)?;

        let pda_bump_seed = assert_derivation(
            program_id,
            pda_account_info,
            &[
                &config_account_info.key.as_ref(),
                LUNA_OWNER_PREFIX.as_bytes(),
            ],
        )?;
        let pda_seeds = &[
            config_account_info.key.as_ref(),
            LUNA_OWNER_PREFIX.as_bytes(),
            &[pda_bump_seed],
        ];

        //msg!("recipe_token_mint...");
        let recipetoken_account_data = Mint::unpack(&recipe_token_mint_info.try_borrow_data()?)?;
        //msg!("recipe_token_mint...{:?}", recipetoken_account_info);
        msg!(
            "pda = {}, cur owner = {:?}",
            pda_account_info.key,
            recipetoken_account_data.mint_authority
        );

        if recipetoken_account_data.mint_authority.as_ref() != COption::Some(pda_account_info.key) {
            return Err(ProgramError::IllegalOwner);
        }

        if recipetoken_account_data.freeze_authority.as_ref() != COption::Some(pda_account_info.key)
        {
            return Err(ProgramError::IllegalOwner);
        }

        if base_token_account_data.owner != *pda_account_info.key {
            return Err(ProgramError::IllegalOwner);
        }

        let config_data = Lunabank::from_account_info(config_account_info)?;
        msg!("unpack config done");
        //msg!("unpack done: {:?}...", &config_info);
        if !config_data.is_initialized() {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_data.owner != *initializer_info.key {
            return Err(ProgramError::IllegalOwner);
        }
        if config_data.base_token_mint != base_token_account_data.mint {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_data.recipe_token_mint != *recipe_token_mint_info.key {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_data.base_token_account != *base_token_account_info.key {
            return Err(ProgramError::InvalidAccountData);
        }

        // transfer authority of reciepe token
        let transfer_to_initializer_ix = spl_token::instruction::set_authority(
            tokenprogram_account_info.key,
            recipe_token_mint_info.key,
            Some(initializer_info.key),
            AuthorityType::MintTokens,
            &pda_account_info.key,
            &[&pda_account_info.key],
        )?;

        msg!("Calling the token program to transfer authority of recipe mint to the bank...");

        //TODO: check add new account inside invoke
        invoke_signed(
            &transfer_to_initializer_ix,
            &[
                recipe_token_mint_info.clone(),
                pda_account_info.clone(),
                tokenprogram_account_info.clone(),
            ],
            &[pda_seeds],
        )?;

        let transfer_freeze_to_initializer_ix = spl_token::instruction::set_authority(
            tokenprogram_account_info.key,
            recipe_token_mint_info.key,
            Some(initializer_info.key),
            AuthorityType::FreezeAccount,
            &pda_account_info.key,
            &[&pda_account_info.key],
        )?;

        msg!("Calling the token program to transfer authority of recipe mint to the bank...");
        invoke_signed(
            &transfer_freeze_to_initializer_ix,
            &[
                recipe_token_mint_info.clone(),
                pda_account_info.clone(),
                tokenprogram_account_info.clone(),
            ],
            &[pda_seeds],
        )?;

        // owner of

        let transfer_basetoken_to_initializer_ix = spl_token::instruction::set_authority(
            tokenprogram_account_info.key,
            base_token_account_info.key,
            Some(initializer_info.key),
            AuthorityType::AccountOwner,
            &pda_account_info.key,
            &[&pda_account_info.key],
        )?;

        msg!("Calling the token program to transfer owner of token acc to the bank...");
        invoke_signed(
            &transfer_basetoken_to_initializer_ix,
            &[
                base_token_account_info.clone(),
                pda_account_info.clone(),
                tokenprogram_account_info.clone(),
            ],
            &[pda_seeds],
        )?;

        msg!("Closing config account...");
        **initializer_info.try_borrow_mut_lamports()? = initializer_info
            .lamports()
            .checked_add(config_account_info.lamports())
            .ok_or(LunabankError::AmountOverflow)?;
        **config_account_info.try_borrow_mut_lamports()? = 0;
        *config_account_info.try_borrow_mut_data()? = &mut [];

        Ok(())
    }

    fn process_deposit(
        accounts: &[AccountInfo],
        program_id: &Pubkey,
        amount: u64,
        deposit_time: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let payer_info = next_account_info(account_info_iter)?;
        assert_signer(payer_info)?;

        let config_account_info = next_account_info(account_info_iter)?;
        assert_owned_by(config_account_info, program_id)?;

        let base_token_mint_info = next_account_info(account_info_iter)?;
        assert_owned_by(base_token_mint_info, &spl_token::id())?;

        let base_token_account_info = next_account_info(account_info_iter)?;
        assert_owned_by(base_token_account_info, &spl_token::id())?;
        assert_writable(base_token_account_info)?;

        let user_base_token_account_info = next_account_info(account_info_iter)?;
        assert_owned_by(user_base_token_account_info, &spl_token::id())?;
        assert_writable(user_base_token_account_info)?;

        let recipe_token_mint_info = next_account_info(account_info_iter)?;
        //msg!("recipe_token_mint... {:?}", recipe_token_mint);
        assert_owned_by(recipe_token_mint_info, &spl_token::id())?;
        assert_writable(recipe_token_mint_info)?;

        let user_recipe_token_account_info = next_account_info(account_info_iter)?;
        assert_owned_by(user_recipe_token_account_info, &spl_token::id())?;
        assert_writable(user_recipe_token_account_info)?;

        let pda_user_account_info = next_account_info(account_info_iter)?;
        assert_writable(pda_user_account_info)?;

        let pda_account_info = next_account_info(account_info_iter)?;

        let tokenprogram_account_info = next_account_info(account_info_iter)?;
        assert_account_key(tokenprogram_account_info, &spl_token::id())?;

        let sysvar_account_info = next_account_info(account_info_iter)?;
        assert_account_key(sysvar_account_info, &sysvar::rent::id())?;

        let system_program_info = next_account_info(account_info_iter)?;
        assert_account_key(system_program_info, &system_program::id())?;

        let clock_sysvar_info = next_account_info(account_info_iter)?;
        assert_account_key(clock_sysvar_info, &sysvar::clock::id())?;

        msg!("accounts.. ok");
        let base_token_account_data =
            TokenAccount::unpack(&base_token_account_info.try_borrow_data()?)?;
        let recipe_token_mint_data = Mint::unpack(&recipe_token_mint_info.try_borrow_data()?)?;
        let config_data = Lunabank::from_account_info(config_account_info)?;

        msg!("unpack config done");
        //msg!("unpack done: {:?}...", &config_info);
        if !config_data.is_initialized() {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_data.base_token_mint != base_token_account_data.mint {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_data.recipe_token_mint != *recipe_token_mint_info.key {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_data.base_token_account != *base_token_account_info.key {
            return Err(ProgramError::InvalidAccountData);
        }

        let pda_deposit_bump_seed = assert_derivation(
            program_id,
            pda_user_account_info,
            &[
                &config_account_info.key.as_ref(),
                payer_info.key.as_ref(),
                LUNA_DEPOSIT_PREFIX.as_bytes(),
            ],
        )?;
        let pda_deposit_seeds = &[
            config_account_info.key.as_ref(),
            payer_info.key.as_ref(),
            LUNA_DEPOSIT_PREFIX.as_bytes(),
            &[pda_deposit_bump_seed],
        ];

        let pda_bump_seed = assert_derivation(
            program_id,
            pda_account_info,
            &[
                &config_account_info.key.as_ref(),
                LUNA_OWNER_PREFIX.as_bytes(),
            ],
        )?;
        let pda_seeds = &[
            config_account_info.key.as_ref(),
            LUNA_OWNER_PREFIX.as_bytes(),
            &[pda_bump_seed],
        ];

        if recipe_token_mint_data.mint_authority != COption::Some(*pda_account_info.key) {
            return Err(ProgramError::IllegalOwner);
        }

        if recipe_token_mint_data.freeze_authority != COption::Some(*pda_account_info.key) {
            return Err(ProgramError::IllegalOwner);
        }

        if base_token_account_data.owner != *pda_account_info.key {
            return Err(ProgramError::IllegalOwner);
        }

        // ///////////
        // // end of checks
        // //////////
        //
        let rent = &Rent::from_account_info(sysvar_account_info)?;
        let balance_for_user_deposit = rent.minimum_balance(LunaDeposit::LEN);

        invoke_signed(
            &system_instruction::create_account(
                payer_info.key,
                pda_user_account_info.key,
                balance_for_user_deposit.max(1),
                LunaDeposit::LEN as u64,
                program_id,
            ),
            &[
                payer_info.clone(),
                pda_user_account_info.clone(),
                system_program_info.clone(),
            ],
            &[&pda_deposit_seeds[..]],
        )?;

        let mut deposit_acc_data =
            LunaDeposit::unpack_unchecked(&pda_user_account_info.try_borrow_data()?)?;
        msg!("unpack done: {:?}...", &deposit_acc_data);
        if deposit_acc_data.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        let clock = Clock::from_account_info(&clock_sysvar_info)?;
        let cur_ts = clock.unix_timestamp as u64;
        // setup config
        deposit_acc_data.key = Key::LunaDepositV1;
        deposit_acc_data.owner = *payer_info.key;
        deposit_acc_data.amount = amount;
        deposit_acc_data.start_timestamp = cur_ts;
        deposit_acc_data.end_timestamp = cur_ts
            .checked_add(deposit_time)
            .ok_or(LunabankError::TimeOverflow)?;
        msg!("unpack done: {:?}...", &deposit_acc_data);
        LunaDeposit::pack(
            deposit_acc_data,
            &mut pda_user_account_info.try_borrow_mut_data()?,
        )?;

        // transfer base tokens
        //let transfer_basetoken_to_pda_ix = ;

        msg!("Calling the token program to transfer owner of token acc to the bank...{} -> {}, pay: {}",
            user_base_token_account_info.key,
            base_token_account_info.key,
            payer_info.key,
        );
        invoke(
            &spl_token::instruction::transfer(
                tokenprogram_account_info.key,
                user_base_token_account_info.key,
                base_token_account_info.key,
                payer_info.key,
                &[payer_info.key],
                amount,
            )?,
            &[
                user_base_token_account_info.clone(),
                base_token_account_info.clone(),
                payer_info.clone(),
            ],
        )?;

        msg!(
            "mint_to... {} {} {}",
            recipe_token_mint_info.key,
            recipe_token_mint_info.key,
            user_recipe_token_account_info.key
        );
        invoke_signed(
            &spl_token::instruction::mint_to(
                tokenprogram_account_info.key,
                recipe_token_mint_info.key,
                user_recipe_token_account_info.key,
                &pda_account_info.key,
                &[pda_account_info.key],
                amount,
            )?,
            &[
                recipe_token_mint_info.clone(),
                user_recipe_token_account_info.clone(),
                pda_account_info.clone(),
                tokenprogram_account_info.clone(),
            ],
            &[pda_seeds],
        )?;

        invoke_signed(
            &spl_token::instruction::freeze_account(
                tokenprogram_account_info.key,
                user_recipe_token_account_info.key,
                recipe_token_mint_info.key,
                &pda_account_info.key,
                &[pda_account_info.key],
            )?,
            &[
                user_recipe_token_account_info.clone(),
                recipe_token_mint_info.clone(),
                pda_account_info.clone(),
                tokenprogram_account_info.clone(),
            ],
            &[pda_seeds],
        )?;
        //

        Ok(())
    }

    fn process_withdraw(accounts: &[AccountInfo], program_id: &Pubkey) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let payer_info = next_account_info(account_info_iter)?;
        assert_signer(payer_info)?;

        let config_account_info = next_account_info(account_info_iter)?;
        assert_owned_by(config_account_info, program_id)?;

        let base_token_mint_info = next_account_info(account_info_iter)?;
        assert_owned_by(base_token_mint_info, &spl_token::id())?;

        let base_token_account_info = next_account_info(account_info_iter)?;
        assert_owned_by(base_token_account_info, &spl_token::id())?;
        assert_writable(base_token_account_info)?;

        let user_base_token_account_info = next_account_info(account_info_iter)?;
        assert_owned_by(user_base_token_account_info, &spl_token::id())?;
        assert_writable(user_base_token_account_info)?;

        let recipe_token_mint_info = next_account_info(account_info_iter)?;
        assert_owned_by(recipe_token_mint_info, &spl_token::id())?;
        assert_writable(recipe_token_mint_info)?;

        let user_recipe_token_account_info = next_account_info(account_info_iter)?;
        assert_owned_by(user_recipe_token_account_info, &spl_token::id())?;
        assert_writable(user_recipe_token_account_info)?;

        let pda_user_account_info = next_account_info(account_info_iter)?;
        assert_writable(pda_user_account_info)?;

        let pda_account_info = next_account_info(account_info_iter)?;

        let tokenprogram_account_info = next_account_info(account_info_iter)?;
        assert_account_key(tokenprogram_account_info, &spl_token::id())?;

        let system_program_info = next_account_info(account_info_iter)?;
        assert_account_key(system_program_info, &system_program::id())?;

        let clock_sysvar_info = next_account_info(account_info_iter)?;
        assert_account_key(clock_sysvar_info, &sysvar::clock::id())?;

        msg!("accounts.. ok");
        let base_token_account_data =
            TokenAccount::unpack(&base_token_account_info.try_borrow_data()?)?;
        let recipe_token_account_data = Mint::unpack(&recipe_token_mint_info.try_borrow_data()?)?;
        let config_data = Lunabank::from_account_info(config_account_info)?;

        msg!("unpack config done");
        //msg!("unpack done: {:?}...", &config_info);
        if !config_data.is_initialized() {
            return Err(ProgramError::InvalidAccountData);
        }

        if config_data.base_token_mint != base_token_account_data.mint {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_data.recipe_token_mint != *recipe_token_mint_info.key {
            return Err(ProgramError::InvalidAccountData);
        }
        if config_data.base_token_account != *base_token_account_info.key {
            return Err(ProgramError::InvalidAccountData);
        }

        assert_derivation(
            program_id,
            pda_user_account_info,
            &[
                &config_account_info.key.as_ref(),
                payer_info.key.as_ref(),
                LUNA_DEPOSIT_PREFIX.as_bytes(),
            ],
        )?;

        let pda_bump_seed = assert_derivation(
            program_id,
            pda_account_info,
            &[
                &config_account_info.key.as_ref(),
                LUNA_OWNER_PREFIX.as_bytes(),
            ],
        )?;
        let pda_seeds = &[
            config_account_info.key.as_ref(),
            LUNA_OWNER_PREFIX.as_bytes(),
            &[pda_bump_seed],
        ];

        if recipe_token_account_data.mint_authority.as_ref() != COption::Some(pda_account_info.key)
        {
            return Err(ProgramError::IllegalOwner);
        }

        if recipe_token_account_data.freeze_authority.as_ref()
            != COption::Some(pda_account_info.key)
        {
            return Err(ProgramError::IllegalOwner);
        }

        if base_token_account_data.owner != *pda_account_info.key {
            return Err(ProgramError::IllegalOwner);
        }

        // ///////////
        // // end of checks
        // //////////

        let deposit_acc_data =
            LunaDeposit::unpack_unchecked(&pda_user_account_info.try_borrow_data()?)?;
        //msg!("unpack done: {:?}...", &deposit_acc_info);
        if !deposit_acc_data.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        let clock = Clock::from_account_info(&clock_sysvar_info)?;
        let cur_ts = clock.unix_timestamp as u64;
        if cur_ts < deposit_acc_data.end_timestamp {
            return Err(LunabankError::TimeOverflow.into());
        }
        // setup config
        let amount = deposit_acc_data.amount;
        if deposit_acc_data.owner != *payer_info.key {
            return Err(ProgramError::IllegalOwner);
        }

        // transfer base tokens
        //let transfer_basetoken_to_pda_ix = ;

        msg!("Calling the token program to transfer owner of token acc to the bank...{} -> {}, pay: {}",
            user_base_token_account_info.key,
            base_token_account_info.key,
            payer_info.key,
        );
        invoke_signed(
            &spl_token::instruction::transfer(
                tokenprogram_account_info.key,
                base_token_account_info.key,
                user_base_token_account_info.key,
                pda_account_info.key,
                &[pda_account_info.key],
                amount,
            )?,
            &[
                user_base_token_account_info.clone(),
                base_token_account_info.clone(),
                pda_account_info.clone(),
                tokenprogram_account_info.clone(),
            ],
            &[pda_seeds],
        )?;

        invoke_signed(
            &spl_token::instruction::thaw_account(
                tokenprogram_account_info.key,
                user_recipe_token_account_info.key,
                recipe_token_mint_info.key,
                &pda_account_info.key,
                &[pda_account_info.key],
            )?,
            &[
                user_recipe_token_account_info.clone(),
                recipe_token_mint_info.clone(),
                pda_account_info.clone(),
                tokenprogram_account_info.clone(),
            ],
            &[pda_seeds],
        )?;
        msg!("burn {}", user_recipe_token_account_info.key);
        invoke(
            &spl_token::instruction::burn(
                tokenprogram_account_info.key,
                user_recipe_token_account_info.key,
                recipe_token_mint_info.key,
                &payer_info.key,
                &[payer_info.key],
                amount,
            )?,
            &[
                user_recipe_token_account_info.clone(),
                recipe_token_mint_info.clone(),
                payer_info.clone(),
                tokenprogram_account_info.clone(),
            ],
        )?;

        msg!("close {}", user_recipe_token_account_info.key);
        invoke(
            &spl_token::instruction::close_account(
                tokenprogram_account_info.key,
                user_recipe_token_account_info.key,
                payer_info.key,
                &payer_info.key,
                &[payer_info.key],
            )?,
            &[
                user_recipe_token_account_info.clone(),
                payer_info.clone(),
                payer_info.clone(),
                tokenprogram_account_info.clone(),
            ],
        )?;
        //TODO

        **payer_info.try_borrow_mut_lamports()? = payer_info
            .lamports()
            .checked_add(pda_user_account_info.lamports())
            .ok_or(LunabankError::AmountOverflow)?;
        **pda_user_account_info.try_borrow_mut_lamports()? = 0;
        *pda_user_account_info.try_borrow_mut_data()? = &mut [];

        Ok(())
    }
}
