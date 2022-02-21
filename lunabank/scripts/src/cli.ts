import { program } from 'commander';
import BN = require("bn.js");
import {
    AccountInfo,
    Connection, Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    Signer,
    SystemProgram, SYSVAR_CLOCK_PUBKEY,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    TransactionInstruction,

} from "@solana/web3.js";
import {
    AccountLayout,
    MintLayout,
    MintInfo,
    Token,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import {
    logError,
    getKeypair,
    getPublicKey,
    getTokenBalance,
    writePublicKey,
    getKeypairByPath,
    getProgramId,
    LunabankLayout,
    LUNABANK_ACCOUNT_DATA_LAYOUT,
    LunaDepositLayout,
    LUNADEPOSIT_ACCOUNT_DATA_LAYOUT,
} from "./utils";
import {Buffer} from "buffer";

program
    .command('init')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-b, --base-token-mint <string>', 'base token mint')
    .requiredOption('-r, --recipe-token-mint <string>', 'recipe token mint')
    .option(
        '-g, --gen-new',
        'Optional: Generate keys to create new contract',
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
        //console.log(">>>>>>>>!!!!!!", directory, cmd)
        const {keypair, programId, baseTokenMint, recipeTokenMint, genNew} = cmd.opts();
        console.log("keypair: ", keypair);
        console.log("genNew: ", genNew);
        console.log("baseTokenMint: ", baseTokenMint);
        console.log("RecipeTokenMint: ", recipeTokenMint);
        console.log("programid: ", programId);

        const callerKp = getKeypairByPath(keypair);
        console.log(callerKp);
        console.log(callerKp.publicKey.toBase58());
        const LunabankProgramPubkey = new PublicKey(programId);
        const baseTokenMintPubkey = new PublicKey(baseTokenMint);
        const recipeTokenMintPubkey = new PublicKey(recipeTokenMint);
        console.log("LunabankProgramId", LunabankProgramPubkey.toBase58());

        const connection = new Connection("http://localhost:8899", "confirmed");

        const configKeypair = new Keypair();
        const depositaryTokenAccountKeypair = new Keypair();

        const createDepositaryTokenAccountIx = SystemProgram.createAccount({
            programId: TOKEN_PROGRAM_ID,
            space: AccountLayout.span,
            lamports: await connection.getMinimumBalanceForRentExemption(
                AccountLayout.span
            ),
            fromPubkey: callerKp.publicKey,
            newAccountPubkey: depositaryTokenAccountKeypair.publicKey,
        });
        const initDepositaryAccountIx = Token.createInitAccountInstruction(
            TOKEN_PROGRAM_ID,
            baseTokenMintPubkey,
            depositaryTokenAccountKeypair.publicKey,
            callerKp.publicKey
        );

        // const transferXTokensToTempAccIx = Token.createTransferInstruction(
        //     TOKEN_PROGRAM_ID,
        //     aliceXTokenAccountPubkey,
        //     tempXTokenAccountKeypair.publicKey,
        //     aliceKeypair.publicKey,
        //     [],
        //     terms.bobExpectedAmount
        // );
        /////
        const createLunabankConfigAccountIx = SystemProgram.createAccount({
            space: LUNABANK_ACCOUNT_DATA_LAYOUT.span,
            lamports: await connection.getMinimumBalanceForRentExemption(
                LUNABANK_ACCOUNT_DATA_LAYOUT.span
            ),
            fromPubkey: callerKp.publicKey,
            newAccountPubkey: configKeypair.publicKey,
            programId: LunabankProgramPubkey,
        });

        const initConfigBankAccountIx = new TransactionInstruction({
            programId: LunabankProgramPubkey,
            keys: [
                { pubkey: callerKp.publicKey, isSigner: true, isWritable: false },
                { pubkey: configKeypair.publicKey, isSigner: false, isWritable: true },
                { pubkey: baseTokenMintPubkey, isSigner: false, isWritable: false },
                { pubkey: depositaryTokenAccountKeypair.publicKey, isSigner: false, isWritable: false },
                { pubkey: recipeTokenMintPubkey, isSigner: false, isWritable: true },
                { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            data: Buffer.from(
                Uint8Array.of(0)
            ),
        });

        const tx = new Transaction().add(
            createDepositaryTokenAccountIx,
            initDepositaryAccountIx,
            createLunabankConfigAccountIx,
            initConfigBankAccountIx,
        );
        console.log("basetoken acc = ", depositaryTokenAccountKeypair.publicKey.toBase58());
        console.log("Sending init transaction..., account data addr = ", configKeypair.publicKey.toBase58());
        await connection.sendTransaction(
            tx,
//          [callerKp,],
//            [callerKp, depositaryTokenAccountKeypair],
            [callerKp, configKeypair, depositaryTokenAccountKeypair],
            { skipPreflight: false, preflightCommitment: "confirmed" }
        );

        return;
    })

const dumpUserConfig = async (
    connection: Connection,
    programId: PublicKey,
    configPubkey: PublicKey,
    userPubkey: PublicKey,
) => {
    const userPDAt = await PublicKey.findProgramAddress(
        [
            configPubkey.toBuffer(),
            userPubkey.toBuffer(),
            Buffer.from("deposit")
        ],
        programId
    );
    const userPDA = userPDAt[0];
    console.log("userPDA = ", userPDA.toBase58());


    const userAccData = await connection.getAccountInfo(
        userPDA
    );
    if (userAccData === null || userAccData.data.length === 0) {
        logError("River state account has not been initialized properly");
        return;
    }

    const decodedLunaDepositState = LUNADEPOSIT_ACCOUNT_DATA_LAYOUT.decode(
        userAccData.data
    ) as LunaDepositLayout;

    const owner = new PublicKey(decodedLunaDepositState.owner);
    const amount = new BN(decodedLunaDepositState.amount, 10, "le").toString();
    const startTimestamp = new BN(decodedLunaDepositState.startTimestamp, 10, "le").toNumber();
    const endTimestamp = new BN(decodedLunaDepositState.endTimestamp, 10, "le").toNumber();

    console.log("owner = ", owner);
    console.log("amount  = ", amount);
    console.log("startTimestamp  = ", new Date(startTimestamp * 1000));
    console.log("endTimestamp  = ", new Date(endTimestamp * 1000));
}

const dumpConfig = async (
    connection: Connection,
    configPubkey: PublicKey
) => {
    const accData = await connection.getAccountInfo(
        configPubkey
    );
    printConfig(accData);

    if (accData === null || accData.data.length === 0) {
        logError("River state account has not been initialized properly");
        process.exit(1);
    }

    const decodedLunabankState = LUNABANK_ACCOUNT_DATA_LAYOUT.decode(
        accData.data
    ) as LunabankLayout;

    const baseTokenAccount = new PublicKey(decodedLunabankState.baseTokenAccount);
    const recipeTokenMint = new PublicKey(decodedLunabankState.recipeTokenMint);

    const baseToken = await connection.getAccountInfo(
        baseTokenAccount
    );
    printTokenAccount(baseToken);

    const recipeMint = await connection.getAccountInfo(
        recipeTokenMint
    );
    printTokenMint(recipeMint);
};

const printConfig =  (
    accData: AccountInfo<Buffer> | null
) => {
    console.log("res = getAccountInfo", accData);

    if (accData === null || accData.data.length === 0) {
        logError("River state account has not been initialized properly");
        process.exit(1);
    }

    const encodedLunabankState = accData.data;
    const decodedLunabankState = LUNABANK_ACCOUNT_DATA_LAYOUT.decode(
        encodedLunabankState
    ) as LunabankLayout;
    console.log("raw = ", decodedLunabankState);
    console.log("config.init =  ", !!decodedLunabankState.isInitialized,);
    console.log("config.owner ", new PublicKey(decodedLunabankState.owner).toBase58());
    console.log("config.baseTokenMint ", new PublicKey(decodedLunabankState.baseTokenMint).toBase58());
    console.log("config.recipeTokenMint ", new PublicKey(decodedLunabankState.recipeTokenMint).toBase58());
    console.log("config.baseTokenAccount ", new PublicKey(decodedLunabankState.baseTokenAccount).toBase58());
    console.log("config.coef ", new BN(decodedLunabankState.coef, 10, "le").toString());
};


const printTokenAccount =  (
    accData: AccountInfo<Buffer> | null
) => {
    // console.log("res = printTokenAccount", accData);

    if (accData === null || accData.data.length === 0) {
        logError("River state account has not been initialized properly");
        process.exit(1);
    }

    const tokenAccountData = AccountLayout.decode(
        Buffer.from(accData.data)
    );

    // console.log("raw = ", tokenAccountData);
    console.log("addr =", new PublicKey(tokenAccountData.mint).toBase58());
    console.log("amount =", tokenAccountData.amount);
    console.log("amount =", new BN(tokenAccountData.amount, 10, "le").toString());

};

const printTokenMint =  (
    accData: AccountInfo<Buffer> | null
) => {

    if (accData === null || accData.data.length === 0) {
        logError("baseToken account has not been initialized properly");
        process.exit(1);
    }

    const tokenMintData = MintLayout.decode(
        Buffer.from(accData.data)
    );
    // console.log("raw = ", tokenMintData);
    console.log("supply =", tokenMintData.supply);
    console.log("supply =", new BN(tokenMintData.supply, 10, "le").toString());
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
        console.log("LunaProgramId", RiverProgramId.toBase58());
        console.log("LunaConfigId", RiverConfigId.toBase58());

        const connection = new Connection("http://localhost:8899", "confirmed");
        dumpConfig(connection, RiverConfigId);
    })

program
    .command('dumpuser')
    .requiredOption('-u, --user <string>', 'user')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-c, --config-account <string>', 'configaccout')
    .option(
        '-g, --gen-new',
        'Optional: Generate keys to create new contract',
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
        //console.log(">>>>>>>>!!!!!!", directory, cmd)
        const {user, programId, configAccount} = cmd.opts();
        console.log("user: ", user);
        console.log("programid: ", programId);
        console.log("config: ", configAccount);
        const programPubkey = new PublicKey(programId);
        const userPubkey = new PublicKey(user);
        const configPubkey = new PublicKey(configAccount);

        console.log("programPubkey", programPubkey.toBase58());
        console.log("userPubkey", userPubkey.toBase58());
        console.log("configPubkey", configPubkey.toBase58());

        const connection = new Connection("http://localhost:8899", "confirmed");
        dumpUserConfig(connection, programPubkey, configPubkey, userPubkey);
    })

