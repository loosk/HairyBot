const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { getInGameTime } = require('../../utils/getInGameTime')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('environment')
		.setDescription('View the current in-game environment.'),

	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setTitle(`Game Environment`)
			.setColor('#F1C40F')
			.setDescription(
				`The in-game environment affects plant growth and mutation chances. Check back regularly to see how the environment changes!`,
			)

		const { formatted, isDay } = getInGameTime()

		embed.addFields(
			{ name: 'Current Time', value: formatted, inline: false },
			{
				name: 'Environment',
				value: isDay ? 'Day 🌞' : 'Night 🌜',
				inline: false,
			},
		)

		await interaction.reply({ embeds: [embed] })
	},
}
