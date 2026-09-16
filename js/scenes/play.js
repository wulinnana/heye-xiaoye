GameGlobal.GameReg('scenePlay', function (GM) {
  const plat = GM.platform
  const ui = GM.ui
  const cfg = GM.config
  const phy = GM.physics
  let time = 0
  let shake = 0
  let combo = 0
  let comboT = 0
  let holdX = 0
  let holding = false
  let warning = 0
  let paused = false
  let tools = []
  let lastDrop = -1

  function foods() { return GM.run.foods }

  function box() {
    const w = plat.width
    const h = plat.height
    const left = 30
    const right = w - 30
    const top = plat.safeTop + 112
    const floor = h - 158 - plat.safeBottom
    return { left: left, right: right, top: top, floor: floor, boxW: right - left, danger: top + 56 }
  }

  function rollType(boosted) {
    const pool = GM.run.pool
    if (boosted) return Math.min(1, pool - 1)
    const weights = []
    let sum = 0
    for (let i = 0; i < pool; i++) {
      const w = 8 + i * 5
      weights.push(w)
      sum += w
    }
    let r = Math.random() * sum
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]
      if (r <= 0) return i
    }
    return 0
  }

  function newRun(opt) {
    const city = cfg.stallById(opt.cityId || 'bj-0')
    const li = opt.level || 0
    const lv = city.levels[li]
    const b = box()
    GM.storage.playGame()
    GM.run = {
      cityId: city.id,
      provinceId: city.provinceId,
      cityName: city.provinceName + ' · ' + city.name,
      level: li,
      foods: city.foods,
      maxType: city.foods.length - 1,
      goal: lv.goal,
      pool: lv.pool,
      star2: lv.star2,
      star3: lv.star3,
      title: lv.title,
      score: 0,
      coinsEarned: 0,
      highest: 0,
      bodies: [],
      luckyCharges: 0,
      usedRevive: false,
      doubled: false,
      boost: !!opt.boost,
      dropCount: 0,
      over: false,
      won: false
    }
    GM.run.current = rollType(opt.boost)
    GM.run.peek = rollType(false)
    holdX = (b.left + b.right) / 2
    lastDrop = -1
    combo = 0
    warning = 0
    paused = false
    time = 0
    GM.particles.clear()
  }

  function layoutTools() {
    const w = plat.width
    const y = plat.height - 110 - plat.safeBottom
    const gap = 10
    const bw = (w - 32 - gap * 2) / 3
    tools = [
      { id: 'lucky', x: 16, y: y, w: bw, h: 42, label: '幸运掉落' },
      { id: 'clear', x: 16 + bw + gap, y: y, w: bw, h: 42, label: '清除食材' },
      { id: 'share', x: 16 + (bw + gap) * 2, y: y, w: bw, h: 42, label: '分享' }
    ]
  }

  function onEnter(opt) {
    opt = opt || {}
    GM.ads.hideBanner()
    layoutTools()
    if (opt.revive && GM.run && GM.run.over) {
      reviveNow()
      return
    }
    if (opt.keep && GM.run) {
      paused = true
      return
    }
    newRun(opt)
  }

  function onExit() {}

  function reviveNow() {
    const run = GM.run
    const b = box()
    const keep = []
    for (let i = 0; i < run.bodies.length; i++) {
      const body = run.bodies[i]
      if (body.y - body.r > b.danger + 40) {
        body.vy = 0
        keep.push(body)
      }
    }
    run.bodies = keep
    run.over = false
    run.usedRevive = true
    warning = 0
    paused = false
    ui.toast('摊位收拾好了')
    GM.audio.win()
  }

  function flying() {
    const run = GM.run
    if (!run || !run.lastBody) return false
    if (time - lastDrop > 0.9) return false
    return !run.lastBody.live
  }

  function canDrop() {
    return !paused && GM.run && !GM.run.over && !GM.run.won && !ui.state.modal && !flying() && (time - lastDrop > 0.18)
  }

  function drop() {
    const run = GM.run
    if (!canDrop()) return
    const b = box()
    const type = run.current
    const body = phy.makeBody(holdX, b.danger + phy.radius(type, b.boxW, run.maxType) + 4, type, b.boxW, run.maxType)
    body.vy = 40
    body.vx = (Math.random() - 0.5) * 28
    body.pop = 1
    run.bodies.push(body)
    run.lastBody = body
    GM.storage.unlockFood(run.provinceId, type)
    run.current = run.peek
    run.peek = rollType(false)
    lastDrop = time
    run.dropCount += 1
    GM.audio.drop()
    plat.vibrate(false)
  }

  function applyMerge(ev) {
    const run = GM.run
    const list = foods()
    const food = list[ev.type] || list[list.length - 1]
    comboT = 0.9
    combo += 1
    const add = food.score * Math.min(combo, 6)
    run.score += add
    if (ev.type > run.highest) run.highest = ev.type
    if (GM.storage.unlockFood(run.provinceId, ev.type)) ui.toast('新食物：' + food.name)
    GM.particles.burst(ev.x, ev.y, food.colors[0], 14 + ev.type * 2)
    GM.particles.floatText(ev.x, ev.y - 12, food.name + '  +' + add, '#c81e2b')
    GM.audio.merge(ev.type)
    if (combo >= 2) GM.audio.combo()
    shake = Math.min(2.2, Math.max(shake, 0.4 + ev.type * 0.12))
    if (ev.type >= run.goal) win()
  }

  function win() {
    const run = GM.run
    if (run.won || run.over) return
    run.won = true
    run.over = true
    GM.audio.win()
    plat.vibrate(true)
    GM.storage.setStars(run.cityId + '-' + run.level, 1)
    setTimeout(function () {
      GM.go('result', { won: true })
    }, 550)
  }

  function update(dt) {
    time += dt
    if (paused || GM.ads.mock.active || !GM.run || GM.run.over) {
      comboT = Math.max(0, comboT - dt)
      return
    }
    comboT -= dt
    if (comboT <= 0) combo = 0
    if (shake > 0) shake = Math.max(0, shake - dt * 28)

    const b = box()
    const world = {
      bodies: GM.run.bodies,
      left: b.left + 10,
      right: b.right - 10,
      floor: b.floor - 10,
      boxW: b.boxW,
      maxType: GM.run.maxType,
      gravity: cfg.gravity
    }
    const events = phy.step(world, dt)
    for (let i = 0; i < events.length; i++) applyMerge(events[i])
    if (GM.run.won) return

    let danger = false
    for (let i = 0; i < GM.run.bodies.length; i++) {
      const body = GM.run.bodies[i]
      if (!body.live) continue
      if (body.y - body.r < b.danger) {
        body.over += dt
        if (body.over > 0.12) danger = true
        if (body.over > 0.52 && time - lastDrop > 0.45) {
          gameOver()
          return
        }
      } else body.over = 0
    }
    warning += ((danger ? 1 : 0) - warning) * Math.min(1, dt * 6)
  }

  function gameOver() {
    if (GM.run.over) return
    GM.run.over = true
    GM.run.won = false
    GM.audio.over()
    plat.vibrate(true)
    setTimeout(function () {
      GM.go('result', { won: false })
    }, 400)
  }

  function drawChip(ctx, x, y, r, food) {
    ui.drawPlate(ctx, x, y, r, food, false)
  }

  function drawFood(ctx, body) {
    const f = foods()[body.type]
    if (!f) return
    drawChip(ctx, body.x, body.y, body.r * (body.pop || 1), f)
  }

  function draw(ctx) {
    ui.stallBg(ctx, time)
    const w = plat.width
    const th = cfg.theme
    const run = GM.run
    const b = box()
    const ox = (Math.random() - 0.5) * shake
    const oy = (Math.random() - 0.5) * shake
    ctx.save()
    ctx.translate(ox, oy)

    const bw = b.right - b.left
    const bh = b.floor - b.top
    ui.drawEnamelTray(ctx, b.left, b.top, bw, bh)

    ctx.beginPath()
    ctx.moveTo(b.left + 18, b.danger)
    ctx.lineTo(b.right - 18, b.danger)
    ctx.strokeStyle = th.red
    ctx.globalAlpha = 0.7 + warning * 0.3
    ctx.setLineDash([8, 6])
    ctx.lineWidth = 2.4
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
    ctx.fillStyle = th.red
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('不要越过这条线', (b.left + b.right) / 2, b.danger - 10)

    if (run) {
      for (let i = 0; i < run.bodies.length; i++) drawFood(ctx, run.bodies[i])
      if (!run.over) {
        const gr = phy.radius(run.current, b.boxW, run.maxType)
        const gy = b.danger + gr + 3
        ctx.globalAlpha = canDrop() ? 1 : 0.55
        drawChip(ctx, holdX, gy, gr, foods()[run.current])
        ctx.globalAlpha = 1
        ctx.strokeStyle = th.red
        ctx.lineWidth = 2
        ctx.setLineDash([5, 6])
        ctx.beginPath()
        ctx.moveTo(holdX, gy + gr + 2)
        ctx.lineTo(holdX, b.floor - 12)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
    GM.particles.draw(ctx)
    ctx.restore()

    if (run) {
      const goal = foods()[run.goal]
      const peek = foods()[run.peek]
      ui.drawSign(ctx, 12, plat.safeTop + 8, w - 112, 44, run.cityName, '第' + (run.level + 1) + '关 · 目标 ' + goal.name)

      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = th.score
      ctx.font = ui.font(34)
      ctx.fillText(String(run.score), 18, plat.safeTop + 88)
      ctx.fillStyle = th.ink
      ctx.font = ui.font(15)
      ctx.fillText('别越过红线', 18, plat.safeTop + 108)
      if (run.luckyCharges > 0) {
        ctx.fillStyle = th.red
        ctx.fillText('幸运 x' + run.luckyCharges, 118, plat.safeTop + 108)
      }

      const px = w - 54
      ctx.textAlign = 'center'
      ctx.fillStyle = th.ink
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText('下一个', px, plat.safeTop + 18)
      ctx.beginPath()
      ctx.arc(px, plat.safeTop + 48, 28, 0, Math.PI * 2)
      ctx.fillStyle = th.cream
      ctx.fill()
      ctx.strokeStyle = th.green
      ctx.lineWidth = 4
      ctx.stroke()
      drawChip(ctx, px, plat.safeTop + 48, 20, peek)

      ctx.beginPath()
      ctx.arc(px, plat.safeTop + 92, 14, 0, Math.PI * 2)
      ctx.fillStyle = th.cream
      ctx.fill()
      ctx.strokeStyle = th.green
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = th.red
      ctx.font = 'bold 11px sans-serif'
      ctx.textBaseline = 'middle'
      ctx.fillText('暂停', px, plat.safeTop + 92)
      ctx.textBaseline = 'alphabetic'
      tools._pause = { x: px - 20, y: plat.safeTop + 76, w: 40, h: 32 }
    }

    for (let i = 0; i < tools.length; i++) {
      const t = tools[i]
      const extra = (t.id === 'lucky' && run && run.luckyCharges > 0) ? ' ·' + run.luckyCharges : ''
      ui.drawGhostBtn(ctx, { x: t.x, y: t.y, w: t.w, h: t.h, label: t.label + extra, font: 'bold 13px sans-serif' })
    }

    if (paused) {
      ctx.fillStyle = 'rgba(50,28,16,0.45)'
      ctx.fillRect(0, 0, w, plat.height)
      ctx.fillStyle = th.cream
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('暂停', w / 2, plat.height * 0.38)
      ui.drawBtn(ctx, { x: w / 2 - 90, y: plat.height * 0.44, w: 180, h: 48, label: '继续摆摊' })
      ui.drawGhostBtn(ctx, { x: w / 2 - 90, y: plat.height * 0.44 + 58, w: 180, h: 44, label: '设置' })
      ui.drawGhostBtn(ctx, { x: w / 2 - 90, y: plat.height * 0.44 + 112, w: 180, h: 44, label: '回城市' })
      tools._resume = { x: w / 2 - 90, y: plat.height * 0.44, w: 180, h: 48 }
      tools._settings = { x: w / 2 - 90, y: plat.height * 0.44 + 58, w: 180, h: 44 }
      tools._home = { x: w / 2 - 90, y: plat.height * 0.44 + 112, w: 180, h: 44 }
    }
  }

  function applyLucky() {
    const run = GM.run
    if (!run || run.over || run.won) return false
    const cap = Math.max(0, run.pool - 1)
    const b = box()
    if (run.current < cap) {
      run.current += 1
      GM.particles.burst(holdX, b.danger + 8, '#c81e2b', 12)
      ui.toast('手中食材变大了')
      return true
    }
    if (run.peek < cap) {
      run.peek += 1
      GM.particles.burst(plat.width - 54, plat.safeTop + 48, '#c81e2b', 10)
      ui.toast('下一个食材变大了')
      return true
    }
    ui.toast('已经是本关较大食材')
    return false
  }

  function offerLuckyAd() {
    const run = GM.run
    ui.showModal({
      title: '幸运掉落',
      desc: '看广告后，手中食材立刻大一号。仍然要自己合成过关。',
      actions: [
        {
          label: '看广告使用',
          primary: true,
          onClick: function () {
            GM.ads.watchRewarded('lucky', function () {
              if (!applyLucky()) run.luckyCharges += 1
            }, function (msg) { ui.toast(msg || '未获得奖励') })
          }
        },
        { label: '取消', onClick: function () {} }
      ]
    })
  }

  function offerTool(kind) {
    const run = GM.run
    if (kind === 'lucky') {
      if (run.luckyCharges > 0) {
        if (applyLucky()) run.luckyCharges -= 1
        return
      }
      offerLuckyAd()
    } else if (kind === 'clear') {
      ui.showModal({
        title: '消除危机',
        desc: '清掉最靠近红线的 3 个，避免爆摊。',
        actions: [
          {
            label: '看广告消除',
            primary: true,
            onClick: function () { doClear(true) }
          },
          { label: '取消', onClick: function () {} }
        ]
      })
    }
  }

  function doClear(fromAd) {
    const run = GM.run
    const act = function () {
      const live = run.bodies.slice().sort(function (a, b) { return a.y - b.y })
      const n = Math.min(3, live.length)
      for (let i = 0; i < n; i++) {
        const idx = run.bodies.indexOf(live[i])
        if (idx >= 0) {
          GM.particles.burst(live[i].x, live[i].y, '#c81e2b', 10)
          run.bodies.splice(idx, 1)
        }
      }
      warning = 0
      ui.toast('危险区已清理')
    }
    if (!fromAd) { act(); return }
    GM.ads.watchRewarded('clear', act, function (msg) { ui.toast(msg || '未获得奖励') })
  }

  function onTouchStart(x, y) {
    if (GM.run && !GM.run.over && !paused) {
      const b = box()
      if (y < b.floor && y > b.top) {
        holding = true
        holdX = Math.max(b.left + 28, Math.min(b.right - 28, x))
      }
    }
  }

  function onTouchMove(x) {
    if (!holding || paused) return
    const b = box()
    holdX = Math.max(b.left + 28, Math.min(b.right - 28, x))
  }

  function onTouchEnd(x, y) {
    if (paused) {
      if (tools._resume && ui.hit(tools._resume, x, y)) { paused = false; return }
      if (tools._settings && ui.hit(tools._settings, x, y)) {
        GM.audio.click()
        GM.go('settings', { from: 'play' })
        return
      }
      if (tools._home && ui.hit(tools._home, x, y)) {
        GM.go('city', { cityId: GM.run.cityId })
        return
      }
      return
    }
    if (tools._pause && ui.hit(tools._pause, x, y)) {
      paused = true
      GM.audio.click()
      return
    }
    for (let i = 0; i < tools.length; i++) {
      if (ui.hit(tools[i], x, y)) {
        GM.audio.click()
        if (tools[i].id === 'share') {
          const f = foods()[GM.run.highest] || foods()[0]
          GM.share.share({ food: f.name, title: '我在' + GM.run.cityName + '合成出了' + f.name + '，来一起摆摊！' }, function (ok) {
            if (ok && GM.share.grantDailyLucky()) ui.toast('分享成功，幸运掉落 +1')
          })
        } else offerTool(tools[i].id)
        holding = false
        return
      }
    }
    const b = box()
    if (holding && y < b.floor) drop()
    holding = false
  }

  return {
    onEnter: onEnter,
    onExit: onExit,
    update: update,
    draw: draw,
    onTouchStart: onTouchStart,
    onTouchMove: onTouchMove,
    onTouchEnd: onTouchEnd
  }
})
