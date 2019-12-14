const { embed } = require('./branding.js');

const examples = [
  { pronoun: 'she/her', language: 'English', iso: 'eng' },
  { pronoun: 'nin/nim', language: 'German', iso: 'deu' },
  { pronoun: 'vij', language: 'nld', iso: 'nld' },
  { pronoun: 'elle', language: 'Spanish', iso: 'spa' },
];

const getExample = (command, commandWord, serverSettings) => {
  const { pronoun, language, iso } = examples[Math.floor(Math.random() * examples.length)];
  if (iso == serverSettings.primaryLanguage) {
    return `\`${serverSettings.prefix}${commandWord} ${command} ${pronoun}\``;
  }
  return `\`${serverSettings.prefix}${commandWord} ${command} ${pronoun} language:${language}\``;
};

const getUsage = (command, commandWord, serverSettings) => {
  const commandPrefix = `${serverSettings.prefix}${commandWord}`;
  if (command == 'add' || command == 'delete') {
    return `Use as \`${commandPrefix} ${command} <pronoun> [language:<language>]\`, ` +
         `for example ${getExample(command, commandWord, serverSettings)}`;
  } else if (command == 'prefix') {
    return `Use as \`${commandPrefix} config prefix <prefix>\`, ` +
           `for example \`${commandPrefix} config prefix !\``;
  } else if (command == 'language') {
    return `Use as \`${commandPrefix} config language <language>\`, ` +
      `for example \`${commandPrefix} config language ${examples[Math.floor(Math.random() * examples.length)].language}\``;
  } else if (command == 'list') {
    return `Use as \`${commandPrefix} list [<language>]\`, ` +
      `for example \`${commandPrefix} list language:${examples[Math.floor(Math.random() * examples.length)].language}\``;
  }
};

const getHelpText = (commandWord, serverSettings, config) => {
  let helpText =
`***Help for Bontje the pronoun bot***

**General Info:**

Bontje is a bot to manage pronoun roles

All commands that take a language flag can take \`language:<language>\`, \`lang:<language>\` or \`l:<language>\`, where language can be an iso code (like *deu* or *de*) or the English name (like *German*)

Where commands take pronouns you do not have to enter all forms of a pronoun, Bontje will guess, and ask when there's multiple possibilities

***Commands:***

**Add:** Add a pronoun role to your roles
 ${getUsage('add', commandWord, serverSettings)}

**Delete:** Delete a pronoun role from your roles *(aliases: remove, del, rm)*
 ${getUsage('delete', commandWord, serverSettings)}

**List:** Show the pronouns we know for your language *(aliases: ls)*
 ${getUsage('list', commandWord, serverSettings)}

**Languages:** Show a list of the languages we have pronouns for

**Help:** Show this help screen`;
  if (config) {
    helpText +=
`

     ***Config Options:***

     **Prefix:** set a server prefix\n
      ${getUsage('prefix', commandWord, serverSettings)}

     **Language:** set the server\'s primary language\n
      ${getUsage('language', commandWord, serverSettings)}

`;
  }
  helpText +=
    '*If you have any feedback or bug reports please tell me on my [discord server](https://discord.gg/UcjkRJq) ' +
               'or my [github](https://github.com/feylinara/pronounbot)*';
  return embed()
    .setDescription(helpText);
};

module.exports = { getUsage, getHelpText };
