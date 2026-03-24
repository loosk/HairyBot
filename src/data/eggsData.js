const minute = 60 * 1000;

module.exports = {
    "Common Egg": {
        hatchTime: 10 * minute,
        cost: 2500,

        quantityMin: 1,
        quantityMax: 5,
        stockChance: 1.0,

        possiblePets: [
            { name: 'Dog', weight: 1 },
            { name: 'Cow', weight: 1 },
            { name: 'Cat', weight: 1 },
            { name: 'Chicken', weight: 1 }
        ]
    }
}