GameGlobal.GameReg('audio', function (GM) {
  let ctx = null
  let unlocked = false
  let musicT = 0
  let step = 0
  let lastMusic = false
  let filter = null
  let master = null
  let noiseBuf = null

  const BPM = 124
  const EIGHTH = 60 / BPM / 2

  const MELODY = [
    523.25, 0, 659.25, 0, 783.99, 0, 659.25, 523.25,
    587.33, 659.25, 523.25, 0, 392.00, 0, 523.25, 0,
    440.00, 0, 523.25, 587.33, 659.25, 0, 587.33, 440.00,
    523.25, 392.00, 329.63, 392.00, 523.25, 0, 523.25, 659.25
  ]

  const BASS = [
    130.81, 0, 0, 130.81, 196.00, 0, 130.81, 0,
    98.00, 0, 0, 98.00, 146.83, 0, 98.00, 0,
    110.00, 0, 0, 110.00, 164.81, 0, 110.00, 0,
    130.81, 0, 98.00, 0, 130.81, 0, 196.00, 0
  ]

  function ac() {
    if (ctx) return ctx
    try {
      if (typeof wx !== 'undefined' && wx.createWebAudioContext) {
        ctx = wx.createWebAudioContext()
      } else if (typeof AudioContext !== 'undefined') {
        ctx = new AudioContext()
      } else if (typeof webkitAudioContext !== 'undefined') {
        ctx = new webkitAudioContext()
      }
    } catch (e) {
      ctx = null
    }
    return ctx
  }

  function soundOn() {
    return !GM.storage || GM.storage.data.sound !== false
  }

  function musicOn() {
    return !GM.storage || GM.storage.data.music !== false
  }

  function musicOut() {
    const audio = ac()
    if (!audio) return null
    if (!master) {
      master = audio.createGain()
      master.gain.value = 0.0001
      let dest = master
      try {
        const comp = audio.createDynamicsCompressor()
        comp.threshold.value = -18
        comp.knee.value = 10
        comp.ratio.value = 2.4
        comp.attack.value = 0.01
        comp.release.value = 0.18
        master.connect(comp)
        dest = comp
      } catch (e) {}
      dest.connect(audio.destination)
      filter = audio.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 5600
      filter.Q.value = 0.4
      filter.connect(master)
    }
    return filter
  }

  function fadeMusic(on) {
    const audio = ac()
    if (!audio || !master) return
    const t = audio.currentTime
    try {
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t)
      master.gain.linearRampToValueAtTime(on ? 0.85 : 0.0001, t + 0.2)
    } catch (e) {}
  }

  function beep(freq, dur, type, vol) {
    if (!soundOn()) return
    const audio = ac()
    if (!audio) return
    try {
      if (audio.resume) audio.resume()
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = type || 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(vol || 0.07, audio.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0008, audio.currentTime + dur)
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start()
      osc.stop(audio.currentTime + dur)
    } catch (e) {}
  }

  function envGain(vol, dur, atk) {
    const audio = ac()
    const g = audio.createGain()
    const t = audio.currentTime
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + (atk || 0.01))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    return g
  }

  function oscTo(freq, dur, vol, type, dest, slide) {
    const audio = ac()
    const out = dest || musicOut()
    if (!audio || !unlocked || !out || !freq) return
    try {
      const t = audio.currentTime
      const osc = audio.createOscillator()
      const g = envGain(vol, dur, 0.012)
      osc.type = type || 'sine'
      osc.frequency.setValueAtTime(freq, t)
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur)
      osc.connect(g)
      g.connect(out)
      osc.start(t)
      osc.stop(t + dur + 0.02)
    } catch (e) {}
  }

  function noiseSrc() {
    const audio = ac()
    if (!audio) return null
    if (!noiseBuf) {
      const n = Math.floor(audio.sampleRate * 0.25)
      noiseBuf = audio.createBuffer(1, n, audio.sampleRate)
      const d = noiseBuf.getChannelData(0)
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    }
    const src = audio.createBufferSource()
    src.buffer = noiseBuf
    return src
  }

  function noiseHit(dur, vol, hp) {
    const audio = ac()
    const out = musicOut()
    if (!audio || !unlocked || !out) return
    try {
      const src = noiseSrc()
      if (!src) return
      const g = envGain(vol, dur, 0.004)
      const t = audio.currentTime
      if (hp) {
        const f = audio.createBiquadFilter()
        f.type = 'highpass'
        f.frequency.value = hp
        src.connect(f)
        f.connect(g)
      } else src.connect(g)
      g.connect(out)
      src.start(t)
      src.stop(t + dur + 0.02)
    } catch (e) {
      oscTo(1800, dur, vol * 0.5, 'triangle', out)
    }
  }

  function kick() {
    oscTo(150, 0.14, 0.32, 'sine', null, 48)
  }

  function snare() {
    noiseHit(0.09, 0.2, 1200)
    oscTo(210, 0.08, 0.1, 'triangle')
  }

  function hat(vol) {
    noiseHit(0.035, vol, 5000)
  }

  function bass(freq) {
    oscTo(freq, 0.2, 0.22, 'sine')
    oscTo(freq * 2, 0.12, 0.05, 'triangle')
  }

  function lead(freq) {
    oscTo(freq, 0.18, 0.2, 'triangle')
    oscTo(freq * 2.01, 0.12, 0.06, 'sine')
  }

  function tick(n) {
    const i = n % 32
    const beat = i % 8
    if (beat === 0 || beat === 4) kick()
    if (beat === 2 || beat === 6) snare()
    hat(beat % 2 === 0 ? 0.08 : 0.04)
    if (BASS[i]) bass(BASS[i])
    if (MELODY[i]) lead(MELODY[i])
  }

  return {
    resume: function () {
      unlocked = true
      const a = ac()
      if (a && a.resume) a.resume()
      musicOut()
      if (musicOn()) fadeMusic(true)
    },
    suspend: function () {
      fadeMusic(false)
      const a = ac()
      if (a && a.suspend) a.suspend()
    },
    update: function (dt) {
      const want = musicOn() && unlocked
      if (want !== lastMusic) {
        lastMusic = want
        if (want) {
          musicOut()
          fadeMusic(true)
          step = 0
          musicT = 0
          tick(0)
        } else fadeMusic(false)
      }
      if (!want) return
      musicT += dt
      while (musicT >= EIGHTH) {
        musicT -= EIGHTH
        step += 1
        tick(step)
      }
    },
    click: function () { beep(520, 0.08, 'triangle', 0.08) },
    drop: function () { beep(180, 0.12, 'sine', 0.08) },
    merge: function (type) { beep(320 + type * 28, 0.16, 'triangle', 0.11) },
    combo: function () { beep(640, 0.1, 'square', 0.06); setTimeout(function () { beep(820, 0.12, 'square', 0.06) }, 70) },
    over: function () { beep(160, 0.35, 'sawtooth', 0.08) },
    win: function () { beep(440, 0.12, 'triangle', 0.1); setTimeout(function () { beep(660, 0.18, 'triangle', 0.1) }, 90) }
  }
})
