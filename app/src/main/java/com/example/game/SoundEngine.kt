package com.example.game

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.pow
import kotlin.math.sin
import kotlin.random.Random

/**
 * Real-time procedural PCM audio engine using a single streaming AudioTrack.
 * Mirrors all MetroDash Web Audio synthesis: coin chimes, jump/roll/lane SFX,
 * powerup arpeggios, sustained jetpack turbine, police trill whistle, pup bark,
 * train horn, crash sting, bird chirps, and energetic 16-step groove loop.
 */
class SoundEngine {

    private val sampleRate = 22050
    private val twoPi = 2.0 * PI

    @Volatile
    private var muted = false

    @Volatile
    private var running = false

    @Volatile
    private var musicActive = false

    @Volatile
    private var birdsEnabled = false

    @Volatile
    private var jetpackLoopActive = false

    private var audioThread: Thread? = null

    private enum class Wave { SINE, TRIANGLE, SAWTOOTH, NOISE }

    private class SynthVoice(
        val wave: Wave,
        val startFreq: Double,
        val endFreq: Double,
        val durationSamples: Int,
        val delaySamples: Int,
        val attackSamples: Int,
        val peakGain: Double,
        val trillHz: Double = 0.0,
        val trillDepthHz: Double = 0.0,
    ) {
        var age = -delaySamples
        var phase = 0.0
        var modPhase = 0.0

        fun sample(sampleRate: Int, rng: Random): Double {
            if (age < 0) {
                age++
                return 0.0
            }
            if (age >= durationSamples) return 0.0

            val t = age.toDouble() / durationSamples.toDouble()
            var freq = startFreq + (endFreq - startFreq) * t
            if (trillHz > 0.0) {
                modPhase += 2.0 * PI * trillHz / sampleRate
                freq += sin(modPhase) * trillDepthHz
            }

            phase += 2.0 * PI * freq / sampleRate
            if (phase > 2.0 * PI) phase -= 2.0 * PI

            val raw = when (wave) {
                Wave.SINE -> sin(phase)
                Wave.TRIANGLE -> {
                    val p = phase / (2.0 * PI)
                    4.0 * kotlin.math.abs(p - 0.5) - 1.0
                }
                Wave.SAWTOOTH -> {
                    val p = phase / (2.0 * PI)
                    2.0 * p - 1.0
                }
                Wave.NOISE -> (rng.nextDouble() * 2.0 - 1.0) * exp(-t * 4.5)
            }

            val env = if (age < attackSamples && attackSamples > 0) {
                age.toDouble() / attackSamples.toDouble()
            } else {
                val rem = 1.0 - ((age - attackSamples).toDouble() / (durationSamples - attackSamples).coerceAtLeast(1))
                rem.coerceIn(0.0, 1.0).pow(1.4)
            }

            age++
            return raw * peakGain * env
        }

        fun isDone(): Boolean = age >= durationSamples
    }

    private val pendingVoices = ConcurrentLinkedQueue<SynthVoice>()

    private val bassPattern = doubleArrayOf(
        65.41, 0.0, 65.41, 77.78, 87.31, 0.0, 98.0, 77.78,
        65.41, 0.0, 65.41, 116.54, 98.0, 87.31, 77.78, 73.42,
    )
    private val leadPattern = doubleArrayOf(
        523.25, 0.0, 659.25, 0.0, 783.99, 659.25, 587.33, 0.0,
        523.25, 0.0, 659.25, 783.99, 1046.5, 0.0, 783.99, 0.0,
    )

    fun startEngine() {
        if (running) return
        running = true
        audioThread = Thread({
            runAudioLoop()
        }, "MetroDash-Audio").apply {
            priority = Thread.MAX_PRIORITY
            start()
        }
    }

    fun shutdown() {
        running = false
        musicActive = false
        jetpackLoopActive = false
        try {
            audioThread?.join(300)
        } catch (_: InterruptedException) {
        }
        audioThread = null
    }

    fun setMuted(mute: Boolean) {
        muted = mute
        if (mute) {
            jetpackLoopActive = false
        }
    }

    fun isMuted(): Boolean = muted

    private fun enqueue(
        wave: Wave,
        startFreq: Double,
        endFreq: Double,
        durationSec: Double,
        delaySec: Double = 0.0,
        attackSec: Double = 0.008,
        gain: Double = 0.18,
        trillHz: Double = 0.0,
        trillDepthHz: Double = 0.0,
    ) {
        if (muted || !running) return
        pendingVoices.add(
            SynthVoice(
                wave = wave,
                startFreq = startFreq,
                endFreq = endFreq,
                durationSamples = (durationSec * sampleRate).toInt().coerceAtLeast(1),
                delaySamples = (delaySec * sampleRate).toInt().coerceAtLeast(0),
                attackSamples = (attackSec * sampleRate).toInt().coerceAtLeast(1),
                peakGain = gain,
                trillHz = trillHz,
                trillDepthHz = trillDepthHz,
            )
        )
    }

