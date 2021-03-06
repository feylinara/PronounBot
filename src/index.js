const localisation = require("./localisation.js");

const { Client, Permissions } = require('discord.js');
const { Database } = require('./db.js');
const { getHelpText, getUsage } = require('./help.js');
const { chooser, filterOptions, showError, paginate, normaliseId } = require('./util.js');

const database = new Database();
const { pronounAction } = require('./pronouns.js')(database);

const discordClient = new Client();

const defaultPrefix = '^';
const defaultLanguage = 'eng';
const commandWord = process.env.COMMANDWORD || 'pronouns';

const listPronouns = async (args, { author, channel }, serverSettings) => {
  const language = filterOptions(args, serverSettings.primaryLanguage)[1];
  const result = await database.listPronouns(language);
  if (result.rows.length == 0) {
    throw {
      userfacing: true,
      message: 'sorry, we don\'t have any pronouns for that language',
    };
  }
  const pronouns = result.rows.map((row) => row.cases
    .join('/')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\~')
    .replace(/>/g, '\\>')
    .replace(/\|/g, '\\|')
    .replace(/`/g, '\\`'));
  const formatter = (x) => `- ${x}`;
  const languageName = result.rows[0].language;
  const title = `**Pronouns in ${languageName}**`;

  await paginate(pronouns, formatter, title, { channel, author }, serverSettings);
};

const listLanguages = async ({ channel, author }) => {
  const languages = (await database.countPronouns()).rows;

  const title = '**Languages we support**';
  const formatter = ({ language, pronouns }) => `${ language }: ${ pronouns } pronouns`;

  await paginate(languages, formatter, title, { channel, author });
};

discordClient.on('message', async (message) => {
  const guildId = normaliseId(message.guild);
  try {
    let serverSettings = await database.getServerSettings(guildId);
    let initServerPromise = Promise.resolve();
    if (serverSettings == null) {
      initServerPromise = database.initServerSettings(guildId, defaultPrefix, defaultLanguage);
      serverSettings = {
        prefix: defaultPrefix,
        primaryLanguage: defaultLanguage,
        abuseProtect: true,
      };
    }

    // split by space keeping quote-wrapped strings
    let parse = message.content.match(/(?:[^\s"]+|"[^"]*")+/g);
    if (parse) {
      cmd = parse.map((x) => x.replace(/"/g, '').toLowerCase());
      if (cmd[0] == `${serverSettings.prefix}${commandWord}`) {
        if (cmd[1] == 'add') {
          if (cmd.length < 3) {
            await showError(getUsage('add', commandWord, serverSettings), message.channel, message.author);
          } else {
            await pronounAction('add', parse.slice(2), message, serverSettings);
          }
        } else if (cmd[1] == 'delete' || cmd[1] == 'remove' || cmd[1] == 'rm') {
          if (cmd.length < 3) {
            await showError(getUsage('delete', commandWord, serverSettings), message.channel, message.author);
          } else {
            await pronounAction('delete', parse.slice(2), message, serverSettings);
          }
        } else if (cmd[1] == 'languages' || cmd[1] == 'langs') {
          await listLanguages(message);
        } else if (cmd[1] == 'list' || cmd[1] == 'ls') {
          await listPronouns(cmd, message, serverSettings);
        } else if (cmd[1] == 'help') {
          const embed = getHelpText(commandWord, serverSettings, message.member.hasPermission(Permissions.FLAGS.MANAGE_GUILD));
          await message.channel.send(embed);
        } else if (cmd[1] == 'config' || cmd[1] == 'config') {
          if (message.member.hasPermission(Permissions.FLAGS.MANAGE_GUILD)) {
            if (cmd[2] == 'prefix') {
              if (cmd.length < 4) {
                await showError(getUsage('prefix', commandWord, serverSettings), message.channel, message.author);
              } else {
                await database.updatePrefix(guildId, cmd[3]);
                await message.channel.send(`changed server prefix to ${cmd[3]}`);
              }
            } else if (cmd[2] == 'language') {
              const languages = await database.getLanguage(cmd[3]);
              if (languages.length == 0) {
                await showError('I\'m sorry, I don\'t know that language (unfortunately endonyms aren\'t supported yet, so please use the English name for now) :(', message.channel, message.author);
              } else if (languages.length == 1) {
                await database.updatePrimaryLanguage(guildId, languages[0].iso_639_3);
                await message.channel.send(`set server language to ${languages[0].name} [${languages[0].iso_639_3}]`);
              } else {
                const question = 'We have several languages that match that name.\nWhich one do you want?';
                const choice = await chooser(message, question, languages, (language) => `${language.name} [${language.iso_639_3}]`);
                await database.updatePrimaryLanguage(guildId, choice.iso_639_3);
              }
            }
          } else {
            await showError('I\'m sorry, you don\'t have permission to do this :(', message.channel, message.author);
          }
        }
      }
    }
    await initServerPromise;
  } catch (e) {
    console.log(e);
  }
});

discordClient.on('ready', async () => {
  await discordClient.user.setPresence({ game: { name: `^${commandWord} help` } });
  console.log("booted");
});

discordClient.on('error', async (e) => {
	console.log(e);
});
discordClient.login(process.env.DISCORDSECRET);
