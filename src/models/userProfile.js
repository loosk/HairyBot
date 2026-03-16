const { Schema, model } = require('mongoose');
const { baseGardenSlots, startingBloomBuck } = require('../constants/config');

const userProfileSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    coins: { type: Number, default: startingCoins },
    maxSlots: { type: Number, default: baseGardenSlots },
    
    // how many seeds they own: { "Wheat": 5, "Tomato": 2 }
    seeds: { type: Map, of: Number, default: {} }, 
    
    // what is currently planted: [{ plantName: "Wheat", readyAt: 167888888 }]
    activeGarden: [{ 
        plantName: String, 
        readyAt: Number 
    }],
    
    // harvested items waiting to be sold: [{ name: "Wheat", mutation: "Golden", value: 75, amount: 1 }]
    inventory: [{
        name: String,
        mutation: String,
        value: Number,
        amount: Number
    }]
});

module.exports = model('UserProfile', userProfileSchema);