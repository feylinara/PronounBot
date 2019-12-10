const { RichEmbed } = require('discord.js');

const showError = async (errorMessage, channel) => {
  channel.send(`:space_invader: ${errorMessage}`);
};

const chooser = async ({ author, channel }, question, choices, choiceFormatter) => {
  const embed = new RichEmbed().setDescription(question);
  for (const i in choices) {
    embed.addField(`**${ +i + 1 }:** `, choiceFormatter(choices[i]));
  }
  await channel.send(embed);
  const response = await channel.awaitMessages(
    (message) => (!isNaN(message.content) && parseInt(message.content) < choices.length && message.author.id == author.id),
    { maxMatches: 1, time: 5 * 60 * 500, errors: ['time'] },
  );
  const index = parseInt(response.first().content) - 1;
  return choices[index];
};

const filterOptions = (args, fallback) => {
  let language;
  args = args.filter((el) => {
    if (el.startsWith('language:') || el.startsWith('l:')) {
      if (!language) {
        if (el.startsWith('language:')) {
          language = el.substring('language:'.length);
        } else if (el.startsWith('l:')) {
          language = el.substring('l:'.length);
        }
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

const paginate = async (rows, formatter, title, { channel, author }) => {
  const generateEmbed = (first, length) => {
    const nPages = Math.ceil(rows.length / length);
    const page = first / length + 1;

    let embed = new RichEmbed().setAuthor('Bontje the PronounBot')
                               .setDescription(`${title} ${page}/${nPages}\n\n` +
                                               rows.slice(first, Math.min(rows.length, first + length))
                                                       .map((x) => formatter(x))
                                                       .join('\n'));
    if (rows.length > length) {
      embed = embed.setFooter('Navigate using ⬅️ and ➡️');
    }

    return embed;
  };

  let first = 0;
  const length = 20;

  const message = await channel.send(generateEmbed(first, length));
  if (rows.length > length) {
    await message.react('⬅️');
    await message.react('➡️');
    const filter = (reaction, user) => (reaction.emoji.name === '⬅️' || reaction.emoji.name === '➡️') &&
                                     user.id === author.id;
    const collector = message.createReactionCollector(filter, { time: 5 * 60 * 500 });
    collector.on('collect', async (reaction) => {
      if (reaction.emoji.name === '➡️') {
        first += length;
        if (first > rows.length) {
          first = 0;
        }
      } else if (reaction.emoji.name === '⬅️') {
        first -= length;
        if (first < 0) {
          first = rows.length - rows.length % length;
        }
      }
      await Promise.all([message.edit(generateEmbed(first, length)), reaction.remove(author)]);
    });
  }
};

module.exports = { chooser, filterOptions, showError, paginate };
