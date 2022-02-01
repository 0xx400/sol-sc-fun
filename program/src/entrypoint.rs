use solana_program::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, pubkey::Pubkey,
};

use crate::processor::Processor;

// fn test_func ()  {
//     let pk: Pubkey = Pubkey::new(&vec![]);
//
//     println!("debug = {:?}", pk);
//
// }

entrypoint!(process_instruction);
fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
//    test_func();
    Processor::process(program_id, accounts, instruction_data)
}
