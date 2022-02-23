"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var commander_1 = require("commander");
var BN = require("bn.js");
var web3_js_1 = require("@solana/web3.js");
var spl_token_1 = require("@solana/spl-token");
var utils_1 = require("./utils");
var buffer_1 = require("buffer");
commander_1.program
    .command('init')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-b, --base-token-mint <string>', 'base token mint')
    .requiredOption('-r, --recipe-token-mint <string>', 'recipe token mint')
    .option('-g, --gen-new', 'Optional: Generate keys to create new contract')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(function (directory, cmd) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, keypair, programId, baseTokenMint, recipeTokenMint, genNew, callerKp, LunabankProgramPubkey, baseTokenMintPubkey, recipeTokenMintPubkey, connection, configKeypair, depositaryTokenAccountKeypair, createDepositaryTokenAccountIx, _b, _c, initDepositaryAccountIx, createLunabankConfigAccountIx, _d, _e, initConfigBankAccountIx, tx;
    var _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                _a = cmd.opts(), keypair = _a.keypair, programId = _a.programId, baseTokenMint = _a.baseTokenMint, recipeTokenMint = _a.recipeTokenMint, genNew = _a.genNew;
                console.log("keypair: ", keypair);
                console.log("genNew: ", genNew);
                console.log("baseTokenMint: ", baseTokenMint);
                console.log("RecipeTokenMint: ", recipeTokenMint);
                console.log("programid: ", programId);
                callerKp = (0, utils_1.getKeypairByPath)(keypair);
                console.log(callerKp);
                console.log(callerKp.publicKey.toBase58());
                LunabankProgramPubkey = new web3_js_1.PublicKey(programId);
                baseTokenMintPubkey = new web3_js_1.PublicKey(baseTokenMint);
                recipeTokenMintPubkey = new web3_js_1.PublicKey(recipeTokenMint);
                console.log("LunabankProgramId", LunabankProgramPubkey.toBase58());
                connection = new web3_js_1.Connection("http://localhost:8899", "confirmed");
                configKeypair = new web3_js_1.Keypair();
                depositaryTokenAccountKeypair = new web3_js_1.Keypair();
                _c = (_b = web3_js_1.SystemProgram).createAccount;
                _f = {
                    programId: spl_token_1.TOKEN_PROGRAM_ID,
                    space: spl_token_1.AccountLayout.span
                };
                return [4 /*yield*/, connection.getMinimumBalanceForRentExemption(spl_token_1.AccountLayout.span)];
            case 1:
                createDepositaryTokenAccountIx = _c.apply(_b, [(_f.lamports = _h.sent(),
                        _f.fromPubkey = callerKp.publicKey,
                        _f.newAccountPubkey = depositaryTokenAccountKeypair.publicKey,
                        _f)]);
                initDepositaryAccountIx = spl_token_1.Token.createInitAccountInstruction(spl_token_1.TOKEN_PROGRAM_ID, baseTokenMintPubkey, depositaryTokenAccountKeypair.publicKey, callerKp.publicKey);
                _e = (_d = web3_js_1.SystemProgram).createAccount;
                _g = {
                    space: utils_1.LUNABANK_ACCOUNT_DATA_LAYOUT.span
                };
                return [4 /*yield*/, connection.getMinimumBalanceForRentExemption(utils_1.LUNABANK_ACCOUNT_DATA_LAYOUT.span)];
            case 2:
                createLunabankConfigAccountIx = _e.apply(_d, [(_g.lamports = _h.sent(),
                        _g.fromPubkey = callerKp.publicKey,
                        _g.newAccountPubkey = configKeypair.publicKey,
                        _g.programId = LunabankProgramPubkey,
                        _g)]);
                initConfigBankAccountIx = new web3_js_1.TransactionInstruction({
                    programId: LunabankProgramPubkey,
                    keys: [
                        { pubkey: callerKp.publicKey, isSigner: true, isWritable: false },
                        { pubkey: configKeypair.publicKey, isSigner: false, isWritable: true },
                        { pubkey: baseTokenMintPubkey, isSigner: false, isWritable: false },
                        { pubkey: depositaryTokenAccountKeypair.publicKey, isSigner: false, isWritable: false },
                        { pubkey: recipeTokenMintPubkey, isSigner: false, isWritable: true },
                        { pubkey: web3_js_1.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                        { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                    ],
                    data: buffer_1.Buffer.from(Uint8Array.of(0))
                });
                tx = new web3_js_1.Transaction().add(createDepositaryTokenAccountIx, initDepositaryAccountIx, createLunabankConfigAccountIx, initConfigBankAccountIx);
                console.log("basetoken acc = ", depositaryTokenAccountKeypair.publicKey.toBase58());
                console.log("Sending init transaction..., account data addr = ", configKeypair.publicKey.toBase58());
                return [4 /*yield*/, connection.sendTransaction(tx, 
                    //          [callerKp,],
                    //            [callerKp, depositaryTokenAccountKeypair],
                    [callerKp, configKeypair, depositaryTokenAccountKeypair], { skipPreflight: false, preflightCommitment: "confirmed" })];
            case 3:
                _h.sent();
                return [2 /*return*/];
        }
    });
}); });
var dumpUserConfig = function (connection, programId, configPubkey, userPubkey) { return __awaiter(void 0, void 0, void 0, function () {
    var userPDAt, userPDA, userAccData, decodedLunaDepositState, owner, amount, startTimestamp, endTimestamp;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, web3_js_1.PublicKey.findProgramAddress([
                    configPubkey.toBuffer(),
                    userPubkey.toBuffer(),
                    buffer_1.Buffer.from("deposit")
                ], programId)];
            case 1:
                userPDAt = _a.sent();
                userPDA = userPDAt[0];
                console.log("userPDA = ", userPDA.toBase58());
                return [4 /*yield*/, connection.getAccountInfo(userPDA)];
            case 2:
                userAccData = _a.sent();
                if (userAccData === null || userAccData.data.length === 0) {
                    (0, utils_1.logError)("River state account has not been initialized properly");
                    return [2 /*return*/];
                }
                decodedLunaDepositState = utils_1.LUNADEPOSIT_ACCOUNT_DATA_LAYOUT.decode(userAccData.data);
                owner = new web3_js_1.PublicKey(decodedLunaDepositState.owner);
                amount = new BN(decodedLunaDepositState.amount, 10, "le").toString();
                startTimestamp = new BN(decodedLunaDepositState.startTimestamp, 10, "le").toNumber();
                endTimestamp = new BN(decodedLunaDepositState.endTimestamp, 10, "le").toNumber();
                console.log("owner = ", owner);
                console.log("amount  = ", amount);
                console.log("startTimestamp  = ", new Date(startTimestamp * 1000));
                console.log("endTimestamp  = ", new Date(endTimestamp * 1000));
                return [2 /*return*/];
        }
    });
}); };
var dumpConfig = function (connection, configPubkey) { return __awaiter(void 0, void 0, void 0, function () {
    var accData, decodedLunabankState, baseTokenAccount, recipeTokenMint, baseToken, recipeMint;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, connection.getAccountInfo(configPubkey)];
            case 1:
                accData = _a.sent();
                printConfig(accData);
                if (accData === null || accData.data.length === 0) {
                    (0, utils_1.logError)("River state account has not been initialized properly");
                    process.exit(1);
                }
                decodedLunabankState = utils_1.LUNABANK_ACCOUNT_DATA_LAYOUT.decode(accData.data);
                baseTokenAccount = new web3_js_1.PublicKey(decodedLunabankState.baseTokenAccount);
                recipeTokenMint = new web3_js_1.PublicKey(decodedLunabankState.recipeTokenMint);
                return [4 /*yield*/, connection.getAccountInfo(baseTokenAccount)];
            case 2:
                baseToken = _a.sent();
                printTokenAccount(baseToken);
                return [4 /*yield*/, connection.getAccountInfo(recipeTokenMint)];
            case 3:
                recipeMint = _a.sent();
                printTokenMint(recipeMint);
                return [2 /*return*/];
        }
    });
}); };
var printConfig = function (accData) {
    console.log("res = getAccountInfo", accData);
    if (accData === null || accData.data.length === 0) {
        (0, utils_1.logError)("River state account has not been initialized properly");
        process.exit(1);
    }
    var encodedLunabankState = accData.data;
    var decodedLunabankState = utils_1.LUNABANK_ACCOUNT_DATA_LAYOUT.decode(encodedLunabankState);
    console.log("raw = ", decodedLunabankState);
    console.log("config.init =  ", !!decodedLunabankState.isInitialized);
    console.log("config.owner ", new web3_js_1.PublicKey(decodedLunabankState.owner).toBase58());
    console.log("config.baseTokenMint ", new web3_js_1.PublicKey(decodedLunabankState.baseTokenMint).toBase58());
    console.log("config.recipeTokenMint ", new web3_js_1.PublicKey(decodedLunabankState.recipeTokenMint).toBase58());
    console.log("config.baseTokenAccount ", new web3_js_1.PublicKey(decodedLunabankState.baseTokenAccount).toBase58());
    console.log("config.coef ", new BN(decodedLunabankState.coef, 10, "le").toString());
};
var printTokenAccount = function (accData) {
    // console.log("res = printTokenAccount", accData);
    if (accData === null || accData.data.length === 0) {
        (0, utils_1.logError)("River state account has not been initialized properly");
        process.exit(1);
    }
    var tokenAccountData = spl_token_1.AccountLayout.decode(buffer_1.Buffer.from(accData.data));
    // console.log("raw = ", tokenAccountData);
    console.log("addr =", new web3_js_1.PublicKey(tokenAccountData.mint).toBase58());
    console.log("amount =", tokenAccountData.amount);
    console.log("amount =", new BN(tokenAccountData.amount, 10, "le").toString());
};
var printTokenMint = function (accData) {
    if (accData === null || accData.data.length === 0) {
        (0, utils_1.logError)("baseToken account has not been initialized properly");
        process.exit(1);
    }
    var tokenMintData = spl_token_1.MintLayout.decode(buffer_1.Buffer.from(accData.data));
    // console.log("raw = ", tokenMintData);
    console.log("supply =", tokenMintData.supply);
    console.log("supply =", new BN(tokenMintData.supply, 10, "le").toString());
};
commander_1.program
    .command('dump')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-c, --config-account <string>', 'configaccout')
    .option('-g, --gen-new', 'Optional: Generate keys to create new contract')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(function (directory, cmd) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, keypair, programId, configAccount, callerKp, RiverProgramId, RiverConfigId, connection;
    return __generator(this, function (_b) {
        _a = cmd.opts(), keypair = _a.keypair, programId = _a.programId, configAccount = _a.configAccount;
        console.log("keypair: ", keypair);
        console.log("programid: ", programId);
        console.log("config: ", configAccount);
        callerKp = (0, utils_1.getKeypairByPath)(keypair);
        console.log(callerKp);
        console.log(callerKp.publicKey.toBase58());
        RiverProgramId = new web3_js_1.PublicKey(programId);
        RiverConfigId = new web3_js_1.PublicKey(configAccount);
        console.log("LunaProgramId", RiverProgramId.toBase58());
        console.log("LunaConfigId", RiverConfigId.toBase58());
        connection = new web3_js_1.Connection("http://localhost:8899", "confirmed");
        dumpConfig(connection, RiverConfigId);
        return [2 /*return*/];
    });
}); });
commander_1.program
    .command('dumpuser')
    .requiredOption('-u, --user <string>', 'user')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-c, --config-account <string>', 'configaccout')
    .option('-g, --gen-new', 'Optional: Generate keys to create new contract')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(function (directory, cmd) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, user, programId, configAccount, programPubkey, userPubkey, configPubkey, connection;
    return __generator(this, function (_b) {
        _a = cmd.opts(), user = _a.user, programId = _a.programId, configAccount = _a.configAccount;
        console.log("user: ", user);
        console.log("programid: ", programId);
        console.log("config: ", configAccount);
        programPubkey = new web3_js_1.PublicKey(programId);
        userPubkey = new web3_js_1.PublicKey(user);
        configPubkey = new web3_js_1.PublicKey(configAccount);
        console.log("programPubkey", programPubkey.toBase58());
        console.log("userPubkey", userPubkey.toBase58());
        console.log("configPubkey", configPubkey.toBase58());
        connection = new web3_js_1.Connection("http://localhost:8899", "confirmed");
        dumpUserConfig(connection, programPubkey, configPubkey, userPubkey);
        return [2 /*return*/];
    });
}); });
commander_1.program
    .command('close')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-c, --config-account <string>', 'configaccout')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(function (directory, cmd) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, keypair, programId, configAccount, callerKp, LunabankProgramPubkey, ConfigProgramPubkey, connection, configAccData, encodedLunabankState, decodedLunabankState, baseTokenAccount, recipeTokenMint, PDA, closeRiverIx, tx;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = cmd.opts(), keypair = _a.keypair, programId = _a.programId, configAccount = _a.configAccount;
                console.log("keypair: ", keypair);
                console.log("configAccount: ", configAccount);
                console.log("programid: ", programId);
                callerKp = (0, utils_1.getKeypairByPath)(keypair);
                console.log(callerKp.publicKey.toBase58());
                LunabankProgramPubkey = new web3_js_1.PublicKey(programId);
                //const baseTokenMintPubkey = new PublicKey(baseTokenMint);
                //const recipeTokenMintPubkey = new PublicKey(recipeTokenMint);
                console.log("LunabankProgramId", LunabankProgramPubkey.toBase58());
                ConfigProgramPubkey = new web3_js_1.PublicKey(configAccount);
                connection = new web3_js_1.Connection("http://localhost:8899", "confirmed");
                return [4 /*yield*/, connection.getAccountInfo(ConfigProgramPubkey)];
            case 1:
                configAccData = _b.sent();
                if (configAccData === null || configAccData.data.length === 0) {
                    (0, utils_1.logError)("River state account has not been initialized properly");
                    process.exit(1);
                }
                encodedLunabankState = configAccData.data;
                decodedLunabankState = utils_1.LUNABANK_ACCOUNT_DATA_LAYOUT.decode(encodedLunabankState);
                baseTokenAccount = new web3_js_1.PublicKey(decodedLunabankState.baseTokenAccount);
                recipeTokenMint = new web3_js_1.PublicKey(decodedLunabankState.recipeTokenMint);
                console.log("config.recipeTokenMint ", recipeTokenMint.toBase58());
                console.log("config.baseTokenAccount ", baseTokenAccount.toBase58());
                return [4 /*yield*/, web3_js_1.PublicKey.findProgramAddress([ConfigProgramPubkey.toBuffer(), buffer_1.Buffer.from("lunaowner")], LunabankProgramPubkey)];
            case 2:
                PDA = _b.sent();
                console.log("PDA owner = ", PDA[0].toBase58());
                closeRiverIx = new web3_js_1.TransactionInstruction({
                    programId: LunabankProgramPubkey,
                    keys: [
                        { pubkey: callerKp.publicKey, isSigner: true, isWritable: false },
                        { pubkey: ConfigProgramPubkey, isSigner: false, isWritable: true },
                        { pubkey: baseTokenAccount, isSigner: false, isWritable: true },
                        { pubkey: recipeTokenMint, isSigner: false, isWritable: true },
                        { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: PDA[0], isSigner: false, isWritable: false },
                    ],
                    data: buffer_1.Buffer.from(Uint8Array.of(1))
                });
                tx = new web3_js_1.Transaction().add(closeRiverIx);
                console.log("Sending close transaction..., account data addr = ", LunabankProgramPubkey.toBase58());
                return [4 /*yield*/, connection.sendTransaction(tx, [callerKp,], { skipPreflight: false, preflightCommitment: "confirmed" })];
            case 3:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
