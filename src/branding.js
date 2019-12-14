const { RichEmbed } = require('discord.js');

const colourRBGString = '#EB8EBB';
const colourRBG = [0xE8, 0x8E, 0xBB];

const embed = () => new RichEmbed()
    .setColor(colourRBG);

const showError = async (errorMessage, channel, user) => {
  await channel.send(`:space_invader: ${errorMessage} <@${user.id}>`);
};

module.exports = { embed, showError };
