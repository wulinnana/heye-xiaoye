GameGlobal.GameReg('storage', function (GM) {
  const KEY = 'night_snack_merge_v3'

  function readRaw() {
    try {
      if (typeof wx !== 'undefined' && wx.getStorageSync) return wx.getStorageSync(KEY) || {}
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : {}
    } catch (e) {
      return {}
    }
  }

  function writeRaw(data) {
    try {
      if (typeof wx !== 'undefined' && wx.setStorageSync) wx.setStorageSync(KEY, data)
      else localStorage.setItem(KEY, JSON.stringify(data))
    } catch (e) {}
  }

  function today() {
    const d = new Date()
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
  }

  function defaults() {
    return {
      coins: 0,
      adsWatched: 0,
      shares: 0,
      sound: true,
      music: true,
      vibrate: true,
      stars: {},
      album: { bj: [0] },
      skipCity: {},
      skipLevel: {},
      games: 0,
      daily: { date: today(), shareLucky: false }
    }
  }

  const data = Object.assign(defaults(), readRaw())
  data.stars = data.stars || {}
  data.album = data.album || { bj: [0] }
  data.skipCity = data.skipCity || {}
  data.skipLevel = data.skipLevel || {}
  if (data.music !== false) data.music = true
  if (data.vibrate !== false) data.vibrate = true
  if (data.sound !== false) data.sound = true
  if (!data.daily || data.daily.date !== today()) {
    data.daily = { date: today(), shareLucky: false }
  }

  function save() { writeRaw(data) }

  function starsOf(key) { return data.stars[key] || 0 }

  function cityCleared(city) {
    for (let i = 0; i < city.levels.length; i++) {
      if (starsOf(city.id + '-' + i) < 1) return false
    }
    return true
  }

  function regionUnlocked(tier) {
    if (tier <= 0) return true
    const cities = GM.config.cities
    for (let i = 0; i < cities.length; i++) {
      if (cities[i].tier !== tier - 1) continue
      if (data.skipCity[cities[i].id]) return true
      const town = cities[i].towns && cities[i].towns[0]
      if (town && starsOf(town.id + '-0') >= 1) return true
      if (starsOf(cities[i].id + '-0') >= 1) return true
    }
    return false
  }

  function cityUnlocked(city) {
    if (data.skipCity[city.id]) return true
    return regionUnlocked(city.tier)
  }

  function litFoods(cityId) {
    return (data.album[cityId] || []).length
  }

  function signatureLit(city) {
    const arr = data.album[city.id] || []
    return arr.indexOf(city.foods.length - 1) >= 0
  }

  function levelUnlocked(stall, li) {
    const prov = GM.config.cityById(stall.provinceId || stall.id)
    if (!cityUnlocked(prov)) return false
    if (li === 0) return true
    const key = stall.id + '-' + li
    if (data.skipLevel[key]) return true
    return starsOf(stall.id + '-' + (li - 1)) >= 1
  }

  function townCleared(province) {
    let n = 0
    const towns = province.towns || []
    for (let t = 0; t < towns.length; t++) {
      const lv = province.levels || []
      for (let i = 0; i < lv.length; i++) {
        if (starsOf(towns[t].id + '-' + i) >= 1) n += 1
      }
    }
    return n
  }

  return {
    data: data,
    save: save,
    starsOf: starsOf,
    cityCleared: cityCleared,
    cityUnlocked: cityUnlocked,
    regionUnlocked: regionUnlocked,
    litFoods: litFoods,
    signatureLit: signatureLit,
    townStars: townCleared,
    townCleared: townCleared,
    levelUnlocked: levelUnlocked,
    setStars: function (key, n) {
      if (n > (data.stars[key] || 0)) {
        data.stars[key] = n
        save()
        return true
      }
      return false
    },
    addCoins: function (n) {
      data.coins = Math.max(0, (data.coins || 0) + n)
      save()
      return data.coins
    },
    spend: function (n) {
      if (data.coins < n) return false
      data.coins -= n
      save()
      return true
    },
    unlockFood: function (cityId, type) {
      const arr = data.album[cityId] || (data.album[cityId] = [])
      if (arr.indexOf(type) >= 0) return false
      arr.push(type)
      arr.sort(function (a, b) { return a - b })
      save()
      return true
    },
    albumCount: function () {
      let n = 0
      const cities = GM.config.cities
      for (let i = 0; i < cities.length; i++) {
        n += (data.album[cities[i].id] || []).length
      }
      return n
    },
    albumTotal: function () {
      let n = 0
      const cities = GM.config.cities
      for (let i = 0; i < cities.length; i++) n += cities[i].foods.length
      return n
    },
    skipCity: function (id) {
      data.skipCity[id] = true
      save()
    },
    skipLevel: function (key) {
      data.skipLevel[key] = true
      save()
    },
    markShareLucky: function () {
      data.daily.shareLucky = true
      data.shares += 1
      save()
    },
    markAd: function () {
      data.adsWatched += 1
      save()
    },
    playGame: function () {
      data.games += 1
      save()
    },
    setFlag: function (key, value) {
      data[key] = !!value
      save()
      return data[key]
    },
    totalCleared: function () {
      let n = 0
      const s = data.stars
      for (const k in s) if (s[k] >= 1) n += 1
      return n
    },
    totalStars: function () {
      let n = 0
      const s = data.stars
      for (const k in s) if (s[k] >= 1) n += 1
      return n
    }
  }
})
