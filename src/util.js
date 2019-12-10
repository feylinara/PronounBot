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

module.exports = { chooser, filterOptions };
