const { Client, RichEmbed, Permissions } = require('discord.js');
const { queue } = require('async');
const { Database } = require('./db.js');
const { getHelpText, getUsage } = require('./help.js');

const database = new Database();
const discordClient = new Client();

const defaultPrefix = '^';
const defaultLanguage = 'eng';
const commandWord = process.env.COMMANDWORD || 'pronouns';

const serverQueues = {};

const showError = async (errorMessage, channel) => {
  channel.send(`:space_invader: ${errorMessage}`);
};

const filterOptions = (args, fallback) => {
  let language;
  args = args.filter((el) => {
    if (el.startsWith('language:')) {
      if (!language) {
        language = el.substring('language:'.length);
      } else {
        throw {
          message: 'I\'m sorry I can only deal with one language at a time',
          userfacing: true,
        };
      }
      return false;
    } else {
      return true;
    }
  });
  if (!language) {
    language = fallback;
  }
  return [args, language];
};

const listPronouns = async (args, { author, channel }, serverSettings) => {
  const language = filterOptions(args, serverSettings.primaryLanguage)[1];
  const result = await database.listPronouns(language);
  if (result.rows.length == 0) {
    throw {
      userfacing: true,
      message: 'sorry, we don\'t have any pronouns for that language',
    };
  }
  const pronouns = result.rows.map((row) => row.cases.join('/'));
  const languageName = result.rows[0].language;
  let first = 0;
  const length = 20;
  let embed = new RichEmbed().setAuthor('Bontje the PronounBot')
    .setDescription(`**Pronouns in ${languageName}**\n` +
                                               pronouns.slice(first, Math.min(pronouns.length, first + length)).join('\n'));
  if (pronouns.length > length) {
    embed = embed.setFooter('Navigate using ⬅️ and ➡️');
  }
  const message = await channel.send(embed);
  await message.react('⬅️');
  await message.react('➡️');
  const filter = (reaction, user) => (reaction.emoji.name === '⬅️' || reaction.emoji.name === '➡️') &&
                                   user.id === author.id;
  const collector = message.createReactionCollector(filter, { time: 5 * 60 * 500 });
  collector.on('collect', async (reaction) => {
    if (reaction.emoji.name === '➡️') {
      first += length;
      if (first > pronouns.length) {
        first = 0;
      }
      reaction.remove(author);

      embed = new RichEmbed().setAuthor('Bontje the PronounBot')
        .setDescription(`**Pronouns in ${languageName}**\n` +
                                             pronouns.slice(first, Math.min(pronouns.length, first + length)).join('\n'))
        .setFooter('Navigate using ⬅️ and ➡️');
      message.edit(embed);
    }
    if (reaction.emoji.name === '⬅️') {
      first -= length;
      if (first < 0) {
        first = pronouns.length % length;
      }
      reaction.remove(author);

      embed = new RichEmbed().setAuthor('Bontje the PronounBot')
        .setDescription(`**Pronouns in ${languageName}**\n` +
                                             pronouns.slice(first, Math.min(pronouns.length, first + length)).join('\n'))
        .setFooter('Navigate using ⬅️ and ➡️');
      message.edit(embed);
    }
  });
};

const chooser = async ({ author, channel }, question, choices, choiceFormatter) => {
  const embed = new RichEmbed().setDescription(question);
  for (const i in choices) {
    embed.addField(`**${ +i + 1 }:** `, choiceFormatter(choices[i]));
  }
  await channel.send(embed);
  const response = await channel.awaitMessages(
    (message) => (!isNaN(message.content) && parseInt(message.content) < choices.length && message.author == author),
    { maxMatches: 1, time: 5 * 60 * 500, errors: ['time'] },
  );
  const index = parseInt(response.first().content) - 1;
  return choices[index];
};

const pronounRoleName = (pronoun, serverSettings) => {
  const display = pronoun.cases.join('/');
  let qualified = display;
  if (pronoun.iso_639_3 != serverSettings.primaryLanguage) {
    qualified = `${pronoun.iso_639_3}: ${display}`;
  }
  return [display, qualified];
};

