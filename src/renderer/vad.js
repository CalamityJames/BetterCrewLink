function clamp(value, min, max) {
    return min < max ? (value < min ? min : value > max ? max : value) : value < max ? max : value > min ? min : value;
}
// https://github.com/Jam3/audio-frequency-to-index
function frequencyToIndex(frequency, sampleRate, frequencyBinCount) {
    const nyquist = sampleRate / 2;
    const index = Math.round((frequency / nyquist) * frequencyBinCount);
    return clamp(index, 0, frequencyBinCount);
}
// https://github.com/Jam3/analyser-frequency-average
function analyserFrequency(analyser, frequencies, minHz, maxHz) {
    const sampleRate = analyser.context.sampleRate;
    const binCount = analyser.frequencyBinCount;
    let start = frequencyToIndex(minHz, sampleRate, binCount);
    const end = frequencyToIndex(maxHz, sampleRate, binCount);
    const count = end - start;
    let sum = 0;
    for (; start < end; start++) {
        sum += frequencies[start] / 255;
    }
    return count === 0 ? 0 : sum / count;
}
export default function (audioContext, source, destination, opts) {
    opts = opts || {};
    const defaults = {
        fftSize: 1024,
        bufferLen: 1024,
        smoothingTimeConstant: 0.2,
        minCaptureFreq: 85,
        maxCaptureFreq: 255,
        noiseCaptureDuration: 1000,
        minNoiseLevel: 0.15,
        maxNoiseLevel: 0.7,
        avgNoiseMultiplier: 1.2,
        onVoiceStart: function () {
            /* DO NOTHING */
        },
        onVoiceStop: function () {
            /* DO NOTHING */
        },
        onUpdate: function () {
            /* DO NOTHING */
        },
        stereo: true,
    };
    const options = Object.assign({}, defaults, opts);
    let baseLevel = 0;
    let voiceScale = 1;
    let activityCounter = 0;
    const activityCounterMin = 0;
    const activityCounterMax = 30;
    const activityCounterThresh = 5;
    let envFreqRange = [];
    let isNoiseCapturing = true;
    let prevVadState = undefined;
    let vadState = false;
    let captureTimeout = null;
    // var source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.smoothingTimeConstant = options.smoothingTimeConstant;
    analyser.fftSize = options.fftSize;
    const channels = options.stereo ? 2 : 1;
    const scriptProcessorNode = audioContext.createScriptProcessor(options.bufferLen, channels, channels);
    connect();
    scriptProcessorNode.onaudioprocess = monitor;
    if (isNoiseCapturing) {
        //console.log('VAD: start noise capturing');
        captureTimeout = setTimeout(init, options.noiseCaptureDuration);
    }
    function init() {
        //console.log('VAD: stop noise capturing');
        isNoiseCapturing = false;
        envFreqRange = envFreqRange
            .filter(function (val) {
            return val;
        })
            .sort();
        const averageEnvFreq = envFreqRange.length
            ? envFreqRange.reduce(function (p, c) {
                return Math.min(p, c);
            }, 1)
            : options.minNoiseLevel || 0.1;
        baseLevel = averageEnvFreq * options.avgNoiseMultiplier;
        if (options.minNoiseLevel && baseLevel < options.minNoiseLevel)
            baseLevel = options.minNoiseLevel;
        if (options.maxNoiseLevel && baseLevel > options.maxNoiseLevel)
            baseLevel = options.maxNoiseLevel;
        voiceScale = 1 - baseLevel;
        //	console.log('VAD: base level:', options.minNoiseLevel);
    }
    function connect() {
        source.connect(analyser);
        analyser.connect(scriptProcessorNode);
        if (destination)
            scriptProcessorNode.connect(destination);
        else
            scriptProcessorNode.connect(audioContext.destination);
    }
    function disconnect() {
        scriptProcessorNode.disconnect();
        analyser.disconnect();
        source.disconnect();
        if (destination) {
            destination.disconnect();
            source.connect(destination);
        }
    }
    function destroy() {
        captureTimeout && clearTimeout(captureTimeout);
        disconnect();
        scriptProcessorNode.onaudioprocess = null;
    }
    function monitor(event) {
        if (destination) {
            for (let channel = 0; channel < event.outputBuffer.numberOfChannels; channel++) {
                const inputData = event.inputBuffer.getChannelData(channel);
                const outputData = event.outputBuffer.getChannelData(channel);
                for (let sample = 0; sample < event.inputBuffer.length; sample++) {
                    // make output equal to the same as the input
                    outputData[sample] = inputData[sample];
                }
            }
        }
        const frequencies = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencies);
        const average = analyserFrequency(analyser, frequencies, options.minCaptureFreq, options.maxCaptureFreq);
        if (isNoiseCapturing) {
            envFreqRange.push(average);
            return;
        }
        if (average >= baseLevel && activityCounter < activityCounterMax) {
            activityCounter++;
        }
        else if (average < baseLevel && activityCounter > activityCounterMin) {
            activityCounter--;
        }
        vadState = activityCounter > activityCounterThresh;
        if (prevVadState !== vadState) {
            vadState ? onVoiceStart() : onVoiceStop();
            prevVadState = vadState;
        }
        options.onUpdate(Math.max(0, average - baseLevel) / voiceScale);
    }
    function onVoiceStart() {
        options.onVoiceStart();
    }
    function onVoiceStop() {
        options.onVoiceStop();
    }
    return { destination: analyser, connect, destroy, options, init };
}
//# sourceMappingURL=vad.js.map