program
    .command('close')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-c, --config-account <string>', 'configaccout')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
        //console.log(">>>>>>>>!!!!!!", directory, cmd)
        const {keypair, programId, configAccount} = cmd.opts();
        console.log("keypair: ", keypair);
        console.log("configAccount: ", configAccount);
        console.log("programid: ", programId);

        const callerKp = getKeypairByPath(keypair);
        console.log(callerKp.publicKey.toBase58());
        const LunabankProgramPubkey = new PublicKey(programId);
        //const baseTokenMintPubkey = new PublicKey(baseTokenMint);
        //const recipeTokenMintPubkey = new PublicKey(recipeTokenMint);
        console.log("LunabankProgramId", LunabankProgramPubkey.toBase58());
        const ConfigProgramPubkey = new PublicKey(configAccount);

        const connection = new Connection("http://localhost:8899", "confirmed");
        const configAccData = await connection.getAccountInfo(
            ConfigProgramPubkey
        );

        if (configAccData === null || configAccData.data.length === 0) {
            logError("River state account has not been initialized properly");
            process.exit(1);
        }
        const encodedLunabankState = configAccData.data;
        const decodedLunabankState = LUNABANK_ACCOUNT_DATA_LAYOUT.decode(
            encodedLunabankState
        ) as LunabankLayout;

        const baseTokenAccount =   new PublicKey(decodedLunabankState.baseTokenAccount)
        const recipeTokenMint =   new PublicKey(decodedLunabankState.recipeTokenMint)
        console.log("config.recipeTokenMint ", recipeTokenMint.toBase58());
        console.log("config.baseTokenAccount ", baseTokenAccount.toBase58());
        /// to to transaction ...


        const PDA = await PublicKey.findProgramAddress(
            [ConfigProgramPubkey.toBuffer(), Buffer.from("lunaowner")],
            LunabankProgramPubkey
        );
        console.log("PDA owner = ", PDA[0].toBase58());


        const closeRiverIx = new TransactionInstruction({
            programId: LunabankProgramPubkey,
            keys: [
                { pubkey: callerKp.publicKey, isSigner: true, isWritable: false },
                { pubkey: ConfigProgramPubkey, isSigner: false, isWritable: true },
                { pubkey: baseTokenAccount, isSigner: false, isWritable: true },
                { pubkey: recipeTokenMint, isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: PDA[0], isSigner: false, isWritable: false },
            ],
            data: Buffer.from(
                Uint8Array.of(1)
            ),
        });

        const tx = new Transaction().add(
            closeRiverIx
        );
        console.log("Sending close transaction..., account data addr = ", LunabankProgramPubkey.toBase58());
        await connection.sendTransaction(
            tx,
            [callerKp, ],
            { skipPreflight: false, preflightCommitment: "confirmed" }
        );

        return;
    })