    fun playCoin(streak: Int = 0) {
        val semitoneBoost = streak.coerceAtMost(10) * 0.45
        val pitchFactor = 2.0.pow(semitoneBoost / 12.0)
        val f1 = 987.77 * pitchFactor
        val f2 = 1318.51 * pitchFactor
        enqueue(Wave.SINE, f1, f1, 0.052, 0.0, 0.005, 0.20)
        enqueue(Wave.SINE, f2, f2, 0.18, 0.052, 0.005, 0.22)
        enqueue(Wave.TRIANGLE, f2 * 2.0, f2 * 2.0, 0.16, 0.052, 0.006, 0.07)
    }

    fun playJump() {
        enqueue(Wave.SINE, 210.0, 620.0, 0.15, 0.0, 0.008, 0.20)
    }

    fun playRoll() {
        enqueue(Wave.TRIANGLE, 420.0, 125.0, 0.14, 0.0, 0.006, 0.18)
    }

    fun playLaneSwitch() {
        enqueue(Wave.SINE, 340.0, 510.0, 0.075, 0.0, 0.005, 0.11)
    }

    fun playPowerup(kind: PowerupType) {
        if (kind == PowerupType.JETPACK) {
            playJetpackStart()
            return
        }
        val notes = if (kind == PowerupType.MAGNET) {
            doubleArrayOf(523.25, 659.25, 783.99, 1046.5)
        } else {
            doubleArrayOf(587.33, 739.99, 880.0, 1174.66)
        }
        notes.forEachIndexed { idx, freq ->
            enqueue(Wave.TRIANGLE, freq, freq, 0.22, idx * 0.055, 0.008, 0.18)
        }
    }

    fun playJetpackStart() {
        enqueue(Wave.SAWTOOTH, 110.0, 520.0, 0.36, 0.0, 0.015, 0.16)
        val notes = doubleArrayOf(523.25, 659.25, 783.99, 1046.5)
        notes.forEachIndexed { i, freq ->
            enqueue(Wave.SINE, freq, freq, 0.24, i * 0.06, 0.008, 0.15)
        }
        jetpackLoopActive = !muted
    }

    fun startJetpackLoop() {
        if (!muted) jetpackLoopActive = true
    }

    fun stopJetpackLoop() {
        jetpackLoopActive = false
    }

    fun playJetpackEnd() {
        stopJetpackLoop()
        enqueue(Wave.SINE, 420.0, 140.0, 0.35, 0.0, 0.01, 0.18)
    }

    fun playPoliceWhistle() {
        enqueue(
            wave = Wave.SINE,
            startFreq = 2650.0,
            endFreq = 2580.0,
            durationSec = 0.36,
            delaySec = 0.0,
            attackSec = 0.015,
            gain = 0.15,
            trillHz = 26.0,
            trillDepthHz = 210.0,
        )
    }

    fun playDogBark() {
        enqueue(Wave.SAWTOOTH, 380.0, 210.0, 0.10, 0.0, 0.01, 0.16)
        enqueue(Wave.SAWTOOTH, 390.0, 205.0, 0.10, 0.14, 0.01, 0.16)
    }

    fun playTrainHorn() {
        enqueue(Wave.SAWTOOTH, 220.0, 218.0, 0.42, 0.0, 0.05, 0.09)
        enqueue(Wave.SAWTOOTH, 277.18, 275.0, 0.42, 0.0, 0.05, 0.08)
    }

    fun playStumble() {
        enqueue(Wave.SAWTOOTH, 160.0, 55.0, 0.19, 0.0, 0.008, 0.20)
        enqueue(Wave.SINE, 2650.0, 2580.0, 0.34, 0.09, 0.015, 0.13, 26.0, 200.0)
        enqueue(Wave.SAWTOOTH, 380.0, 210.0, 0.10, 0.22, 0.01, 0.14)
    }

    fun playBusted() {
        stopJetpackLoop()
        stopMusic()
        enqueue(Wave.TRIANGLE, 140.0, 36.0, 0.34, 0.0, 0.005, 0.36)
        enqueue(Wave.NOISE, 100.0, 100.0, 0.24, 0.0, 0.002, 0.25)
        enqueue(Wave.SINE, 2650.0, 2580.0, 0.32, 0.11, 0.015, 0.14, 26.0, 200.0)
        enqueue(Wave.SAWTOOTH, 380.0, 210.0, 0.10, 0.28, 0.01, 0.14)

        val descend = doubleArrayOf(392.0, 349.23, 311.13, 261.63)
        descend.forEachIndexed { idx, freq ->
            enqueue(Wave.SAWTOOTH, freq, freq, 0.16, 0.38 + idx * 0.13, 0.008, 0.12)
        }
    }

