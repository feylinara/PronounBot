const { Client, RichEmbed, Permissions } = require('discord.js');
const { Database } = require('./db.js');

const database = new Database();
const discordClient = new Client();

const defaultPrefix = '^';
const defaultLanguage = 'eng';

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
}

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
    const newRole = await guild.createRole();
    newRole.setName(qualified);
    await member.addRole(newRole);
  }
};

const addPronouns = async (args, { author, member, channel, guild }, serverSettings) => {
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

const deletePronoun = async (pronoun, { channel, member }, serverSettings) => {
  const [display, qualified] = pronounRoleName(pronoun, serverSettings);
  channel.send(`removing role ${display}`);
  const role = member.roles.find((el) => el.name == qualified);
  if (role) {
    await member.removeRole(role);
  } else {
    throw {
      message: 'Sorry, you don\'t have that pronoun role :(',
      userfacing: true,
    };
  }
};

const deletePronouns = async (args, { author, member, channel }, serverSettings) => {
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
      await deletePronoun(pronouns[0], { channel, member }, serverSettings);
    } else {
      pronouns = pronouns.filter((pronoun) => {
        const [_, qualified] = pronounRoleName(pronoun, serverSettings);
        return member.roles.find((el) => el.name == qualified);
      });
      if (pronouns.length == 0) {
        throw {
          message: 'Sorry, you don\'t have that pronoun role :(',
          userfacing: true,
        };
      } else if (pronouns.length == 1) {
        await deletePronoun(pronouns[0], { channel, member }, serverSettings);
      } else {
        const pronounFormatter = (pronoun) => `${pronoun.cases.join('/')} *(${ pronoun.language })*`;
        const message = 'Unfortunately that\'s not enough to know what pronoun you want removed\nHere\'s the options we have for you:';
        const choice = await chooser({ author, channel }, message, pronouns, pronounFormatter);
        await deletePronoun(choice, { channel, member }, serverSettings);
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

const examples = [
  { pronoun: 'she/her', language: 'English', iso: 'eng' },
  { pronoun: 'nin/nim', language: 'Deutsch', iso: 'deu' },
  { pronoun: 'vij', language: 'nld', iso: 'nld' },
  { pronoun: 'elle', language: 'Spanish', iso: 'spa' },
];

const getExample = (serverSettings) => {
  const { pronoun, language, iso } = examples[Math.floor(Math.random() * examples.length)];
  if (iso == serverSettings.language) {
    return `\`${serverSettings.prefix}pronouns add ${pronoun}\``;
  }
  return `\`${serverSettings.prefix}pronouns add ${pronoun} language:${language}\``;
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

    let parse = message.content.match(/(?:[^\s"]+|"[^"]*")+/g); // split by space keeping quote-wrapped strings
    if (parse) {
      parse = parse.map((x) => x.replace(/"/g, ''));
      if (parse[0] == `${serverSettings.prefix}pronouns`) {
        if (parse[1] == 'add') {
          if (parse.length < 3) {
            await showError(`Use as \`${serverSettings.prefix}pronouns add <pronoun> [language:<language>]\`, for example ${getExample(serverSettings)}`, message.channel);
          } else {
            await addPronouns(parse.slice(2), message, serverSettings);
          }
        } else if (parse[1] == 'delete') {
          if (parse.length < 3) {
            await showError(`Use as \`${serverSettings.prefix}pronouns delete <pronoun> [language:<language>]\`, for example ${getExample(serverSettings)}`, message.channel);
          } else {
            await deletePronouns(parse.slice(2), message, serverSettings);
          }
        } else if (parse[1] == 'help') {
          let helpText =
            '***Help for PronounBot***\n' +
            '\n' +
            '**Add:** Add a pronoun role to your roles\n' +
            `Use as \`${serverSettings.prefix}pronouns add <pronoun> [language:<language>]\`, for example ${getExample(serverSettings)}\n\n` +
            '**Delete:** Delete a pronoun role from your roles\n' +
            `Use as \`${serverSettings.prefix}pronouns delete <pronoun> [language:<language>]\`, for example ${getExample(serverSettings)}\n\n` +
            '**Help:** Show this help screen';
          if (message.member.hasPermission(Permissions.FLAGS.MANAGE_GUILD)) {
            helpText += `\n\n***Config Option:***\n\n` +
                        `**Prefix:** set a server prefix\n` +
                        `Use as \`${serverSettings.prefix}pronouns prefix <prefix>\`, for example \`${serverSettings.prefix}pronouns prefix !\`\n\n` +
                        `**Language:** set the server's primary language\n` +
                        `Use as \`${serverSettings.prefix}pronouns language <language>\`, for example \`${serverSettings.prefix}pronouns language German \`\n\n`;
          }
          const embed = new RichEmbed().setAuthor('PronounBot').setDescription(helpText);
          await message.channel.send(embed);
        } else if (parse[1] == 'config') {
          if (message.member.hasPermission(Permissions.FLAGS.MANAGE_GUILD)) {
            if (parse[2] == 'prefix') {
              await database.updatePrefix(guildId, parse[3]);
              message.channel.send(`changed prefix to ${parse[3]}`);
            } else if (parse[2] == 'language') {
              const languages = await database.getLanguage(parse[3]);
              if (languages.length == 0) {
                showError('I\'m sorry, I don\'t know that language (unfortunately autonyms aren\'t supported yet, so please use the English name for now) :(', message.channel);
              } else if (languages.length == 1) {
                message.channel.send(`Setting your language to ${languages[0].name} [${languages[0].iso_639_3}]`);
                await database.updatePrimaryLanguage(languages[0].iso_639_3);
              } else {
                const question = "We have several languages that match that name.\nWhich one do you want?";
                let choice = await chooser(message, question, languages, (language) => `${language.name} [${language.iso_639_3}]`);
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
