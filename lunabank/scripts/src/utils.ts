import { Connection, Keypair, PublicKey } from "@solana/web3.js";
//@ts-expect-error missing types
import * as BufferLayout from "buffer-layout";

import * as fs from "fs";

export const logError = (msg: string) => {
//  console.log(`\x1b[31m${msg}\x1b[0m`);
  console.log(`\x1b[31m ERROR \x1b[0m`);
  console.log(msg);
};

export const getKeypairByPath = (name: string) => {
  return Keypair.fromSecretKey(
      Uint8Array.from(
        JSON.parse(fs.readFileSync(name) as unknown as string)
      )
  );
};

export const writePublicKey = (publicKey: PublicKey, name: string) => {
  fs.writeFileSync(
    `./keys/${name}_pub.json`,
    JSON.stringify(publicKey.toString())
  );
};

export const getPublicKey = (name: string) =>
  new PublicKey(
    JSON.parse(fs.readFileSync(`./keys/${name}_pub.json`) as unknown as string)
  );

export const getPrivateKey = (name: string) =>
  Uint8Array.from(
    JSON.parse(fs.readFileSync(`./keys/${name}.json`) as unknown as string)
  );

export const getKeypair = (name: string) =>
  new Keypair({
    publicKey: getPublicKey(name).toBytes(),
    secretKey: getPrivateKey(name),
  });

export const getProgramId = () => {
  try {
    return getPublicKey("program");
  } catch (e) {
    logError("Given programId is missing or incorrect");
    process.exit(1);
  }
};

export const getTokenBalance = async (
  pubkey: PublicKey,
  connection: Connection
) => {
  return parseInt(
    (await connection.getTokenAccountBalance(pubkey)).value.amount
  );
};

/**
 * Layout for a public key
 */
const publicKey = (property = "publicKey") => {
  return BufferLayout.blob(32, property);
};

/**
 * Layout for a 64bit unsigned value
 */
const uint64 = (property = "uint64") => {
  return BufferLayout.blob(8, property);
};

export const LUNABANK_ACCOUNT_DATA_LAYOUT = BufferLayout.struct([
  BufferLayout.u8("isInitialized"),
  publicKey("owner"),
  publicKey("baseTokenMint"),
  publicKey("recipeTokenMint"),
  publicKey("baseTokenAccount"),
  uint64("coef"),
]);

export interface LunabankLayout {
  isInitialized: number;
  owner: Uint8Array;
  baseTokenMint: Uint8Array;
  recipeTokenMint: Uint8Array;
  baseTokenAccount: Uint8Array;
  coef: Uint8Array;
}
