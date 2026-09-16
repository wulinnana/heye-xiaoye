GameGlobal.GameReg('sceneResult', function (GM) {
  const plat = GM.platform
  const ui = GM.ui
  const cfg = GM.config
  let btns = []
  let time = 0
  let won = false

  function layout() {
    const w = plat.width
    const y = Math.max(plat.height * 0.52, plat.safeTop + 348)
    btns = []
    const run = GM.run || {}
    if (!won && run && !run.usedRevive) {
      btns.push({ id: 'revive', x: w / 2 - 130, y: y, w: 260, h: 48, label: '看广告复活', primary: true })
    }
    const base = y + btns.length * 56
    if (won) {
      btns.push({ id: 'next', x: w / 2 - 130, y: base, w: 260, h: 48, label: '下一关', primary: true })
      btns.push({ id: 'retry', x: w / 2 - 130, y: base + 56, w: 124, h: 44, label: '再打一次' })
      btns.push({ id: 'share', x: w / 2 + 6, y: base + 56, w: 124, h: 44, label: '发给好友' })
    } else {
      btns.push({ id: 'retry', x: w / 2 - 130, y: base, w: 124, h: 44, label: '重试', primary: !btns.length })
      btns.push({ id: 'share', x: w / 2 + 6, y: base, w: 124, h: 44, label: '发给好友' })
    }
    btns.push({ id: 'city', x: w / 2 - 130, y: (btns[btns.length - 1].y + 56), w: 260, h: 42, label: '回城市' })
  }

  function onEnter(opt) {
    opt = opt || {}
    won = !!opt.won
    time = 0
    layout()
    GM.ads.showBanner()
  }

  function onExit() { GM.ads.hideBanner() }
  function update(dt) { time += dt }

  function draw(ctx) {
    ui.stallBg(ctx, time)
    const w = plat.width
    const th = cfg.theme
    const run = GM.run || { score: 0, highest: 0, coinsEarned: 0, foods: cfg.cities[0].foods, cityName: '', stars: 0, goal: 2 }
    const food = run.foods[won ? run.goal : (run.highest || 0)] || run.foods[0]

    ui.drawSign(ctx, w / 2 - 140, plat.safeTop + 10, 280, 54, won ? '本关完成' : '摊位爆了', run.cityName)
    ui.drawPlate(ctx, w / 2, plat.safeTop + 128, 48, food, false)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = th.ink
    ctx.font = ui.font(20)
    ctx.fillText((won ? '合成出 ' : '最高到 ') + food.name, w / 2, plat.safeTop + 198)

    ctx.fillStyle = won ? th.green : th.red
    ctx.font = ui.font(28)
    ctx.fillText(won ? '已完成' : '未完成', w / 2, plat.safeTop + 246)

    ctx.fillStyle = th.score
    ctx.font = ui.font(22)
    ctx.fillText('分数 ' + String(run.score), w / 2, plat.safeTop + 284)
    ctx.restore()

    for (let i = 0; i < btns.length; i++) {
      if (btns[i].primary) ui.drawBtn(ctx, btns[i])
      else ui.drawGhostBtn(ctx, btns[i])
    }
  }

  function nextLevel() {
    const run = GM.run
    const stall = cfg.stallById(run.cityId)
    if (run.level + 1 < stall.levels.length) {
      GM.go('play', { cityId: stall.id, level: run.level + 1 })
    } else {
      const prov = cfg.cityById(stall.provinceId)
      const towns = prov.towns || []
      let next = null
      for (let i = 0; i < towns.length; i++) {
        if (towns[i].id === stall.id && towns[i + 1]) {
          next = towns[i + 1]
          break
        }
      }
      if (next) {
        ui.toast(stall.name + ' 打烊了，下一站 ' + next.name)
        GM.go('city', { cityId: next.id })
      } else {
        ui.toast(prov.short + ' 的夜市都摆过了')
        GM.go('province', { provinceId: prov.id })
      }
    }
  }

  function tap(x, y) {
    const run = GM.run
    for (let i = 0; i < btns.length; i++) {
      if (!ui.hit(btns[i], x, y)) continue
      GM.audio.click()
      const id = btns[i].id
      if (id === 'revive') {
        ui.showModal({
          title: '看广告复活',
          desc: '清掉顶上快爆摊的宵夜，每局一次。',
          actions: [
            {
              label: '观看广告复活',
              primary: true,
              onClick: function () {
                GM.ads.watchRewarded('revive', function () {
                  GM.go('play', { revive: true, cityId: run.cityId, level: run.level })
                }, function (msg) { ui.toast(msg || '未获得奖励') })
              }
            },
            { label: '放弃', onClick: function () {} }
          ]
        })
      } else if (id === 'next') {
        GM.ads.showInterstitial()
        nextLevel()
      } else if (id === 'retry') {
        GM.ads.showInterstitial()
        GM.go('play', { cityId: run.cityId, level: run.level })
      } else if (id === 'share') {
        GM.share.share({
          title: '我在' + run.cityName + (won ? '合成出了' : '摆到了') + (run.foods[won ? run.goal : run.highest] || run.foods[0]).name + '，来一起摆摊！'
        }, function (ok) {
          if (ok && GM.share.grantDailyLucky()) ui.toast('分享成功，下场幸运 +1')
        })
      } else if (id === 'city') {
        GM.go('city', { cityId: run.cityId })
      }
      return
    }
  }

  return { onEnter: onEnter, onExit: onExit, update: update, draw: draw, onTouchEnd: tap }
})
