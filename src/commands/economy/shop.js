const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserProfile = require("../../models/userProfile");
const plantsData = require("../../data/plantsData");
const { UPGRADE_COST } = require("../../constants/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Buy seeds or upgrade your garden.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("buy")
                .setDescription("Buy seeds from the shop.")
                .addStringOption(option => {
                    option.setName("seed")
                        .setDescription("The type of seed you want to buy")
                        .setRequired(true);
                    
                    for (const plantName in plantsData) {
                        option.addChoices({ name: plantName, value: plantName });
                    }
                    return option;
                })
                .addIntegerOption(option =>
                    option.setName("amount")
                        .setDescription("How many seeds to buy (defaults to 1)")
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("upgrade")
                .setDescription("Upgrade your garden to add more slots.")
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const profile = await UserProfile.findOne({ userId: interaction.user.id });
            if (!profile) {
                return interaction.editReply("You need to `/start` your journey first!");
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === "buy") {
                const seedName = interaction.options.getString("seed");
                const amount = interaction.options.getInteger("amount") || 1;
                const plantInfo = plantsData[seedName];

                const totalCost = plantInfo.seedCost * amount;

                if (profile.bloomBuck < totalCost) {
                    return interaction.editReply(`You don't have enough BloomBucks! You need 🪙 **${totalCost}** but you only have 🪙 **${profile.bloomBuck}**.`);
                }

                // Deduct coins and add seeds
                profile.bloomBuck -= totalCost;
                const currentSeeds = profile.seeds.get(seedName) || 0;
                profile.seeds.set(seedName, currentSeeds + amount);
                await profile.save();

                return interaction.editReply(`You successfully bought **${amount}x ${seedName} Seed(s)** for 🪙 **${totalCost}**! You now have 🪙 **${profile.bloomBuck}**.`);
            }

            if (subcommand === "upgrade") {
                if (profile.bloomBuck < UPGRADE_COST) {
                    return interaction.editReply(`You can't afford an upgrade! You need 🪙 **${UPGRADE_COST}** but you only have 🪙 **${profile.bloomBuck}**.`);
                }

                profile.bloomBuck -= UPGRADE_COST;
                profile.maxSlots += 1;
                await profile.save();

                return interaction.editReply(`🏡 Upgrade successful! Your garden now has **${profile.maxSlots}** slots. You have 🪙 **${profile.bloomBuck}** remaining.`);
            }

        } catch (err) {
            console.error("Error in /shop command:", err);
            return interaction.editReply("Something went wrong while trying to use the shop. Please try again later.");
        }
    },
};