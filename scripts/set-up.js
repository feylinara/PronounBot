#!/usr/bin/env node

readline = require('readline');
fs = require('fs');

const main = async () => {

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (x) => new Promise ((resolve) => rl.question(x, resolve));

  const pgHost = await question("What is the postgres host address? [5432] ");
  const pgPort = await question("What is the port of the database you want to use? [localhost] ");
  const pgUser = await question("What is the postgres user? ");
  const pgPassword = await question("What is the postgres password? ");
  const pgDatabase = await question("What is the name of the database you want to use? [pronounbot] ");

  let discordSecret = '';
  while (discordSecret == '') {
    discordSecret = await question("What is the discord secret key?\n");
  }

  let start_sh =
    '#!/bin/sh\n' +
    '\n' +
    (pgUser != '' ? `PGUSER=${pgUser} \\ \n` : '') +
    (pgPassword != '' ? `PGPASSWORD=${pgPassword} \\ \n` : '') +
    (pgHost != '' ? `PGHOST=${pgHost} \\ \n` : '') +
    (pgPort != '' ? `PGPORT=${pgPort} \\ \n` : '') +
    `PGDATABASE=${pgDatabase || 'pronounbot'} \\ \n` +
    `DISCORDSECRET=${discordSecret} \\ \n` +
    `node src/index.js`;

  console.log('\n\n' + start_sh + '\n\n');

  if(await question("Is this the correct configuration? (type yes to confirm): ") == 'yes') {
    try {
      const file = fs.openSync('./start.sh', 'ax');
      fs.writeFileSync(file, start_sh);
      console.log("start.sh written");
    } catch (e) {
      if (e.code == 'EEXIST') {
        console.error("The file already exists. Please delete it if you want to replace it");
      }
    }
  } else {
    console.error("Cancelling operation");
  }
  rl.close()
}

main()
