const { EmbedBuilder } = require('discord.js')
const UserProfile = require('../models/userProfile')

const processNewlyUnlockedAchievements = async (
	interaction,
	newlyUnlockedAchievements,
) => {
	if (newlyUnlockedAchievements.length === 0) return

	const embeds = []
	let totalBloomBuckReward = 0

	for (const ach of newlyUnlockedAchievements) {
		const embed = new EmbedBuilder()
			.setTitle('Achievement Unlocked! 🎉')
			.setColor('#2ECC71')
			.setDescription(
				`You unlocked the achievement: **${ach.description}**`,
			)
			.setThumbnail(interaction.user.displayAvatarURL())

		const rewards = ach.rewards ?? []

		for (const reward of rewards) {
			if (reward.type === 'bloomBuck') {
				totalBloomBuckReward += reward.amount

				embed.addFields({
					name: 'Reward',
					value: `💵 ${reward.amount} BloomBucks`,
				})
			}
		}

		embeds.push(embed)
	}

	const profile = await UserProfile.findOne({
		userId: interaction.user.id,
	})

	profile.bloomBuck += totalBloomBuckReward

	await profile.save()

	// Send 10 embeds at a time and split messages if there are more than 10 achievements unlocked
	const chunkSize = 10

	for (let i = 0; i < embeds.length; i += chunkSize) {
		const chunk = embeds.slice(i, i + chunkSize)

		await interaction.followUp({ embeds: chunk })
	}
}

module.exports = { processNewlyUnlockedAchievements }
