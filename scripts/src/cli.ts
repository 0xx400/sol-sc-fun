import { program } from 'commander';
import BN = require("bn.js");
import {
  AccountInfo,
  Connection, Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {AccountLayout, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {
  logError,
  getKeypair,
  getPublicKey,
  getTokenBalance,
  writePublicKey,
  getKeypairByPath,
  getProgramId,
  RiverLayout,
  RIVER_ACCOUNT_DATA_LAYOUT
} from "./utils";
import {Buffer} from "buffer";

program
    .command('init')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .option(
        '-g, --gen-new',
        'Optional: Generate keys to create new contract',
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
      //console.log(">>>>>>>>!!!!!!", directory, cmd)
      const {keypair, programId, genNew} = cmd.opts();
      console.log("keypair: ", keypair);
      console.log("genNew: ", genNew);
      console.log("programid: ", programId);

      const callerKp = getKeypairByPath(keypair);
      console.log(callerKp);
      console.log(callerKp.publicKey.toBase58());
      const RiverProgramId = new PublicKey(programId);
      console.log("RiverProgramId", RiverProgramId.toBase58());

      const connection = new Connection("http://localhost:8899", "confirmed");

      const configKeypair = new Keypair();

      const createRiverAccountIx = SystemProgram.createAccount({
        space: RIVER_ACCOUNT_DATA_LAYOUT.span,
        lamports: await connection.getMinimumBalanceForRentExemption(
            RIVER_ACCOUNT_DATA_LAYOUT.span
        ),
        fromPubkey: callerKp.publicKey,
        newAccountPubkey: configKeypair.publicKey,
        programId: RiverProgramId,
      });


      const initRiverIx = new TransactionInstruction({
        programId: RiverProgramId,
        keys: [
          { pubkey: callerKp.publicKey, isSigner: true, isWritable: false },
          { pubkey: configKeypair.publicKey, isSigner: false, isWritable: true },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(
            Uint8Array.of(0)
        ),
      });

      const tx = new Transaction().add(
          createRiverAccountIx,
          initRiverIx
      );
      console.log("Sending init transaction..., account data addr = ", configKeypair.publicKey.toBase58());
      await connection.sendTransaction(
          tx,
//          [callerKp,],
          [callerKp, configKeypair],
          { skipPreflight: false, preflightCommitment: "confirmed" }
      );

      return;
    })

const dumpConfig = async (
    connection: Connection,
    configPubkey: PublicKey
) => {
  const accData = await connection.getAccountInfo(
      configPubkey
  );
  printConfig(accData);
};

const printConfig =  (
    accData: AccountInfo<Buffer> | null
) => {
  console.log("res = getAccountInfo", accData);

  if (accData === null || accData.data.length === 0) {
    logError("River state account has not been initialized properly");
    process.exit(1);
  }

  const encodedRiverState = accData.data;
  const decodedRiverState = RIVER_ACCOUNT_DATA_LAYOUT.decode(
      encodedRiverState
  ) as RiverLayout;

  //console.log("data on config = ", decodedRiverState);
  console.log("config.init =  ", !!decodedRiverState.isInitialized,);
  console.log("config.owner ", new PublicKey(decodedRiverState.owner).toBase58());
  console.log("config.lastUser ", new PublicKey(decodedRiverState.lastUser).toBase58());
  console.log("config.accumulator ", new BN(decodedRiverState.accumulator, 10, "le").toString());
  console.log("config.userChanges ", new BN(decodedRiverState.userChanges, 10, "le").toString());
};

program
    .command('dump')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-c, --config-account <string>', 'configaccout')
    .option(
        '-g, --gen-new',
        'Optional: Generate keys to create new contract',
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
      //console.log(">>>>>>>>!!!!!!", directory, cmd)
      const {keypair, programId, configAccount} = cmd.opts();
      console.log("keypair: ", keypair);
      console.log("programid: ", programId);
      console.log("config: ", configAccount);

      const callerKp = getKeypairByPath(keypair);
      console.log(callerKp);
      console.log(callerKp.publicKey.toBase58());
      const RiverProgramId = new PublicKey(programId);
      const RiverConfigId = new PublicKey(configAccount);
      console.log("RiverProgramId", RiverProgramId.toBase58());
      console.log("RiverConfigId", RiverConfigId.toBase58());

      const connection = new Connection("http://localhost:8899", "confirmed");
      await dumpConfig(connection, RiverConfigId);

      return;
    })


program
    .command('close')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-c, --config-account <string>', 'configaccout')
    .option(
        '-g, --gen-new',
        'Optional: Generate keys to create new contract',
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
      //console.log(">>>>>>>>!!!!!!", directory, cmd)
      const {keypair, programId, configAccount} = cmd.opts();
      console.log("keypair: ", keypair);
      console.log("programid: ", programId);
      console.log("config: ", configAccount);

      const callerKp = getKeypairByPath(keypair);
      console.log(callerKp);
      console.log(callerKp.publicKey.toBase58());
      const RiverProgramId = new PublicKey(programId);
      const RiverConfigId = new PublicKey(configAccount);
      console.log("RiverProgramId", RiverProgramId.toBase58());
      console.log("RiverConfigId", RiverConfigId.toBase58());

      const connection = new Connection("http://localhost:8899", "confirmed");

      await dumpConfig(connection, RiverConfigId);

      const closeRiverIx = new TransactionInstruction({
        programId: RiverProgramId,
        keys: [
          { pubkey: callerKp.publicKey, isSigner: true, isWritable: false },
          { pubkey: RiverConfigId, isSigner: false, isWritable: true },
        ],
        data: Buffer.from(
            Uint8Array.of(2)
        ),
      });

      const tx = new Transaction().add(
          closeRiverIx
      );
      console.log("Sending close transaction..., account data addr = ", RiverConfigId.toBase58());
      await connection.sendTransaction(
          tx,
          [callerKp, ],
          { skipPreflight: false, preflightCommitment: "confirmed" }
      );

      return;
    })

program
    .command('accum')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-a, --amount <integer>', 'programid')
    .requiredOption('-c, --config-account <string>', 'configaccout')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
      //console.log(">>>>>>>>!!!!!!", directory, cmd)
      const {keypair, programId, configAccount, amount} = cmd.opts();
      console.log("keypair: ", keypair);
      console.log("programid: ", programId);
      console.log("config: ", configAccount);
      console.log("amount: ", amount);

      const callerKp = getKeypairByPath(keypair);
      console.log(callerKp);
      console.log(callerKp.publicKey.toBase58());
      const RiverProgramId = new PublicKey(programId);
      const RiverConfigId = new PublicKey(configAccount);
      console.log("RiverProgramId", RiverProgramId.toBase58());
      console.log("RiverConfigId", RiverConfigId.toBase58());
      const connection = new Connection("http://localhost:8899", "confirmed");

      await dumpConfig(connection, RiverConfigId);

      const accumRiverIx = new TransactionInstruction({
        programId: RiverProgramId,
        keys: [
          { pubkey: callerKp.publicKey, isSigner: true, isWritable: false },
          { pubkey: RiverConfigId, isSigner: false, isWritable: true },
        ],
        data: Buffer.from(
            Uint8Array.of(1, ...new BN(amount).toArray("le", 8))
        ),
      });

      const tx = new Transaction().add(
          accumRiverIx
      );
      console.log("Sending accum transaction..., account data addr = ", RiverConfigId.toBase58());
      await connection.sendTransaction(
          tx,
          [callerKp, ],
          { skipPreflight: false, preflightCommitment: "confirmed" }
      );

      // sleep to allow time to update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await dumpConfig(connection, RiverConfigId);
    })

program.parse();