program
    .command('deposit')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-a, --amount <integer>', 'amount')
    .requiredOption('-t, --deposit-time <integer>', 'time(sec)')
    .requiredOption('-c, --config-account <string>', 'configaccout')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
        //console.log(">>>>>>>>!!!!!!", directory, cmd)
        const {keypair, programId, amount, depositTime, configAccount, } = cmd.opts();
        console.log("keypair: ", keypair);
        console.log("programid: ", programId);
        console.log("config: ", configAccount);
        console.log("amount: ", amount);
        console.log("depositTime: ", depositTime);

        const callerKp = getKeypairByPath(keypair);
        console.log(callerKp);
        console.log(callerKp.publicKey.toBase58());
        const LunabankProgramId = new PublicKey(programId);
        const LunabankConfigId = new PublicKey(configAccount);
        console.log("LunabankProgramId", LunabankProgramId.toBase58());
        console.log("LunabankConfigId", LunabankConfigId.toBase58());
        const connection = new Connection("http://localhost:8899", "confirmed");

        await dumpConfig(connection, LunabankConfigId);

        const configAccData = await connection.getAccountInfo(
            LunabankConfigId
        );

        if (configAccData === null || configAccData.data.length === 0) {
            logError("River state account has not been initialized properly");
            process.exit(1);
        }
        const encodedLunabankState = configAccData.data;
        const decodedLunabankState = LUNABANK_ACCOUNT_DATA_LAYOUT.decode(
            encodedLunabankState
        ) as LunabankLayout;

        const baseTokenAccount =   new PublicKey(decodedLunabankState.baseTokenAccount);
        const baseTokenMint =   new PublicKey(decodedLunabankState.baseTokenMint);
        const recipeTokenMint =   new PublicKey(decodedLunabankState.recipeTokenMint);
        console.log("config.recipeTokenMint ", recipeTokenMint.toBase58());
        console.log("config.baseTokenAccount ", baseTokenAccount.toBase58());
        console.log("config.baseTokenMint ", baseTokenMint.toBase58());

        const tx = new Transaction();

        console.log("payer  = ", callerKp.publicKey.toBase58());
        console.log("TOKEN_PROGRAM_ID = ", TOKEN_PROGRAM_ID.toBase58());
        console.log("ASSOCIATED_TOKEN_PROGRAM_ID = ", ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());

        const userBaseTokenAccountPubkey = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            baseTokenMint,
            callerKp.publicKey,
        );
        console.log("ata userBaseTokenAccountPubkey = ", userBaseTokenAccountPubkey.toBase58());
        const userBaseTokenAccData = await connection.getAccountInfo(
            userBaseTokenAccountPubkey
        );
        if (userBaseTokenAccData === null || userBaseTokenAccData.data.length === 0) {
            console.log("account ",
                callerKp.publicKey.toBase58(),
                " don't have ATA for ",
                baseTokenMint.toBase58());
            return;
        }

        const recipeTokenAccountPubkey = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            recipeTokenMint,
            callerKp.publicKey,
        );
        console.log("ata recipeTokenAccountPubkey", recipeTokenAccountPubkey.toBase58());

        const recipeTokenAccData = await connection.getAccountInfo(
            recipeTokenAccountPubkey
        );
        if (recipeTokenAccData === null || recipeTokenAccData.data.length === 0) {
            const createRecipeTokenAccountIx = Token.createAssociatedTokenAccountInstruction(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                recipeTokenMint,
                recipeTokenAccountPubkey,
                callerKp.publicKey,
                callerKp.publicKey
            );
            tx.add(
                createRecipeTokenAccountIx,
            );
        }
        const userPDA = await PublicKey.findProgramAddress(
            [
                LunabankConfigId.toBuffer(),
                callerKp.publicKey.toBuffer(),
                Buffer.from("deposit")
            ],
            LunabankProgramId
        );
        console.log("userPDA owner = ", userPDA[0].toBase58(), " , seed = ",  userPDA[1]);
        const PDA = await PublicKey.findProgramAddress(
            [LunabankConfigId.toBuffer(), Buffer.from("lunaowner")],
            LunabankProgramId
        );

        console.log("PDA owner = ", PDA[0].toBase58(), " , seed = ",  PDA[1]);

        const depositBankIx = new TransactionInstruction({
            programId: LunabankProgramId,
            keys: [
                { pubkey: callerKp.publicKey, isSigner: true, isWritable: false },
                { pubkey: LunabankConfigId, isSigner: false, isWritable: true },
                { pubkey: baseTokenMint, isSigner: false, isWritable: false },
                { pubkey: baseTokenAccount, isSigner: false, isWritable: true },
                { pubkey: userBaseTokenAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: recipeTokenMint, isSigner: false, isWritable: true },
                { pubkey: recipeTokenAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: userPDA[0], isSigner: false, isWritable: true },
                { pubkey: PDA[0], isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            ],
            data: Buffer.from(
                Uint8Array.of(2,
                    ...new BN(amount).toArray("le", 8),
                    ...new BN(depositTime).toArray("le", 8)
                )
            ),
        });

        tx.add(
            depositBankIx
        );
        console.log("Sending deposit transaction..., account config addr = ", LunabankConfigId.toBase58());
        await connection.sendTransaction(
            tx,
            [callerKp, ],
            { skipPreflight: false, preflightCommitment: "confirmed" }
        );

        // sleep to allow time to update
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await dumpConfig(connection, LunabankConfigId);
    })

