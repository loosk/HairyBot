const { SlashCommandBuilder } = require('discord.js');
const UserProfile = require('../../models/userProfile');
const plantsData = require('../../data/plantsData');
const { showNoProfileMessage } = require('../../constants/extraInformation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plant')
        .setDescription('Plant a seed in your garden.')
        .addStringOption(option => 
            option.setName('seed')
                  .setDescription('Which seed to plant')
                  .setRequired(true)
        ),

    async execute(interaction) {
        const profile = await UserProfile.findOne({ userId: interaction.user.id });

        if (!profile) {
            return interaction.reply({ 
                content: showNoProfileMessage, 
                ephemeral: true 
            });
        }

        const seedName = interaction.options.getString('seed');
        const plantInfo = plantsData[seedName];

        if (!plantInfo) return interaction.reply({ content: "That seed doesn't exist!", ephemeral: true });

        // 1. Check if they have the seed
        const seedCount = profile.seeds.get(seedName) || 0;
        if (seedCount <= 0) return interaction.reply({ content: `You don't have any ${seedName} seeds! Buy them from the \`/shop\`.`, ephemeral: true });

        // 2. Check if garden is full
        if (profile.activeGarden.length >= profile.maxSlots) {
            return interaction.reply({ content: "Your garden is full! Wait for plants to grow or upgrade your capacity.", ephemeral: true });
        }

        // 3. Plant the seed (Calculate when it will be ready)
        const readyTime = Date.now() + plantInfo.growTime;
        
        // Deduct seed and add to garden
        profile.seeds.set(seedName, seedCount - 1);
        profile.activeGarden.push({ plantName: seedName, readyAt: readyTime });
        await profile.save();

        // Use Discord's native countdown timestamp
        const discordTimestamp = Math.floor(readyTime / 1000);
        
        await interaction.reply(`🌱 You planted a **${seedName}**! It will be ready to harvest <t:${discordTimestamp}:R>.`);
    }
};