const { RichEmbed } = require('discord.js');

const examples = [
  { pronoun: 'she/her', language: 'English', iso: 'eng' },
  { pronoun: 'nin/nim', language: 'German', iso: 'deu' },
  { pronoun: 'vij', language: 'nld', iso: 'nld' },
  /* { pronoun: 'elle', language: 'Spanish', iso: 'spa' }, */
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
    return `Use as \`${commandPrefix} ${command} <pronoun> [language:<language>/l:<language>]\`, ` +
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
    '***Help for PronounBot***\n' +
    '\n' +
    '**Add:** Add a pronoun role to your roles\n' +
    getUsage('add', commandWord, serverSettings) +
    '\n\n' +
    '**Delete:** Delete a pronoun role from your roles *(aliases: remove, del, rm)*\n' +
    getUsage('delete', commandWord, serverSettings) +
    '\n\n' +
    '**List:** Show the pronouns we know for your language *(aliases: ls)*\n' +
    getUsage('list', commandWord, serverSettings) +
    '\n\n' +
    '**Languages:** Show a list of the languages we have pronouns for' +
    '\n\n' +
    '**Help:** Show this help screen';
  if (config) {
    helpText +=
      '\n\n***Config Options:***\n\n' +
      '**Prefix:** set a server prefix\n' +
      getUsage('prefix', commandWord, serverSettings) +
      '\n\n' +
      '**Language:** set the server\'s primary language\n' +
      getUsage('language', commandWord, serverSettings) +
      '\n\n';
  }
  helpText +=
    '*If you have any feedback or bug reports please tell me on my [discord server](https://discord.gg/UcjkRJq) ' +
               'or my [github](https://github.com/feylinara/pronounbot)*';
  const embed = new RichEmbed()
    .setAuthor('Bontje the PronounBot')
    .setDescription(helpText);
  return embed;
};

module.exports = { getUsage, getHelpText };