program
    .command('withdraw')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-c, --config-account <string>', 'configaccout')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
        const {keypair, programId, configAccount} = cmd.opts();
        console.log("keypair: ", keypair);
        console.log("programid: ", programId);
        console.log("config: ", configAccount);

        const callerKp = getKeypairByPath(keypair);
        console.log(callerKp);
        console.log(callerKp.publicKey.toBase58());
        const LunabankProgramId = new PublicKey(programId);
        const LunabankConfigId = new PublicKey(configAccount);
        console.log("LunabankProgramId", LunabankProgramId.toBase58());
        console.log("LunabankConfigId", LunabankConfigId.toBase58());
        const connection = new Connection("http://localhost:8899", "confirmed");

        await dumpConfig(connection, LunabankConfigId);

        const configAccData = await connection.getAccountInfo(
            LunabankConfigId
        );

        if (configAccData === null || configAccData.data.length === 0) {
            logError("River state account has not been initialized properly");
            process.exit(1);
        }
        const encodedLunabankState = configAccData.data;
        const decodedLunabankState = LUNABANK_ACCOUNT_DATA_LAYOUT.decode(
            encodedLunabankState
        ) as LunabankLayout;

        const baseTokenAccount =   new PublicKey(decodedLunabankState.baseTokenAccount);
        const baseTokenMint =   new PublicKey(decodedLunabankState.baseTokenMint);
        const recipeTokenMint =   new PublicKey(decodedLunabankState.recipeTokenMint);
        console.log("config.recipeTokenMint ", recipeTokenMint.toBase58());
        console.log("config.baseTokenAccount ", baseTokenAccount.toBase58());
        console.log("config.baseTokenMint ", baseTokenMint.toBase58());

        const tx = new Transaction();

        console.log("payer  = ", callerKp.publicKey.toBase58());
        console.log("TOKEN_PROGRAM_ID = ", TOKEN_PROGRAM_ID.toBase58());
        console.log("ASSOCIATED_TOKEN_PROGRAM_ID = ", ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());

        const userBaseTokenAccountPubkey = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            baseTokenMint,
            callerKp.publicKey,
        );
        console.log("ata userBaseTokenAccountPubkey = ", userBaseTokenAccountPubkey.toBase58());
        const userBaseTokenAccData = await connection.getAccountInfo(
            userBaseTokenAccountPubkey
        );
        if (userBaseTokenAccData === null || userBaseTokenAccData.data.length === 0) {
            console.log("account ",
                callerKp.publicKey.toBase58(),
                " don't have ATA for ",
                baseTokenMint.toBase58());
            return;
        }

        const recipeTokenAccountPubkey = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            recipeTokenMint,
            callerKp.publicKey,
        );
        console.log("ata recipeTokenAccountPubkey", recipeTokenAccountPubkey.toBase58());

        // const recipeTokenAccData = await connection.getAccountInfo(
        //     recipeTokenAccountPubkey
        // );

        const userPDA = await PublicKey.findProgramAddress(
            [
                LunabankConfigId.toBuffer(),
                callerKp.publicKey.toBuffer(),
                Buffer.from("deposit")
            ],
            LunabankProgramId
        );
        console.log("userPDA owner = ", userPDA[0].toBase58(), " , seed = ",  userPDA[1]);
        const PDA = await PublicKey.findProgramAddress(
            [LunabankConfigId.toBuffer(), Buffer.from("lunaowner")],
            LunabankProgramId
        );

        console.log("PDA owner = ", PDA[0].toBase58(), " , seed = ",  PDA[1]);

        const withdrawBankIx = new TransactionInstruction({
            programId: LunabankProgramId,
            keys: [
                { pubkey: callerKp.publicKey, isSigner: true, isWritable: false },
                { pubkey: LunabankConfigId, isSigner: false, isWritable: true },
                { pubkey: baseTokenMint, isSigner: false, isWritable: false },
                { pubkey: baseTokenAccount, isSigner: false, isWritable: true },
                { pubkey: userBaseTokenAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: recipeTokenMint, isSigner: false, isWritable: true },
                { pubkey: recipeTokenAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: userPDA[0], isSigner: false, isWritable: true },
                { pubkey: PDA[0], isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            ],
            data: Buffer.from(
                Uint8Array.of(3)
            ),
        });

        tx.add(
            withdrawBankIx
        );
        console.log("Sending withdraw transaction..., account config addr = ", LunabankConfigId.toBase58());
        await connection.sendTransaction(
            tx,
            [callerKp, ],
            { skipPreflight: false, preflightCommitment: "confirmed" }
        );

        // sleep to allow time to update
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await dumpConfig(connection, LunabankConfigId);
    })