const addPronounRole = async (pronoun, { member, channel, guild }, serverSettings) => {
  const [display, qualified] = pronounRoleName(pronoun, serverSettings);

  channel.send(`:space_invader: setting your pronouns to ${display}`);
  const role = guild.roles.find((el) => el.name == qualified);
  if (role) {
    await member.addRole(role);
  } else {
    const newRole = await guild.createRole({ name: qualified });
    await Promise.all([member.addRole(newRole), database.registerRole(newRole)]);
  }
};

const addPronoun = async (args, { author, member, channel, guild }, serverSettings) => {
  try {
    const [argsParsed, language] = filterOptions(args, serverSettings.primaryLanguage);

    const cases = argsParsed.map((x) => x.split('/')).reduce((a, b) => a.concat(b), []);

    const pronouns = await database.getPronouns(cases, language);
    if (pronouns.length == 0) {
      throw {
        message: 'Sorry, we don\'t have those pronouns in our db yet :(',
        userfacing: true,
      };
    } else if (pronouns.length == 1) {
      addPronounRole(pronouns[0], { member, channel, guild }, serverSettings);
    } else {
      const question = 'Unfortunately that\'s not enough to know what pronoun you want\nHere\'s the options we have for you:';
      const pronounFormatter = (pronoun) => `${pronoun.cases.join('/')} *(${ pronoun.language })*`;
      const choice = await chooser({ author, channel }, question, pronouns, pronounFormatter);
      addPronounRole(choice, { member, channel, guild }, serverSettings);
    }

  } catch (e) {
    if (e.userfacing) {
      showError(e.message, channel);
    } else {
      throw e;
    }
  }
};

const countRole =
  (role) => role.guild.members
    .filter((member) => member.roles.find((memberRole) => memberRole.id == role.id) != null)
    .size;

const deletePronounRole = async (pronoun, { channel, member }, serverSettings) => {
  const [display, qualified] = pronounRoleName(pronoun, serverSettings);
  const role = member.roles.find((el) => el.name == qualified);
  if (role != undefined) {
    channel.send(`removing role ${display}`);
    const numberUsers = countRole(role);
    const [isRegistered] = await Promise.all([await database.isRegistered(role), member.removeRole(role)]);
    if (isRegistered && numberUsers == 1) {
      await Promise.all([database.unregisterRole(role), role.delete('No user has this pronoun role. It will be recreated when needed')]);
      channel.send('deleting role');
    }
  } else {
    throw {
      message: 'Sorry, you don\'t have that pronoun role :(',
      userfacing: true,
    };
  }
};

const deletePronoun = async (args, { author, member, channel }, serverSettings) => {
  try {
    const [argsParsed, language] = filterOptions(args, serverSettings.primaryLanguage);

    const cases = argsParsed.map((x) => x.split('/')).reduce((a, b) => a.concat(b), []);

    let pronouns = await database.getPronouns(cases, language);
    if (pronouns.length == 0) {
      throw {
        message: 'Sorry, we don\'t have those pronouns in our db yet, if you have it as a role a server mod must have given it to you :(',
        userfacing: true,
      };
    } else if (pronouns.length == 1) {
      await deletePronounRole(pronouns[0], { channel, member }, serverSettings);
    } else {
      pronouns = pronouns.filter((pronoun) => {
        const qualified = pronounRoleName(pronoun, serverSettings)[1];
        return member.roles.find((el) => el.name == qualified);
      });
      if (pronouns.length == 0) {
        throw {
          message: 'Sorry, you don\'t have that pronoun role :(',
          userfacing: true,
        };
      } else if (pronouns.length == 1) {
        await deletePronounRole(pronouns[0], { channel, member }, serverSettings);
      } else {
        const pronounFormatter = (pronoun) => `${pronoun.cases.join('/')} *(${ pronoun.language })*`;
        const message = 'Unfortunately that\'s not enough to know what pronoun you want removed\nHere\'s the options we have for you:';
        const choice = await chooser({ author, channel }, message, pronouns, pronounFormatter);
        await deletePronounRole(choice, { channel, member }, serverSettings);
      }
    }

  } catch (e) {
    if (e.userfacing) {
      showError(e.message, channel);
    } else {
      throw e;
    }
  }
};