commander_1.program
    .command('deposit')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-a, --amount <integer>', 'amount')
    .requiredOption('-t, --deposit-time <integer>', 'time(sec)')
    .requiredOption('-c, --config-account <string>', 'configaccout')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(function (directory, cmd) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, keypair, programId, amount, depositTime, configAccount, callerKp, LunabankProgramId, LunabankConfigId, connection, configAccData, encodedLunabankState, decodedLunabankState, baseTokenAccount, baseTokenMint, recipeTokenMint, tx, userBaseTokenAccountPubkey, userBaseTokenAccData, recipeTokenAccountPubkey, recipeTokenAccData, createRecipeTokenAccountIx, userPDA, PDA, depositBankIx;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = cmd.opts(), keypair = _a.keypair, programId = _a.programId, amount = _a.amount, depositTime = _a.depositTime, configAccount = _a.configAccount;
                console.log("keypair: ", keypair);
                console.log("programid: ", programId);
                console.log("config: ", configAccount);
                console.log("amount: ", amount);
                console.log("depositTime: ", depositTime);
                callerKp = (0, utils_1.getKeypairByPath)(keypair);
                console.log(callerKp);
                console.log(callerKp.publicKey.toBase58());
                LunabankProgramId = new web3_js_1.PublicKey(programId);
                LunabankConfigId = new web3_js_1.PublicKey(configAccount);
                console.log("LunabankProgramId", LunabankProgramId.toBase58());
                console.log("LunabankConfigId", LunabankConfigId.toBase58());
                connection = new web3_js_1.Connection("http://localhost:8899", "confirmed");
                return [4 /*yield*/, dumpConfig(connection, LunabankConfigId)];
            case 1:
                _b.sent();
                return [4 /*yield*/, connection.getAccountInfo(LunabankConfigId)];
            case 2:
                configAccData = _b.sent();
                if (configAccData === null || configAccData.data.length === 0) {
                    (0, utils_1.logError)("River state account has not been initialized properly");
                    process.exit(1);
                }
                encodedLunabankState = configAccData.data;
                decodedLunabankState = utils_1.LUNABANK_ACCOUNT_DATA_LAYOUT.decode(encodedLunabankState);
                baseTokenAccount = new web3_js_1.PublicKey(decodedLunabankState.baseTokenAccount);
                baseTokenMint = new web3_js_1.PublicKey(decodedLunabankState.baseTokenMint);
                recipeTokenMint = new web3_js_1.PublicKey(decodedLunabankState.recipeTokenMint);
                console.log("config.recipeTokenMint ", recipeTokenMint.toBase58());
                console.log("config.baseTokenAccount ", baseTokenAccount.toBase58());
                console.log("config.baseTokenMint ", baseTokenMint.toBase58());
                tx = new web3_js_1.Transaction();
                console.log("payer  = ", callerKp.publicKey.toBase58());
                console.log("TOKEN_PROGRAM_ID = ", spl_token_1.TOKEN_PROGRAM_ID.toBase58());
                console.log("ASSOCIATED_TOKEN_PROGRAM_ID = ", spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());
                return [4 /*yield*/, spl_token_1.Token.getAssociatedTokenAddress(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, baseTokenMint, callerKp.publicKey)];
            case 3:
                userBaseTokenAccountPubkey = _b.sent();
                console.log("ata userBaseTokenAccountPubkey = ", userBaseTokenAccountPubkey.toBase58());
                return [4 /*yield*/, connection.getAccountInfo(userBaseTokenAccountPubkey)];
            case 4:
                userBaseTokenAccData = _b.sent();
                if (userBaseTokenAccData === null || userBaseTokenAccData.data.length === 0) {
                    console.log("account ", callerKp.publicKey.toBase58(), " don't have ATA for ", baseTokenMint.toBase58());
                    return [2 /*return*/];
                }
                return [4 /*yield*/, spl_token_1.Token.getAssociatedTokenAddress(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, recipeTokenMint, callerKp.publicKey)];
            case 5:
                recipeTokenAccountPubkey = _b.sent();
                console.log("ata recipeTokenAccountPubkey", recipeTokenAccountPubkey.toBase58());
                return [4 /*yield*/, connection.getAccountInfo(recipeTokenAccountPubkey)];
            case 6:
                recipeTokenAccData = _b.sent();
                if (recipeTokenAccData === null || recipeTokenAccData.data.length === 0) {
                    createRecipeTokenAccountIx = spl_token_1.Token.createAssociatedTokenAccountInstruction(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, recipeTokenMint, recipeTokenAccountPubkey, callerKp.publicKey, callerKp.publicKey);
                    tx.add(createRecipeTokenAccountIx);
                }
                return [4 /*yield*/, web3_js_1.PublicKey.findProgramAddress([
                        LunabankConfigId.toBuffer(),
                        callerKp.publicKey.toBuffer(),
                        buffer_1.Buffer.from("deposit")
                    ], LunabankProgramId)];
            case 7:
                userPDA = _b.sent();
                console.log("userPDA owner = ", userPDA[0].toBase58(), " , seed = ", userPDA[1]);
                return [4 /*yield*/, web3_js_1.PublicKey.findProgramAddress([LunabankConfigId.toBuffer(), buffer_1.Buffer.from("lunaowner")], LunabankProgramId)];
            case 8:
                PDA = _b.sent();
                console.log("PDA owner = ", PDA[0].toBase58(), " , seed = ", PDA[1]);
                depositBankIx = new web3_js_1.TransactionInstruction({
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
                        { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: web3_js_1.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                        { pubkey: web3_js_1.SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
                    ],
                    data: buffer_1.Buffer.from(Uint8Array.of.apply(Uint8Array, __spreadArray(__spreadArray([2], new BN(amount).toArray("le", 8), false), new BN(depositTime).toArray("le", 8), false)))
                });
                tx.add(depositBankIx);
                console.log("Sending deposit transaction..., account config addr = ", LunabankConfigId.toBase58());
                return [4 /*yield*/, connection.sendTransaction(tx, [callerKp,], { skipPreflight: false, preflightCommitment: "confirmed" })];
            case 9:
                _b.sent();
                // sleep to allow time to update
                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
            case 10:
                // sleep to allow time to update
                _b.sent();
                return [4 /*yield*/, dumpConfig(connection, LunabankConfigId)];
            case 11:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
commander_1.program
    .command('withdraw')
    .option('-k, --keypair <string>', 'rewrite key to create, default: alice', './keys/alice.json')
    .requiredOption('-p, --program-id <string>', 'programid')
    .requiredOption('-c, --config-account <string>', 'configaccout')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(function (directory, cmd) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, keypair, programId, configAccount, callerKp, LunabankProgramId, LunabankConfigId, connection, configAccData, encodedLunabankState, decodedLunabankState, baseTokenAccount, baseTokenMint, recipeTokenMint, tx, userBaseTokenAccountPubkey, userBaseTokenAccData, recipeTokenAccountPubkey, userPDA, PDA, withdrawBankIx;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = cmd.opts(), keypair = _a.keypair, programId = _a.programId, configAccount = _a.configAccount;
                console.log("keypair: ", keypair);
                console.log("programid: ", programId);
                console.log("config: ", configAccount);
                callerKp = (0, utils_1.getKeypairByPath)(keypair);
                console.log(callerKp);
                console.log(callerKp.publicKey.toBase58());
                LunabankProgramId = new web3_js_1.PublicKey(programId);
                LunabankConfigId = new web3_js_1.PublicKey(configAccount);
                console.log("LunabankProgramId", LunabankProgramId.toBase58());
                console.log("LunabankConfigId", LunabankConfigId.toBase58());
                connection = new web3_js_1.Connection("http://localhost:8899", "confirmed");
                return [4 /*yield*/, dumpConfig(connection, LunabankConfigId)];
            case 1:
                _b.sent();
                return [4 /*yield*/, connection.getAccountInfo(LunabankConfigId)];
            case 2:
                configAccData = _b.sent();
                if (configAccData === null || configAccData.data.length === 0) {
                    (0, utils_1.logError)("River state account has not been initialized properly");
                    process.exit(1);
                }
                encodedLunabankState = configAccData.data;
                decodedLunabankState = utils_1.LUNABANK_ACCOUNT_DATA_LAYOUT.decode(encodedLunabankState);
                baseTokenAccount = new web3_js_1.PublicKey(decodedLunabankState.baseTokenAccount);
                baseTokenMint = new web3_js_1.PublicKey(decodedLunabankState.baseTokenMint);
                recipeTokenMint = new web3_js_1.PublicKey(decodedLunabankState.recipeTokenMint);
                console.log("config.recipeTokenMint ", recipeTokenMint.toBase58());
                console.log("config.baseTokenAccount ", baseTokenAccount.toBase58());
                console.log("config.baseTokenMint ", baseTokenMint.toBase58());
                tx = new web3_js_1.Transaction();
                console.log("payer  = ", callerKp.publicKey.toBase58());
                console.log("TOKEN_PROGRAM_ID = ", spl_token_1.TOKEN_PROGRAM_ID.toBase58());
                console.log("ASSOCIATED_TOKEN_PROGRAM_ID = ", spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());
                return [4 /*yield*/, spl_token_1.Token.getAssociatedTokenAddress(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, baseTokenMint, callerKp.publicKey)];
            case 3:
                userBaseTokenAccountPubkey = _b.sent();
                console.log("ata userBaseTokenAccountPubkey = ", userBaseTokenAccountPubkey.toBase58());
                return [4 /*yield*/, connection.getAccountInfo(userBaseTokenAccountPubkey)];
            case 4:
                userBaseTokenAccData = _b.sent();
                if (userBaseTokenAccData === null || userBaseTokenAccData.data.length === 0) {
                    console.log("account ", callerKp.publicKey.toBase58(), " don't have ATA for ", baseTokenMint.toBase58());
                    return [2 /*return*/];
                }
                return [4 /*yield*/, spl_token_1.Token.getAssociatedTokenAddress(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, recipeTokenMint, callerKp.publicKey)];
            case 5:
                recipeTokenAccountPubkey = _b.sent();
                console.log("ata recipeTokenAccountPubkey", recipeTokenAccountPubkey.toBase58());
                return [4 /*yield*/, web3_js_1.PublicKey.findProgramAddress([
                        LunabankConfigId.toBuffer(),
                        callerKp.publicKey.toBuffer(),
                        buffer_1.Buffer.from("deposit")
                    ], LunabankProgramId)];
            case 6:
                userPDA = _b.sent();
                console.log("userPDA owner = ", userPDA[0].toBase58(), " , seed = ", userPDA[1]);
                return [4 /*yield*/, web3_js_1.PublicKey.findProgramAddress([LunabankConfigId.toBuffer(), buffer_1.Buffer.from("lunaowner")], LunabankProgramId)];
            case 7:
                PDA = _b.sent();
                console.log("PDA owner = ", PDA[0].toBase58(), " , seed = ", PDA[1]);
                withdrawBankIx = new web3_js_1.TransactionInstruction({
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
                        { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                        { pubkey: web3_js_1.SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
                    ],
                    data: buffer_1.Buffer.from(Uint8Array.of(3))
                });
                tx.add(withdrawBankIx);
                console.log("Sending withdraw transaction..., account config addr = ", LunabankConfigId.toBase58());
                return [4 /*yield*/, connection.sendTransaction(tx, [callerKp,], { skipPreflight: false, preflightCommitment: "confirmed" })];
            case 8:
                _b.sent();
                // sleep to allow time to update
                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
            case 9:
                // sleep to allow time to update
                _b.sent();
                return [4 /*yield*/, dumpConfig(connection, LunabankConfigId)];
            case 10:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
commander_1.program
    .command('test3')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(function (directory, cmd) { return __awaiter(void 0, void 0, void 0, function () {
    var accountMetas, accountMetas2, sortedAccountMetas;
    return __generator(this, function (_a) {
        accountMetas = [
            {
                pubkey: "1111",
                isWritable: true,
                isSigner: true
            },
            {
                pubkey: "1112",
                isWritable: true,
                isSigner: true
            },
            {
                pubkey: "1113",
                isWritable: true,
                isSigner: true
            },
            {
                pubkey: "1114",
                isWritable: true,
                isSigner: true
            },
            {
                pubkey: "1115",
                isWritable: true,
                isSigner: true
            },
            {
                pubkey: "22222",
                isWritable: true,
                isSigner: false
            },
            {
                pubkey: "22223",
                isWritable: true,
                isSigner: false
            },
            {
                pubkey: "22224",
                isWritable: true,
                isSigner: false
            },
            {
                pubkey: "22225",
                isWritable: true,
                isSigner: false
            },
            {
                pubkey: "22226",
                isWritable: true,
                isSigner: false
            },
            {
                pubkey: "32229",
                isWritable: false,
                isSigner: false
            },
            {
                pubkey: "32225",
                isWritable: false,
                isSigner: false
            },
            {
                pubkey: "32226",
                isWritable: false,
                isSigner: false
            },
            {
                pubkey: "32227",
                isWritable: false,
                isSigner: false
            },
            {
                pubkey: "42224",
                isWritable: false,
                isSigner: true
            },
            {
                pubkey: "42225",
                isWritable: false,
                isSigner: true
            },
            {
                pubkey: "42226",
                isWritable: false,
                isSigner: true
            },
        ];
        accountMetas2 = accountMetas
            .map(function (value) { return ({ value: value, sort: Math.random() }); })
            .sort(function (a, b) { return ((parseInt(a.value.pubkey) % 10) - (parseInt(b.value.pubkey) % 10)) || a.sort - b.sort; })
            .map(function (_a) {
            var value = _a.value;
            return value;
        });
        sortedAccountMetas = accountMetas2
            .map(function (item, index) { return ({ item: item, index: index }); })
            .sort(function (xt, yt) {
            var x = xt.item;
            var y = yt.item;
            var checkSigner = x.isSigner === y.isSigner ? 0 : x.isSigner ? -1 : 1;
            var checkWritable = x.isWritable === y.isWritable ? 0 : x.isWritable ? -1 : 1;
            return checkSigner || checkWritable || xt.index - yt.index;
        })
            .map(function (_a) {
            var item = _a.item;
            return item;
        });
        console.log("AAA = ", sortedAccountMetas);
        return [2 /*return*/];
    });
}); });
commander_1.program.parse();