    fun playBirdChirp() {
        enqueue(Wave.SINE, 2200.0, 3100.0, 0.06, 0.0, 0.008, 0.035)
        enqueue(Wave.SINE, 2500.0, 3400.0, 0.06, 0.12, 0.008, 0.035)
    }

    fun startMusic(withBirds: Boolean) {
        birdsEnabled = withBirds
        musicActive = true
    }

    fun stopMusic() {
        musicActive = false
        stopJetpackLoop()
    }

    private fun runAudioLoop() {
        val minBufBytes = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
        ).coerceAtLeast(2048)

        val chunkSamples = 512
        val pcm = ShortArray(chunkSamples)

        val track = try {
            AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_GAME)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setTransferMode(AudioTrack.MODE_STREAM)
                .setBufferSizeInBytes(minBufBytes)
                .build()
        } catch (_: Throwable) {
            return
        }

        try {
            track.play()
        } catch (_: Throwable) {
            track.release()
            return
        }

        val activeVoices = ArrayList<SynthVoice>(32)
        val rng = Random(42)
        val stepIntervalSamples = (0.115 * sampleRate).toInt()
        val birdIntervalSamples = (4.2 * sampleRate).toInt()
        var musicStep = 0
        var musicSampleCounter = 0
        var birdSampleCounter = 0
        var jetPhase = 0.0
        var jetLp = 0.0

        while (running) {
            while (true) {
                val v = pendingVoices.poll() ?: break
                if (activeVoices.size < 40) activeVoices.add(v)
            }

            for (i in 0 until chunkSamples) {
                if (musicActive && !muted) {
                    if (musicSampleCounter == 0) {
                        val step = musicStep % 16
                        if (step % 4 == 0) {
                            activeVoices.add(
                                SynthVoice(
                                    Wave.SINE, 125.0, 42.0,
                                    (0.10 * sampleRate).toInt(), 0, 60, 0.16
                                )
                            )
                        }
                        val bass = bassPattern[step]
                        if (bass > 0.0) {
                            activeVoices.add(
                                SynthVoice(
                                    Wave.SAWTOOTH, bass * 2.0, bass * 2.0,
                                    (0.11 * sampleRate).toInt(), 0, 80, 0.055
                                )
                            )
                        }
                        val lead = leadPattern[step]
                        if (lead > 0.0) {
                            activeVoices.add(
                                SynthVoice(
                                    Wave.TRIANGLE, lead, lead,
                                    (0.12 * sampleRate).toInt(), 0, 80, 0.04
                                )
                            )
                        }
                        musicStep++
                    }
                    musicSampleCounter++
                    if (musicSampleCounter >= stepIntervalSamples) {
                        musicSampleCounter = 0
                    }

                    if (birdsEnabled) {
                        birdSampleCounter++
                        if (birdSampleCounter >= birdIntervalSamples) {
                            birdSampleCounter = 0
                            if (rng.nextFloat() < 0.45f) {
                                playBirdChirp()
                            }
                        }
                    }
                } else {
                    musicSampleCounter = 0
                    birdSampleCounter = 0
                }

                var mix = 0.0
                if (!muted) {
                    var idx = activeVoices.size - 1
                    while (idx >= 0) {
                        val voice = activeVoices[idx]
                        mix += voice.sample(sampleRate, rng)
                        if (voice.isDone()) {
                            activeVoices.removeAt(idx)
                        }
                        idx--
                    }

                    if (jetpackLoopActive) {
                        jetPhase += twoPi * 115.0 / sampleRate
                        if (jetPhase > twoPi) jetPhase -= twoPi
                        val saw = 2.0 * (jetPhase / twoPi) - 1.0
                        val noise = rng.nextDouble() * 2.0 - 1.0
                        jetLp = jetLp * 0.88 + (saw * 0.45 + noise * 0.55) * 0.12
                        mix += jetLp * 0.45
                    }
                } else {
                    activeVoices.clear()
                }

                val clamped = (mix * 0.65).coerceIn(-0.98, 0.98)
                pcm[i] = (clamped * 32767.0).toInt().toShort()
            }

            try {
                track.write(pcm, 0, chunkSamples)
            } catch (_: Throwable) {
                break
            }
        }

        try {
            track.stop()
        } catch (_: Throwable) {
        }
        track.release()
    }
}
