// common, uncommon, rare, epic, legendary, mythical

module.exports = {
	"Dog": {
		description: 'A common domesticated animal',
		rarity: 'common',

		abilities: [
			{
				type: 'growth_speed',
				value: 0.9, // only need 90% of the total time to grow
			},
		],
	},
}
