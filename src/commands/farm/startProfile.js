const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserProfile = require('../../models/userProfile');
const { startingBloomBuck } = require('../../constants/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start your farming journey and get your first seeds!'),

    async execute(interaction) {
        // check if they already have a profile
        let profile = await UserProfile.findOne({ userId: interaction.user.id });
        
        if (profile) {
            return interaction.reply({ 
                content: "You already have a garden! Use `/garden` to view it or `/plant` to plant seeds.", 
                ephemeral: true 
            });
        }

        // create the new profile
        profile = new UserProfile({ 
            userId: interaction.user.id,
            coins: startingBloomBuck
        });;
        
        await profile.save();

        const embed = new EmbedBuilder()
            .setTitle('Welcome to your Garden!')
            .setColor('#2ECC71')
            .setDescription(`You have inherited a small plot of land!\n\nI have given you **🪙 ${startingBloomBuck} Coins** to get you started.`)
            .addFields(
                { name: 'Step 1', value: 'Use `/plant seed:Wheat` to plant your first crop.' },
                { name: 'Step 2', value: 'Use `/garden` to check how much time is left.' },
                { name: 'Step 3', value: 'Use `/harvest` when they are ready!' }
            );

        await interaction.reply({ embeds: [embed] });
    }
};