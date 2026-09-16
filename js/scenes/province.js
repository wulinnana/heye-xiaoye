GameGlobal.GameReg('sceneProvince', function (GM) {
  const plat = GM.platform
  const ui = GM.ui
  const cfg = GM.config
  let province = null
  let time = 0
  let back = null
  let cards = []
  let scroll = 0
  let maxScroll = 0
  let dragY = 0
  let dragging = false
  let moved = 0
  let listBox = null

  const CARD_H = 78

  function layout() {
    const w = plat.width
    const h = plat.height
    back = { x: 14, y: plat.safeTop + 10, w: 70, h: 36, label: '回列表' }
    listBox = {
      x: 14,
      y: plat.safeTop + 168,
      w: w - 28,
      h: h - plat.safeTop - 168 - 76 - plat.safeBottom
    }
    const towns = province.towns || []
    cards = []
    for (let i = 0; i < towns.length; i++) {
      cards.push({
        town: towns[i],
        y: i * (CARD_H + 8),
        h: CARD_H
      })
    }
    const total = towns.length * (CARD_H + 8) - 8
    maxScroll = Math.max(0, total - listBox.h)
    if (scroll > maxScroll) scroll = maxScroll
  }

  function onEnter(opt) {
    province = cfg.cityById((opt && opt.provinceId) || 'bj')
    scroll = 0
    layout()
    GM.ads.showBanner()
  }

  function onExit() { GM.ads.hideBanner() }
  function update(dt) { time += dt }

  function draw(ctx) {
    ui.stallBg(ctx, time)
    const th = cfg.theme
    const w = plat.width
    const st = GM.storage
    ui.drawTicket(ctx, back)
    ui.drawSign(ctx, 92, plat.safeTop + 8, w - 106, 50, province.name, province.tag)

    const foods = province.foods
    const cols = 5
    const gap = Math.min(56, (w - 36) / cols)
    const start = w / 2 - (cols - 1) * gap / 2
    const unlocked = st.data.album[province.id] || []
    for (let i = 0; i < foods.length; i++) {
      const c = i % cols
      const r = Math.floor(i / cols)
      ui.drawPlate(ctx, start + c * gap, plat.safeTop + 78 + r * 36, 15, foods[i], unlocked.indexOf(i) < 0)
    }
    ctx.textAlign = 'center'
    ctx.fillStyle = th.ink
    ctx.font = ui.font(12)
    ctx.fillText(province.towns.length + ' 座城市 · ' + foods.length + ' 道宵夜', w / 2, plat.safeTop + 154)

    ctx.save()
    ctx.beginPath()
    ctx.rect(listBox.x, listBox.y, listBox.w, listBox.h)
    ctx.clip()
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i]
      const y = listBox.y + c.y - scroll
      if (y + c.h < listBox.y || y > listBox.y + listBox.h) continue
      const stall = cfg.stallById(c.town.id)
      let done = 0
      for (let l = 0; l < stall.levels.length; l++) {
        if (st.starsOf(stall.id + '-' + l) >= 1) done += 1
      }
      const max = stall.levels.length
      ui.drawCard(ctx, listBox.x, y, listBox.w, c.h, true)
      const fi = Math.min(3 + i, foods.length - 1)
      ui.drawPlate(ctx, listBox.x + 38, y + c.h / 2, 22, foods[fi], unlocked.length === 0)
      ctx.textAlign = 'left'
      ctx.fillStyle = th.ink
      ctx.font = ui.font(17)
      ctx.fillText(c.town.name, listBox.x + 72, y + 28)
      ctx.fillStyle = th.red
      ctx.font = ui.font(12)
      ctx.fillText(c.town.tag, listBox.x + 72, y + 50)
      ctx.textAlign = 'right'
      ctx.fillStyle = th.green
      ctx.font = ui.font(13)
      ctx.fillText(done + '/' + max + ' 关', listBox.x + listBox.w - 16, y + c.h / 2 + 5)
    }
    ctx.restore()
  }

  function hitCard(x, y) {
    if (!listBox || x < listBox.x || x > listBox.x + listBox.w || y < listBox.y || y > listBox.y + listBox.h) return null
    const ly = y - listBox.y + scroll
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i]
      if (ly >= c.y && ly <= c.y + c.h) return c
    }
    return null
  }

  function onTouchStart(x, y) {
    if (!listBox || y < listBox.y || y > listBox.y + listBox.h) {
      dragging = false
      return
    }
    dragging = true
    dragY = y
    moved = 0
  }

  function onTouchMove(x, y) {
    if (!dragging) return
    const dy = dragY - y
    dragY = y
    moved += Math.abs(dy)
    scroll = Math.max(0, Math.min(maxScroll, scroll + dy))
  }

  function tap(x, y) {
    const wasDrag = moved > 12
    dragging = false
    moved = 0
    if (wasDrag) return
    if (back && ui.hit(back, x, y)) {
      GM.audio.click()
      GM.go('home')
      return
    }
    const c = hitCard(x, y)
    if (c) {
      GM.audio.click()
      GM.go('city', { cityId: c.town.id })
    }
  }

  return {
    onEnter: onEnter,
    onExit: onExit,
    update: update,
    draw: draw,
    onTouchStart: onTouchStart,
    onTouchMove: onTouchMove,
    onTouchEnd: tap
  }
})
