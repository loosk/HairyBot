const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserProfile = require('../../models/userProfile');
const plantsData = require('../../data/plantsData');
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');
const { calculatePlantValue } = require('../../utils/calculatePlantValue');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('harvestall')
        .setDescription('Harvest all fully grown plants from your garden.'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const profile = await UserProfile.findOne({ userId: interaction.user.id });

            if (!profile) {
                return sendNoProfileMessage(interaction);
            }

            if (profile.activeGarden.length === 0) {
                return interaction.editReply({ content: "You have nothing planted in your garden!" });
            }

            const now = Date.now();
            let harvestedCount = 0;
            let harvestResults = [];
            const newGarden = [];

            for (const plant of profile.activeGarden) {
                if (now >= plant.readyAt) {
                    harvestedCount++;
                    const baseData = plantsData[plant.plantName];
                    
                    const mutation = plant.mutation || [];
                    const variant = plant.variant || 'Normal';
                    const weight = plant.weight;
                    const baseValue = baseData.baseValue;
                    const baseWeight = baseData.baseWeight;

                    let baseMutatedValue = calculatePlantValue(mutation, weight, baseWeight, baseValue, variant);

                    if (isNaN(baseMutatedValue) || baseMutatedValue === null) {
                        console.error(`calculatePlantValue returned NaN for ${plant.plantName}! Check your math utility.`);
                        baseMutatedValue = baseValue; 
                    }

                    profile.inventory.push({
                        name: plant.plantName,
                        mutation: mutation, 
                        variant: variant,
                        value: Math.round(baseMutatedValue),
                        weight: weight
                    });
                    
                    let prefix = "";
                    if (variant !== 'Normal') prefix += variant + " ";
                    if (mutation.length > 0) prefix += mutation.join(' ') + " ";

                    harvestResults.push(`• ${prefix}**${plant.plantName}** (${weight}kg)`);

                } else {
                    newGarden.push(plant);
                }
            }

            if (harvestedCount === 0) {
                return interaction.editReply({ content: "None of your plants are ready to harvest yet! Check back later." });
            }

            profile.activeGarden = newGarden;
            profile.markModified('inventory'); 
            await profile.save();

            const embed = new EmbedBuilder()
                .setTitle('Harvest Complete!')
                .setColor('#43B581')
                .setDescription(`You harvested ${harvestedCount} plants:\n\n` + harvestResults.join('\n'))
                .setFooter({ text: 'Use /inventory to see your crops!' });

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("Error in /harvestall:", err);
            await interaction.editReply({ content: "Something went wrong while trying to harvest your plants." });
        }
    }
};