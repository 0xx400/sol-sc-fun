import { program } from 'commander';
import BN = require("bn.js");
import {
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

const createMint = (
  connection: Connection,
  { publicKey, secretKey }: Signer
) => {
  return Token.createMint(
    connection,
    {
      publicKey,
      secretKey,
    },
    publicKey,
    null,
    0,
    TOKEN_PROGRAM_ID
  );
};

const setupMint = async (
  name: string,
  connection: Connection,
  alicePublicKey: PublicKey,
  bobPublicKey: PublicKey,
  clientKeypair: Signer
): Promise<[Token, PublicKey, PublicKey]> => {
  console.log(`Creating Mint ${name}...`);
  const mint = await createMint(connection, clientKeypair);
  writePublicKey(mint.publicKey, `mint_${name.toLowerCase()}`);

  console.log(`Creating Alice TokenAccount for ${name}...`);
  const aliceTokenAccount = await mint.createAccount(alicePublicKey);
  writePublicKey(aliceTokenAccount, `alice_${name.toLowerCase()}`);

  console.log(`Creating Bob TokenAccount for ${name}...`);
  const bobTokenAccount = await mint.createAccount(bobPublicKey);
  writePublicKey(bobTokenAccount, `bob_${name.toLowerCase()}`);

  return [mint, aliceTokenAccount, bobTokenAccount];
};

const createNewAccount = async () => {
  const testKeys = new Keypair();
  const alicePublicKey = getPublicKey("alice");
  const bobPublicKey = getPublicKey("bob");
  const clientKeypair = getKeypair("id");

  const connection = new Connection("http://localhost:8899", "confirmed");
  console.log("Requesting SOL for Alice...");
  // some networks like the local network provide an airdrop function (mainnet of course does not)
  await connection.requestAirdrop(alicePublicKey, LAMPORTS_PER_SOL * 10);
  console.log("Requesting SOL for Bob...");
  await connection.requestAirdrop(bobPublicKey, LAMPORTS_PER_SOL * 10);
  console.log("Requesting SOL for Client...");
  await connection.requestAirdrop(
    clientKeypair.publicKey,
    LAMPORTS_PER_SOL * 10
  );

  const [mintX, aliceTokenAccountForX, bobTokenAccountForX] = await setupMint(
    "X",
    connection,
    alicePublicKey,
    bobPublicKey,
    clientKeypair
  );
  console.log("Sending 50X to Alice's X TokenAccount...");
  await mintX.mintTo(aliceTokenAccountForX, clientKeypair.publicKey, [], 50);

  const [mintY, aliceTokenAccountForY, bobTokenAccountForY] = await setupMint(
    "Y",
    connection,
    alicePublicKey,
    bobPublicKey,
    clientKeypair
  );
  console.log("Sending 50Y to Bob's Y TokenAccount...");
  await mintY.mintTo(bobTokenAccountForY, clientKeypair.publicKey, [], 50);

  console.log("✨Setup complete✨\n");
  console.table([
    {
      "Alice Token Account X": await getTokenBalance(
        aliceTokenAccountForX,
        connection
      ),
      "Alice Token Account Y": await getTokenBalance(
        aliceTokenAccountForY,
        connection
      ),
      "Bob Token Account X": await getTokenBalance(
        bobTokenAccountForX,
        connection
      ),
      "Bob Token Account Y": await getTokenBalance(
        bobTokenAccountForY,
        connection
      ),
    },
  ]);
  console.log("");
};

//setup();

//let program = new Command();

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
          [callerKp, configKeypair],
          { skipPreflight: false, preflightCommitment: "confirmed" }
      );

      return;
      //
      // // sleep to allow time to update
      // await new Promise((resolve) => setTimeout(resolve, 1000));
      //
      // const escrowAccount = await connection.getAccountInfo(
      //     escrowKeypair.publicKey
      // );
      //
      // if (escrowAccount === null || escrowAccount.data.length === 0) {
      //   logError("Escrow state account has not been initialized properly");
      //   process.exit(1);
      // }
      //
      // const encodedEscrowState = escrowAccount.data;
      // const decodedEscrowState = ESCROW_ACCOUNT_DATA_LAYOUT.decode(
      //     encodedEscrowState
      // ) as EscrowLayout;
      //
      // if (!decodedEscrowState.isInitialized) {
      //   logError("Escrow state initialization flag has not been set");
      //   process.exit(1);
      // } else if (
      //     !new PublicKey(decodedEscrowState.initializerPubkey).equals(
      //         aliceKeypair.publicKey
      //     )
      // ) {
      //   logError(
      //       "InitializerPubkey has not been set correctly / not been set to Alice's public key"
      //   );
      //   process.exit(1);
      // } else if (
      //     !new PublicKey(
      //         decodedEscrowState.initializerReceivingTokenAccountPubkey
      //     ).equals(aliceYTokenAccountPubkey)
      // ) {
      //   logError(
      //       "initializerReceivingTokenAccountPubkey has not been set correctly / not been set to Alice's Y public key"
      //   );
      //   process.exit(1);
      // } else if (
      //     !new PublicKey(decodedEscrowState.initializerTempTokenAccountPubkey).equals(
      //         tempXTokenAccountKeypair.publicKey
      //     )
      // ) {
      //   logError(
      //       "initializerTempTokenAccountPubkey has not been set correctly / not been set to temp X token account public key"
      //   );
      //   process.exit(1);
      // }
      // console.log(
      //     `✨Escrow successfully initialized. Alice is offering ${terms.bobExpectedAmount}X for ${terms.aliceExpectedAmount}Y✨\n`
      // );

    })


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


      const riverConfigAccount = await connection.getAccountInfo(
          RiverConfigId
      );

      console.log("res = getAccountInfo", riverConfigAccount);

      if (riverConfigAccount === null || riverConfigAccount.data.length === 0) {
        logError("Escrow state account has not been initialized properly");
        process.exit(1);
      }

      const encodedRiverState = riverConfigAccount.data;
      const decodedRiverState = RIVER_ACCOUNT_DATA_LAYOUT.decode(
          encodedRiverState
      ) as RiverLayout;

      console.log("data on config = ", decodedRiverState);
      console.log("config.init =  ", !!decodedRiverState.isInitialized,);
      console.log("config.owner ", new PublicKey(decodedRiverState.owner).toBase58());
      console.log("config.lastUser ", new PublicKey(decodedRiverState.lastUser).toBase58());
      console.log("config.accumulator ", new BN(decodedRiverState.accumulator, 10, "le").toNumber());
      console.log("config.userChanges ", new BN(decodedRiverState.userChanges, 10, "le").toNumber());
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


      const riverConfigAccount = await connection.getAccountInfo(
          RiverConfigId
      );

      console.log("res = getAccountInfo", riverConfigAccount);

      if (riverConfigAccount === null || riverConfigAccount.data.length === 0) {
        logError("Escrow state account has not been initialized properly");
        process.exit(1);
      }

      const encodedRiverState = riverConfigAccount.data;
      const decodedRiverState = RIVER_ACCOUNT_DATA_LAYOUT.decode(
          encodedRiverState
      ) as RiverLayout;

      console.log("data on config = ", decodedRiverState);

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

program.parse();