program
    .command('test3')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
        const accountMetas = [
            {
                pubkey: "1111",
                isWritable: true,
                isSigner: true,
            },
            {
                pubkey: "1112",
                isWritable: true,
                isSigner: true,
            },
            {
                pubkey: "1113",
                isWritable: true,
                isSigner: true,
            },
            {
                pubkey: "1114",
                isWritable: true,
                isSigner: true,
            },
            {
                pubkey: "1115",
                isWritable: true,
                isSigner: true,
            },
            {
                pubkey: "22222",
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: "22223",
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: "22224",
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: "22225",
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: "22226",
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: "32229",
                isWritable: false,
                isSigner: false,
            },
            {
                pubkey: "32225",
                isWritable: false,
                isSigner: false,
            },
            {
                pubkey: "32226",
                isWritable: false,
                isSigner: false,
            },
            {
                pubkey: "32227",
                isWritable: false,
                isSigner: false,
            },
            {
                pubkey: "42224",
                isWritable: false,
                isSigner: true,
            },
            {
                pubkey: "42225",
                isWritable: false,
                isSigner: true,
            },
            {
                pubkey: "42226",
                isWritable: false,
                isSigner: true,
            },
        ];

        let accountMetas2 = accountMetas
          .map(value => ({ value, sort: Math.random() }))
          .sort((a, b) => ((parseInt(a.value.pubkey) % 10) - (parseInt(b.value.pubkey) % 10)) || a.sort - b.sort)
          .map(({ value }) => value);

        const sortedAccountMetas = accountMetas2
            .map((item, index) => ({ item, index }))
            .sort((xt, yt) =>  {
                const x = xt.item;
                const y = yt.item;
                const checkSigner = x.isSigner === y.isSigner ? 0 : x.isSigner ? -1 : 1;
                const checkWritable =
                    x.isWritable === y.isWritable ? 0 : x.isWritable ? -1 : 1;
                return checkSigner || checkWritable || xt.index - yt.index;
            })
            .map(({ item }) => item);

        console.log("AAA = ", sortedAccountMetas);
    });

program.parse();
