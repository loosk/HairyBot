const getInGameTime = () => {
	// Configuration
	const DAY_ZERO_MS = 1774112400000 // Your Epoch anchor
	const TIME_WARP_FACTOR = 60 // 1 hour becomes 1 minute (60x speed)

	// 1. Calculate real-world elapsed time since Day 0
	const nowReal = Date.now()
	const elapsedReal = nowReal - DAY_ZERO_MS

	// 2. Accelerate the elapsed time
	const elapsedHypo = elapsedReal * TIME_WARP_FACTOR

	// 3. Define constants for the hypothetical units (in milliseconds)
	const msPerSecond = 1000
	const msPerMinute = msPerSecond * 60
	const msPerHour = msPerMinute * 60
	const msPerDay = msPerHour * 24

	// 4. Extract units using the modulo (%) operator
	const days = Math.floor(elapsedHypo / msPerDay)
	const hours = Math.floor((elapsedHypo % msPerDay) / msPerHour)
	const minutes = Math.floor((elapsedHypo % msPerHour) / msPerMinute)
	const seconds = Math.floor((elapsedHypo % msPerMinute) / msPerSecond)
	const millis = Math.floor(elapsedHypo % msPerSecond)

	return {
		days,
		hours,
		minutes,
		seconds,
		millis,
		formatted: `Day ${days}, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
		isDay: hours >= 6 && hours < 18,
	}
}

module.exports = { getInGameTime }
