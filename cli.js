#!/usr/bin/env node
const SqsMv = require('./sqsmv');
const argv = require('yargs')
    .usage('Usage: $0 -s [string] -d [string] -p [num]')
    .demandOption(['s','d', 'p'])
    .alias('s', 'source')
    .alias('d', 'destination')
    .alias('p', 'parallel')
    .default('p', 10)
    .example('$0 -s main_dead -d main', 'Move messages from main_dead back to main queue')
    .describe('s', 'Source queue (name or url)')
    .describe('d', 'Destination queue (name or url)')
    .argv;


const main = async() => {
    let app = new SqsMv();
    await app.setSource(argv.source);
    await app.setDestination(argv.destination);
    let processed = 0;
    while(processed = await app.tick(argv.parallel)){
        console.log(processed + " messages moved");
    }
};


main();