const { Client, RichEmbed, Permissions } = require('discord.js');
const { queue } = require('async');
const { Database } = require('./db.js');
const { filterOptions, chooser } = require('./util.js');

module.exports = (database) => {
  const serverQueues = {};

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

  return module.exports = { pronounAction };
}
