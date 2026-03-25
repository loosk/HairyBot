const { Schema, model } = require('mongoose')
const {
	baseGardenSlots,
	startingBloomBuck,
	baseActiveEggSlots,
	baseActivePetSlots,
	upgradeCost,
} = require('../constants/config')

const userProfileSchema = new Schema({
	userId: { type: String, required: true, unique: true },
	bloomBuck: { type: Number, default: startingBloomBuck },

	upgrades: {
    	type: Map,
    	of: Number,
    	default: {}
  	},

	maxSlots: { type: Number, default: baseGardenSlots },
	maxPets: { type: Number, default: baseActivePetSlots },
	maxActiveEggs: { type:Number, default: baseActivePetSlots },

	// { "Wheat": 123, "Tomato": 123 }
	seeds: { type: Map, of: Number, default: {} },

	eggs: [
		{
            name: String,
        }
    ],

	activeEggs: [
		{
			name: String,
    		hatchReadyAt: Number
		}
	],

	// { plantName: "Wheat", readyAt: 123 }
	activeGarden: [
		{
			plantName: String,
			mutation: [String],
			variant: String,
			weight: Number,
			readyAt: Number,
			isFavorited: { type: Boolean, default: false },
		},
	],

	// { name: "Wheat", mutation: "Golden", value: 123, amount: 123 }
	inventory: [
		{
			name: String,
			mutation: [String],
			variant: String,
			value: Number,
			weight: Number,
			isFavorited: { type: Boolean, default: false },
		},
	],

	pets: [
  		{	
			name: String,
    		nickname: String,
    		isActive: { type: Boolean, default: false },
    		age: { type: Number, default: 0 },
   			exp: { type: Number, default: 0 },
    		hunger: { type: Number, min: 0, max: 100, default: 100 },
  		},
	],

	maxActivePets: { type: Number, default: 1 },

	completedAchievements: {
		type: [String],
		default: [],
	},

	tracking: {
		plantPlants: {
			type: Map,
			of: Number,
			default: () => new Map([['total', 0]]),
		},
		harvestPlants: {
			type: Map,
			of: Number,
			default: () => new Map([['total', 0]]),
		},
		sellCrops: {
			type: Map,
			of: Number,
			default: () => new Map([['total', 0]]),
		},
		buySeeds: {
			type: Map,
			of: Number,
			default: () => new Map([['total', 0]]),
		},
	},
})

module.exports = model('UserProfile', userProfileSchema)
