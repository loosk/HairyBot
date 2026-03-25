const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	StringSelectMenuBuilder,
} = require('discord.js');

const UserProfile = require('../../models/userProfile');
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('View your harvested plants, eggs, and pets.')
		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('The user you want to view')
				.setRequired(false),
		),

	async execute(interaction) {
		await interaction.deferReply();

		try {
			const targetUser = interaction.options.getUser('user') || interaction.user;
			const profile = await UserProfile.findOne({ userId: targetUser.id });

			if (!profile) return sendNoProfileMessage(interaction);

			let currentView = 'plants';
			let currentPage = 0;
			const itemsPerPage = 10;

			const generateInventoryUI = (view, page) => {
				let dataArray = [];
				if (view === 'plants') dataArray = profile.inventory || [];
				if (view === 'eggs') dataArray = profile.eggs || [];
				if (view === 'pets') dataArray = profile.pets || [];

				const totalPages = Math.ceil(dataArray.length / itemsPerPage) || 1;
				const start = page * itemsPerPage;
				const currentItems = dataArray.slice(start, start + itemsPerPage);

				const embed = new EmbedBuilder()
					.setColor('#3498DB')
					.setFooter({ text: `Page ${page + 1} of ${totalPages}` });

				if (view === 'plants') {
					embed.setTitle(`${targetUser.username}'s Harvested Crops`);
					
					const totalValue = Math.round(dataArray.reduce((total, item) => total + (item.value || 0), 0));
					embed.setDescription(`**Total Value:** 💵 ${totalValue} BloomBucks\n\n`);

					if (currentItems.length === 0) embed.addFields({ name: 'Empty', value: 'You have no harvested crops.' });

					currentItems.forEach((item, index) => {
						let prefix = '';
						if (item.variant && item.variant !== 'Normal') prefix += `${item.variant} `;
						if (item.mutation && item.mutation.length > 0) prefix += `${item.mutation.join(' ')} `;
						
						embed.addFields({
							name: `${start + index + 1}. **${prefix}${item.name || item.plantName}** (${item.weight}kg)`,
							value: `**Sell Value:** 💵 ${Math.round(item.value || 0)}`,
							inline: false,
						});
					});

				} else if (view === 'eggs') {
					embed.setTitle(`${targetUser.username}'s Egg Incubator`);
					embed.setDescription('Eggs you have purchased and are waiting to hatch.\n\n');

					if (currentItems.length === 0) embed.addFields({ name: 'Empty', value: 'You have no eggs.' });

					currentItems.forEach((item, index) => {
						const status = item.hatchReadyAt === 0 ? 'Ready to hatch!' : 'Incubating...';
						embed.addFields({
							name: `${start + index + 1}. **${item.eggName || item.name}**`,
							value: `Status: ${status}`,
							inline: false,
						});
					});

				} else if (view === 'pets') {
					embed.setTitle(`${targetUser.username}'s Pets`);
					embed.setDescription('Your faithful farm companions.\n\n');

					if (currentItems.length === 0) embed.addFields({ name: 'Empty', value: 'You have no pets.' });

					currentItems.forEach((item, index) => {
						const equippedText = item.isActive ? '**[EQUIPPED]**' : '';
						const nicknameText = item.nickname ? `"${item.nickname}" ` : '';
						embed.addFields({
							name: `${start + index + 1}. ${nicknameText}(${item.petName || item.petId}) ${equippedText}`,
							value: `Age: ${item.age || 1} | Hunger: ${item.hunger || 100}/100`,
							inline: false,
						});
					});
				}

				const components = [];

				const selectMenu = new StringSelectMenuBuilder()
					.setCustomId('inventory_view_select')
					.setPlaceholder('Change Inventory Category')
					.addOptions(
						{ label: 'Harvested Crops', description: 'View crops ready to sell.', value: 'plants'},
						{ label: 'Pet Eggs', description: 'View unhatched eggs.', value: 'eggs'},
						{ label: 'Pets', description: 'View your companions.', value: 'pets'}
					);
				components.push(new ActionRowBuilder().addComponents(selectMenu));

				if (totalPages > 1) {
					const navRow = new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('prev').setEmoji({ id: '1485229572189589555', name: 'rightWhiteArrow' }).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
						new ButtonBuilder().setCustomId('next').setEmoji({ id: '1485228358575853689', name: 'whiteArrow' }).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
					);
					components.push(navRow);
				}

				return { embeds: [embed], components: components };
			};

			const response = await interaction.editReply(generateInventoryUI(currentView, currentPage));

			const collector = response.createMessageComponentCollector({
				time: 120000,
			});

			collector.on('collect', async i => {
				if (i.user.id !== interaction.user.id) {
					return i.reply({ content: "You cannot click buttons on this menu!", ephemeral: true });
				}

				if (i.isStringSelectMenu()) {
					currentView = i.values[0];
					currentPage = 0;
					await i.update(generateInventoryUI(currentView, currentPage));
					return;
				}

				if (i.customId === 'prev') currentPage--;
				if (i.customId === 'next') currentPage++;
				
				await i.update(generateInventoryUI(currentView, currentPage));
			});

			collector.on('end', async () => {
				try {
					const disabledUi = generateInventoryUI(currentView, currentPage);
					disabledUi.components.forEach(row => row.components.forEach(comp => comp.setDisabled(true)));
					await interaction.editReply({ components: disabledUi.components });
				} catch (err) {}
			});

		} catch (err) {
			console.error('Error in /inventory command:', err);
			return interaction.editReply('Something went wrong while trying to open your inventory.');
		}
	},
};