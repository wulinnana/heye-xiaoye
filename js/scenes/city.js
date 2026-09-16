GameGlobal.GameReg('sceneCity', function (GM) {
  const plat = GM.platform
  const ui = GM.ui
  const cfg = GM.config
  let city = null
  let time = 0
  let back = null
  let cells = []
  let playBtn = null

  function onEnter(opt) {
    city = cfg.stallById((opt && opt.cityId) || 'bj-0')
    const w = plat.width
    back = { x: 14, y: plat.safeTop + 10, w: 70, h: 36, label: '回城' }
    const cols = 3
    const gap = 8
    const cw = (w - 36 - gap * (cols - 1)) / cols
    const ch = 92
    const startY = plat.safeTop + 198
    cells = []
    for (let i = 0; i < city.levels.length; i++) {
      const c = i % cols
      const r = Math.floor(i / cols)
      cells.push({
        i: i,
        x: 18 + c * (cw + gap),
        y: startY + r * (ch + 10),
        w: cw,
        h: ch
      })
    }
    playBtn = { x: w / 2 - 124, y: plat.height - 62 - plat.safeBottom, w: 248, h: 48, label: '进入夜市', primary: true }
    GM.ads.showBanner()
  }

  function onExit() { GM.ads.hideBanner() }
  function update(dt) { time += dt }

  function nextLockedIndex() {
    for (let i = 0; i < city.levels.length; i++) {
      if (GM.storage.starsOf(city.id + '-' + i) < 1 && GM.storage.levelUnlocked(city, i)) return i
    }
    return city.levels.length - 1
  }

  function drawFoodRow(ctx, foods, unlocked) {
    const w = plat.width
    const cols = 5
    const rows = Math.ceil(foods.length / cols)
    const gap = Math.min(56, (w - 36) / cols)
    const start = w / 2 - (cols - 1) * gap / 2
    for (let i = 0; i < foods.length; i++) {
      const c = i % cols
      const r = Math.floor(i / cols)
      const open = unlocked.indexOf(i) >= 0
      ui.drawPlate(ctx, start + c * gap, plat.safeTop + 78 + r * 38, 16, foods[i], !open)
    }
    return plat.safeTop + 78 + rows * 38
  }

  function draw(ctx) {
    ui.stallBg(ctx, time)
    const th = cfg.theme
    const w = plat.width
    ui.drawTicket(ctx, back)
    ui.drawSign(ctx, 92, plat.safeTop + 8, w - 106, 50, city.name, city.provinceName + ' · ' + city.tag)

    const foods = city.foods
    const unlocked = GM.storage.data.album[city.provinceId] || []
    const after = drawFoodRow(ctx, foods, unlocked)

    ctx.fillStyle = th.ink
    ctx.font = ui.font(12)
    ctx.textAlign = 'center'
    ctx.fillText(foods.length + ' 道合成链 · 共 ' + city.levels.length + ' 关', w / 2, after + 6)

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      const lv = city.levels[cell.i]
      const open = GM.storage.levelUnlocked(city, cell.i)
      const stars = GM.storage.starsOf(city.id + '-' + cell.i)
      const goal = city.foods[lv.goal]
      ui.drawCard(ctx, cell.x, cell.y, cell.w, cell.h, open)
      ui.drawPlate(ctx, cell.x + cell.w / 2, cell.y + 26, 20, goal, !open)
      ctx.fillStyle = th.red
      ctx.font = ui.font(13)
      ctx.textAlign = 'center'
      ctx.fillText('第 ' + (cell.i + 1) + ' 关', cell.x + cell.w / 2, cell.y + 50)
      ctx.fillStyle = th.ink
      ctx.font = ui.font(11)
      ctx.fillText(open ? lv.title : '未解锁', cell.x + cell.w / 2, cell.y + 66)
      if (open && stars >= 1) {
        ctx.fillStyle = th.green
        ctx.font = ui.font(11)
        ctx.fillText('已完成', cell.x + cell.w / 2, cell.y + 80)
      } else if (open) {
        ctx.fillStyle = th.ink
        ctx.font = ui.font(11)
        ctx.fillText('未完成', cell.x + cell.w / 2, cell.y + 80)
      } else {
        ctx.fillStyle = th.red
        ctx.font = ui.font(11)
        ctx.fillText('广告可开', cell.x + cell.w / 2, cell.y + 80)
      }
    }

    ui.drawBtn(ctx, playBtn)
  }

  function enterLevel(li) {
    GM.go('play', { cityId: city.id, level: li })
  }

  function tap(x, y) {
    if (back && ui.hit(back, x, y)) {
      GM.audio.click()
      GM.go('province', { provinceId: city.provinceId })
      return
    }
    if (playBtn && ui.hit(playBtn, x, y)) {
      GM.audio.click()
      enterLevel(nextLockedIndex())
      return
    }
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      if (!ui.hit(cell, x, y)) continue
      GM.audio.click()
      if (GM.storage.levelUnlocked(city, cell.i)) {
        enterLevel(cell.i)
        return
      }
      const key = city.id + '-' + cell.i
      ui.showModal({
        title: '提前开这一关？',
        desc: '看完广告即可试玩第 ' + (cell.i + 1) + ' 关。通关仍记星。',
        actions: [
          {
            label: '看广告解锁',
            primary: true,
            onClick: function () {
              GM.ads.watchRewarded('boost', function () {
                GM.storage.skipLevel(key)
                enterLevel(cell.i)
              }, function (msg) { ui.toast(msg || '未获得奖励') })
            }
          },
          { label: '取消', onClick: function () {} }
        ]
      })
      return
    }
  }

  return { onEnter: onEnter, onExit: onExit, update: update, draw: draw, onTouchEnd: tap }
})
