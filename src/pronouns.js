const { queue } = require('async');
const { filterOptions, chooser, showError } = require('./util.js');

module.exports = (database) => {
  const serverQueues = {};

  const pronounRoleName = (pronoun, serverSettings) => {
    const display = pronoun.cases
                           .join('/')
                           .replace(/\*/g, '\\*')
                           .replace(/_/g, '\\_')
                           .replace(/~/g, '\\~')
                           .replace(/>/g, '\\>')
                           .replace(/\|/g, '\\|')
                           .replace(/`/g, '\\`');
    let qualified = display;
    if (pronoun.iso_639_3 != serverSettings.primaryLanguage) {
      qualified = `${pronoun.iso_639_3}: ${display}`;
    }
    return [display, qualified];
  };

  const addPronounRole = async (pronoun, { member, channel, guild }, serverSettings) => {
    const [display, qualified] = pronounRoleName(pronoun, serverSettings);
    console.log(display, qualified);

    const guildRoles = await guild.roles.fetch();


    const role = guildRoles.cache.find((el) => el.name == qualified);
    if (role) {
      console.log("role found");
      await member.roles.add(role);
    } else {
      console.log("creating role");
      const newRole = await guild.roles.create({ data: { name: qualified }, reason: `Missing pronoun role for ${display}` });
      console.log("created role");
      await Promise.all([member.roles.add(newRole), database.registerRole(newRole)]);
    }
    await channel.send(`:space_invader: set your pronouns to *${display}*, ${member.nickname || member.user.username}`);
  };

  const addPronoun = async (args, { author, member, channel, guild }, serverSettings) => {
    try {
      const [argsParsed, language] = filterOptions(args, serverSettings.primaryLanguage);

      const cases = argsParsed.map((x) => x.split('/')).reduce((a, b) => a.concat(b), []);

      console.log(cases);

      const pronouns = await database.getPronouns(cases, language);
      if (pronouns.length == 0) {
        console.log(cases);
        throw {
          message: 'Sorry, we don\'t have those pronouns in our db yet :(',
          userfacing: true,
        };
      } else if (pronouns.length == 1) {
        await addPronounRole(pronouns[0], { member, channel, guild }, serverSettings);
      } else {
        const question = 'Unfortunately that\'s not enough to know what pronoun you want\nHere\'s the options we have for you:';
        const pronounFormatter = (pronoun) => `${pronoun.cases.join('/')} *(${ pronoun.language })*`;
        const choice = await chooser({ author, channel }, question, pronouns, pronounFormatter);
        await addPronounRole(choice, { member, channel, guild }, serverSettings);
      }

    } catch (e) {
      if (e.userfacing) {
        await showError(e.message, channel, member.user);
      } else {
        throw e;
      }
    }
  };

  //const countRole =
    //async (role) => {
      //members = await role.guild.members.fetch();
      //return members.filter((member) => member.roles.cache.find((memberRole) => memberRole.id == role.id) != null).size;
    //}

  const deletePronounRole = async (pronoun, { channel, member }, serverSettings) => {
    const [display, qualified] = pronounRoleName(pronoun, serverSettings);
    const role = member.roles.cache.find((el) => el.name == qualified);
    console.log(role)
    if (role != undefined) {
      //const numberUsers = await countRole(role);
      const [isRegistered] = await Promise.all([await database.isRegistered(role), member.roles.remove(role)]);
      await channel.send(`:space_invader: removed *${display}* from your pronouns, ${member.nickname || member.user.username}`);
      // performs very badly, deactivated for now
      //if (isRegistered && numberUsers == 1) {
        //await Promise.all([database.unregisterRole(role), role.delete('No user has this pronoun role. It will be recreated when needed')]);
      //}
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
          return member.roles.cache.find((el) => el.name == qualified);
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
        await showError(e.message, channel, author);
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
};
