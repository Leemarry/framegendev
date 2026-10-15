export function audioPeaks(
	channels: Float32Array[],
	sampleRate: number,
	start: number,
	duration: number,
	bins = 160,
) {
	const first = Math.max(0, Math.floor(start * sampleRate));
	const count = Math.max(1, Math.floor(duration * sampleRate));
	return Array.from({ length: bins }, (_, bin) => {
		let peak = 0;
		const low = first + Math.floor((bin * count) / bins);
		const high = first + Math.floor(((bin + 1) * count) / bins);
		for (const channel of channels)
			for (let i = low; i < Math.min(high, channel.length); i++)
				peak = Math.max(peak, Math.abs(channel[i]));
		return Math.min(1, peak);
	});
}