const pronounWorker = async ({ action, args, message, serverSettings }) => {
  if (action == 'add') {
    await addPronoun(args, message, serverSettings);
  } else if (action == 'delete') {
    await deletePronoun(args, message, serverSettings);
  }
};

const pronounAction = (action, args, message, serverSettings) => {
  if (!serverQueues[message.guild.id]) {
    serverQueues[message.guild.id] = queue(pronounWorker);
  }
  serverQueues[message.guild.id].push({ action, args, message, serverSettings });
};

discordClient.on('message', async (message) => {
  const guildId = parseInt(message.guild.id).toString(16);
  try {
    let serverSettings = await database.getServerSettings(guildId);
    if (serverSettings == null) {
      database.initServerSettings(guildId, defaultPrefix, defaultLanguage);
      serverSettings = {
        prefix: defaultPrefix,
        primaryLanguage: defaultLanguage,
        abuseProtect: true,
      };
    }
    // split by space keeping quote-wrapped strings
    let parse = message.content.match(/(?:[^\s"]+|"[^"]*")+/g);
    if (parse) {
      parse = parse.map((x) => x.replace(/"/g, ''));
      if (parse[0] == `${serverSettings.prefix}${commandWord}`) {
        if (parse[1] == 'add') {
          if (parse.length < 3) {
            await showError(getUsage('add', commandWord, serverSettings), message.channel);
          } else {
            await pronounAction('add', parse.slice(2), message, serverSettings);
          }
        } else if (parse[1] == 'delete') {
          if (parse.length < 3) {
            await showError(getUsage('delete', commandWord, serverSettings), message.channel);
          } else {
            await pronounAction('delete', parse.slice(2), message, serverSettings);
          }
        } else if (parse[1] == 'list') {
          listPronouns(parse, message, serverSettings);
        } else if (parse[1] == 'help') {
          const embed = getHelpText(commandWord, serverSettings, message.member.hasPermission(Permissions.FLAGS.MANAGE_GUILD));
          await message.channel.send(embed);
        } else if (parse[1] == 'config') {
          if (message.member.hasPermission(Permissions.FLAGS.MANAGE_GUILD)) {
            if (parse[2] == 'prefix') {
              if (parse.length < 4) {
                showError(getUsage('prefix', commandWord, serverSettings), message.channel);
              } else {
                await database.updatePrefix(guildId, parse[3]);
                message.channel.send(`changed prefix to ${parse[3]}`);
              }
            } else if (parse[2] == 'language') {
              const languages = await database.getLanguage(parse[3]);
              if (languages.length == 0) {
                showError('I\'m sorry, I don\'t know that language (unfortunately autonyms aren\'t supported yet, so please use the English name for now) :(', message.channel);
              } else if (languages.length == 1) {
                message.channel.send(`Setting your language to ${languages[0].name} [${languages[0].iso_639_3}]`);
                await database.updatePrimaryLanguage(languages[0].iso_639_3);
              } else {
                const question = 'We have several languages that match that name.\nWhich one do you want?';
                const choice = await chooser(message, question, languages, (language) => `${language.name} [${language.iso_639_3}]`);
                await database.updatePrimaryLanguage(choice.iso_639_3);
              }
            }
          } else {
            showError('I\'m sorry, you don\'t have permission to do this :(', message.channel);
          }
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
});

discordClient.on('ready', () => {
  discordClient.user.setPresence({ game: { name: 'Gender: Hard Mode' } });
});

discordClient.login(process.env.DISCORDSECRET);
