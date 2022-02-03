# river test contract

## for tests
```
... build and deploy contract with PROGRAM_ID address
$ cargo build-bpf
$ cargo test-bpf

$ solana-test-validator
$ solana logs


$ solana-keygen new --no-passphrase -o ./keys/alice.json
$ solana-keygen new --no-passphrase -o ./keys/bob.json
$ solana airdrop 10 ./keys/alice.json
$ solana airdrop 10 ./keys/bob.json
$ npm run compile && node build/cli.js init  -p PROGRAM_ID
$ npm run compile && node build/cli.js dump  -p PROGRAM_ID -c CONFIG_ID
$ npm run compile && node build/cli.js accum  -p PROGRM_ID -c CONFIG_ID -a 333 -k ./keys/bob.json
```

// inspired by https://github.com/paul-schaaf/solana-escrow

// see also https://github.com/mvines/solana-bpf-program-template

