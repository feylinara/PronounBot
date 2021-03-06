const localisation = require("./localisation.js");
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
    return `${serverSettings.prefix}${commandWord} ${command} ${pronoun}`;
  }
  return `${serverSettings.prefix}${commandWord} ${command} ${pronoun} language:${language}`;
};

const getUsage = (command, commandWord, serverSettings) => {
  const commandPrefix = `${serverSettings.prefix}${commandWord}`;
  if (command == 'add' || command == 'delete') {
    return `${commandPrefix} ${command} <pronoun> [language:<language>]`
  } else if (command == 'prefix') {
    return `${commandPrefix} config prefix <prefix>`;
  } else if (command == 'config language') {
    return `${commandPrefix} config language <language>`;
  } else if (command == 'language') {
    return `${commandPrefix} language <language>`;
  } else if (command == 'help') {
    return `${commandPrefix} help`
  } else if (command == 'list') {
    return `${commandPrefix} list [<language>]`
  }
};

const getHelpText = (commandWord, serverSettings, config) => {
  let fb = localisation[serverSettings.primaryLanguage] || localisation['eng'];
  let help_msg = fb.getMessage("help");
  let errors = [];
  let helpText = fb.formatPattern(help_msg.value, {
	  "add-usage": getUsage('add', commandWord, serverSettings),
	  "add-example": getExample('add', commandWord, serverSettings),
	  "delete-usage": getUsage('delete', commandWord, serverSettings),
	  "delete-example": getExample('delete', commandWord, serverSettings),
	  "help-usage": getUsage('help', commandWord, serverSettings),
	  "list-usage": getUsage('list', commandWord, serverSettings),
	  "lang-usage": getUsage('language', commandWord, serverSettings),
  }, errors);
  if (config) {
    helpText += "\n\n";
    helpText += fb.formatPattern(help_msg.attributes.config, {
	  "prefix-usage":getUsage('prefix', commandWord, serverSettings),
	  "primary-lang-usage":getUsage('config language', commandWord, serverSettings),
    }, errors)
  }
  helpText += "\n\n";

  let feedback_msg = fb.getMessage("feedback");
  helpText += fb.formatPattern(feedback_msg.value, {
	  "discord-server": process.env.HELP_SERVER,
	  "github-link": process.env.GITHUB,
  });


  if (errors.length) {
	  console.log("localistion errors:");
	  console.log(errors);
  }
  return embed()
    .setDescription(helpText);
};

module.exports = { getUsage, getHelpText };
