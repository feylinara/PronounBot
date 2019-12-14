const { Client, RichEmbed, Permissions } = require('discord.js');
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
  let formatter = (x) => `- ${x}`;
  const languageName = result.rows[0].language;
  const title = `**Pronouns in ${languageName}**`;

  await paginate(pronouns, formatter, title, { channel, author });
};

const listLanguages = async ({ channel, author }) => {
  const languages = (await database.countPronouns()).rows;

  const title = `**Languages we support**`;
  const formatter = ({language, pronouns}) => `${language}: ${pronouns} pronouns`;

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
      parse = parse.map((x) => x.replace(/"/g, '').toLowerCase());
      if (parse[0] == `${serverSettings.prefix}${commandWord}`) {
        if (parse[1] == 'add') {
          if (parse.length < 3) {
            await showError(getUsage('add', commandWord, serverSettings), message.channel);
          } else {
            await pronounAction('add', parse.slice(2), message, serverSettings);
          }
        } else if (parse[1] == 'delete' || parse[1] == 'remove' || parse[1] == 'rm') {
          if (parse.length < 3) {
            await showError(getUsage('delete', commandWord, serverSettings), message.channel);
          } else {
            await pronounAction('delete', parse.slice(2), message, serverSettings);
          }
        } else if (parse[1] == 'languages' || parse[1] == 'langs') {
          await listLanguages(message);
        } else if (parse[1] == 'list' || parse[1] == 'ls') {
          await listPronouns(parse, message, serverSettings);
        } else if (parse[1] == 'help') {
          const embed = getHelpText(commandWord, serverSettings, message.member.hasPermission(Permissions.FLAGS.MANAGE_GUILD));
          await message.channel.send(embed);
        } else if (parse[1] == 'config' || parse[1] == 'config') {
          if (message.member.hasPermission(Permissions.FLAGS.MANAGE_GUILD)) {
            if (parse[2] == 'prefix') {
              if (parse.length < 4) {
                showError(getUsage('prefix', commandWord, serverSettings), message.channel);
              } else {
                await database.updatePrefix(guildId, parse[3]);
                await message.channel.send(`changed prefix to ${parse[3]}`);
              }
            } else if (parse[2] == 'language') {
              const languages = await database.getLanguage(parse[3]);
              if (languages.length == 0) {
                showError('I\'m sorry, I don\'t know that language (unfortunately autonyms aren\'t supported yet, so please use the English name for now) :(', message.channel);
              } else if (languages.length == 1) {
                await message.channel.send(`Setting your language to ${languages[0].name} [${languages[0].iso_639_3}]`);
                await database.updatePrimaryLanguage(languages[0].iso_639_3);
              } else {
                const question = 'We have several languages that match that name.\nWhich one do you want?';
                const choice = await chooser(message, question, languages, (language) => `${language.name} [${language.iso_639_3}]`);
                await database.updatePrimaryLanguage(choice.iso_639_3);
              }
            }
          } else {
            await showError('I\'m sorry, you don\'t have permission to do this :(', message.channel);
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
  await discordClient.user.setPresence({ game: { name: 'Gender: Hard Mode' } });
});

discordClient.login(process.env.DISCORDSECRET);
