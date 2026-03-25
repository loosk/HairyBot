const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	StringSelectMenuBuilder,
} = require('discord.js');

const UserProfile = require('../../models/userProfile');
const eggsData = require('../../data/eggsData');
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');

function chooseWeightedPet(pool) {
	let totalWeight = 0;
	for (const pet of pool) totalWeight += pet.weight;

	let randomNumber = Math.random() * totalWeight;

	for (const pet of pool) {
		randomNumber -= pet.weight;
		if (randomNumber <= 0) {
			return pet.name;
		}
	}
	return pool[0].name;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('incubate')
		.setDescription('Manage your egg incubator and hatch new pets!'),

	async execute(interaction) {
		
		try {
			let profile = await UserProfile.findOne({ userId: interaction.user.id });
			if (!profile) {
				return await interaction.reply({ content: "You don't have a profile yet!", ephemeral: true });
			}

			if (!profile.activeEggs) profile.activeEggs = [];
			if (!profile.eggs) profile.eggs = [];
			if (!profile.pets) profile.pets = [];

            const maxSlots = profile.maxActiveEggs || 3; 

			const generateIncubatorUI = (userData) => {
				const activeCount = userData.activeEggs.length;
				const availableSlots = maxSlots - activeCount;

				const embed = new EmbedBuilder()
					.setTitle(`${interaction.user.username}'s Incubator`)
					.setColor('#F1C40F')
					.setDescription(`**Slots Used:** ${activeCount} / ${maxSlots}\n\n`);

				let readyToHatchCount = 0;

				if (activeCount === 0) {
					embed.addFields({ name: 'Empty', value: '*Your incubator is empty. Select an egg below to start!*' });
				} else {
					let listString = '';
					userData.activeEggs.forEach((egg, index) => {
                        const eggName = egg.name || egg.eggName; 
						if (Date.now() >= egg.hatchReadyAt) {
							listString += `${index + 1}. **${eggName}** - Ready to hatch!\n`;
							readyToHatchCount++;
						} else {
							const timestamp = Math.floor(egg.hatchReadyAt / 1000);
							listString += `${index + 1}. **${eggName}** - Hatching: <t:${timestamp}:R>\n`;
						}
					});
					embed.addFields({ name: 'Currently Incubating', value: listString });
				}

				const components = [];

				const actionRow = new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId('hatch_ready_eggs')
						.setLabel(`Hatch Ready Eggs (${readyToHatchCount})`)
						.setStyle(ButtonStyle.Success)
						.setDisabled(readyToHatchCount === 0)
				);
				components.push(actionRow);

				const eggInventoryCounts = {};
				userData.eggs.forEach(egg => {
                    const eggName = egg.name || egg.eggName;
					eggInventoryCounts[eggName] = (eggInventoryCounts[eggName] || 0) + 1;
				});

				const selectMenu = new StringSelectMenuBuilder()
					.setCustomId('incubate_select')
					.setPlaceholder(availableSlots > 0 ? 'Select an egg to incubate...' : 'Incubator is full!');

				if (availableSlots <= 0 || Object.keys(eggInventoryCounts).length === 0) {
					selectMenu.setDisabled(true);
					selectMenu.addOptions({ label: 'None', value: 'none' }); 
				} else {
					for (const [eggName, count] of Object.entries(eggInventoryCounts)) {
						selectMenu.addOptions({
							label: `${eggName}`,
							description: `You have ${count} in your inventory.`,
							value: eggName,
						});
					}
				}

				components.push(new ActionRowBuilder().addComponents(selectMenu));

				return { embeds: [embed], components: components };
			};

			const response = await interaction.reply({ ...generateIncubatorUI(profile), fetchReply: true });

			const collector = response.createMessageComponentCollector({
				time: 120000,
			});

			collector.on('collect', async i => {
				if (i.user.id !== interaction.user.id) {
					return i.reply({ content: "This is not your incubator!", ephemeral: true });
				}

				profile = await UserProfile.findOne({ userId: interaction.user.id });

				if (i.isStringSelectMenu() && i.customId === 'incubate_select') {
					const selectedEgg = i.values[0];
					const availableSlots = maxSlots - profile.activeEggs.length;
					
					const ownedAmount = profile.eggs.filter(e => (e.name || e.eggName) === selectedEgg).length;
					
					const maxIncubatable = Math.min(availableSlots, ownedAmount);

					if (maxIncubatable <= 0) {
						return i.reply({ content: "You don't have enough slots or eggs!", ephemeral: true });
					}

					const modal = new ModalBuilder()
						.setCustomId(`modal_incubate_${selectedEgg}`)
						.setTitle(`Incubate ${selectedEgg}s`);

					const amountInput = new TextInputBuilder()
						.setCustomId('amount_input')
						.setLabel(`How many? (Max: ${maxIncubatable})`)
						.setStyle(TextInputStyle.Short)
						.setRequired(true)
						.setPlaceholder('Enter a number...');

					modal.addComponents(new ActionRowBuilder().addComponents(amountInput));

					await i.showModal(modal);

					try {
						const modalSubmit = await i.awaitModalSubmit({ 
							filter: mi => mi.customId === `modal_incubate_${selectedEgg}` && mi.user.id === interaction.user.id, 
							time: 60000 
						});

						const amount = parseInt(modalSubmit.fields.getTextInputValue('amount_input'), 10);

						if (isNaN(amount) || amount <= 0 || amount > maxIncubatable) {
							return modalSubmit.reply({ content: 'Invalid amount entered.', ephemeral: true });
						}

						let removed = 0;
						profile.eggs = profile.eggs.filter(e => {
							if (removed < amount && (e.name || e.eggName) === selectedEgg) {
								removed++;
								return false;
							}
							return true;
						});

						// 2. Add them to the active incubator
						const eggInfo = eggsData[selectedEgg];
						const readyAt = Date.now() + eggInfo.hatchTime;

						for (let j = 0; j < amount; j++) {
							profile.activeEggs.push({
								name: selectedEgg,
								hatchReadyAt: readyAt
							});
						}

						await profile.save();

						await modalSubmit.update(generateIncubatorUI(profile));
						await modalSubmit.followUp({ content: `Successfully started incubating **${amount}x ${selectedEgg}**!`, ephemeral: true });

					} catch (error) {}
				}


				if (i.isButton() && i.customId === 'hatch_ready_eggs') {
					
					const readyEggs = [];
					const stillIncubating = [];

					profile.activeEggs.forEach(egg => {
						if (Date.now() >= egg.hatchReadyAt) {
							readyEggs.push(egg);
						} else {
							stillIncubating.push(egg);
						}
					});

					if (readyEggs.length === 0) {
						return i.reply({ content: "None of your eggs are ready yet!", ephemeral: true });
					}

					const hatchedResults = {};

					readyEggs.forEach(egg => {
						const eggName = egg.name || egg.eggName;
						const eggInfo = eggsData[eggName];

						const newPetName = chooseWeightedPet(eggInfo.possiblePets);

						hatchedResults[newPetName] = (hatchedResults[newPetName] || 0) + 1;

						profile.pets.push({
							name: newPetName,
							nickname: newPetName,
							isActive: false,
							age: 0,
							exp: 0,
							hunger: 100
						});
					});

					profile.activeEggs = stillIncubating;

					await profile.save();

					const summaryStrings = Object.entries(hatchedResults).map(([petName, count]) => `**${count}x ${petName}**`);
					const summaryMessage = `Your eggs hatched! You got: ${summaryStrings.join(', ')}!`;

					await i.update(generateIncubatorUI(profile));
					await i.followUp({ content: summaryMessage, ephemeral: false });
				}
			});

			collector.on('end', async () => {
				try {
					const finalProfile = await UserProfile.findOne({ userId: interaction.user.id });
					const disabledUi = generateIncubatorUI(finalProfile);
					disabledUi.components.forEach(row => row.components.forEach(comp => comp.setDisabled(true)));
					await interaction.editReply({ components: disabledUi.components });
				} catch (err) {}
			});

		} catch (err) {
			console.error('Error in /incubate command:', err);
			if (interaction.deferred || interaction.replied) {
				return interaction.editReply('Something went wrong with the incubator.');
			} else {
				return interaction.reply({ content: 'Something went wrong with the incubator.', ephemeral: true });
			}
		}
	},
};