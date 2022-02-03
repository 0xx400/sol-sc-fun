# sol-sc-fun


some playground for solana smartcontracts stuff



# hints 

$ cargo build
$ cargo test
$ cargo build-bpf
$ cargo test-bpf

$ solana-test-validator
$ solana logs

# use https://explorer.solana.com/?cluster=custom to see transaction & accounts

# scripts: 

$ npm install

# for tests

$ npm run compile && node build/cli.js init  -p PROGRAM_ID
$ npm run compile && node build/cli.js dump  -p PROGRAM_ID -c CONFIG_ID
$ npm run compile && node build/cli.js accum  -p PROGRM_ID -c CONFIG_ID -a 333


# inspired by https://github.com/paul-schaaf/solana-escrow
# see also https://github.com/mvines/solana-bpf-program-template

