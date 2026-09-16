GameGlobal.GameReg('sceneAlbum', function (GM) {
  const plat = GM.platform
  const ui = GM.ui
  const cfg = GM.config
  let time = 0
  let back = null
  let regionTabs = []
  let provTabs = []
  let city = null
  let region = null
  let cells = []

  function layout() {
    const w = plat.width
    back = { x: 14, y: plat.safeTop + 10, w: 64, h: 34, label: '回列表' }
    const regions = cfg.regions
    const cols = 4
    const tw = (w - 32) / cols
    regionTabs = []
    for (let i = 0; i < regions.length; i++) {
      const c = i % cols
      const r = Math.floor(i / cols)
      regionTabs.push({
        i: i,
        x: 16 + c * tw,
        y: plat.safeTop + 64 + r * 30,
        w: tw - 4,
        h: 26,
        label: regions[i].name
      })
    }
    const list = cfg.citiesInRegion(region.id)
    const pw = Math.min(70, (w - 24) / Math.max(1, list.length))
    provTabs = []
    for (let i = 0; i < list.length; i++) {
      provTabs.push({
        city: list[i],
        x: 12 + i * pw,
        y: plat.safeTop + 128,
        w: pw - 4,
        h: 28
      })
    }
    const foods = city.foods
    const fcols = 5
    const gap = 8
    const cw = (w - 32 - gap * (fcols - 1)) / fcols
    cells = []
    for (let i = 0; i < foods.length; i++) {
      const c = i % fcols
      const r = Math.floor(i / fcols)
      cells.push({
        i: i,
        x: 16 + c * (cw + gap),
        y: plat.safeTop + 168 + r * (cw + 28),
        w: cw,
        h: cw + 20
      })
    }
  }

  function onEnter(opt) {
    city = cfg.cityById((opt && opt.cityId) || 'bj')
    region = cfg.regionById(city.region)
    layout()
    GM.ads.showBanner()
  }

  function onExit() { GM.ads.hideBanner() }
  function update(dt) { time += dt }

  function draw(ctx) {
    ui.stallBg(ctx, time)
    const th = cfg.theme
    ui.drawTicket(ctx, back)
    ui.drawSign(ctx, 86, plat.safeTop + 8, plat.width - 100, 48, '宵夜图鉴', GM.storage.albumCount() + ' / ' + GM.storage.albumTotal())

    for (let i = 0; i < regionTabs.length; i++) {
      const t = regionTabs[i]
      const on = cfg.regions[t.i].id === region.id
      ui.round(ctx, t.x, t.y, t.w, t.h, 6)
      ctx.fillStyle = on ? th.cream : '#e6d8c4'
      ctx.fill()
      ctx.strokeStyle = on ? th.green : '#8a7a68'
      ctx.lineWidth = on ? 3 : 2
      ctx.stroke()
      ctx.fillStyle = on ? th.red : th.ink
      ctx.font = ui.font(12)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t.label, t.x + t.w / 2, t.y + t.h / 2)
    }

    ctx.textBaseline = 'alphabetic'
    for (let i = 0; i < provTabs.length; i++) {
      const t = provTabs[i]
      const on = t.city.id === city.id
      ui.round(ctx, t.x, t.y, t.w, t.h, 6)
      ctx.fillStyle = on ? th.cream : '#eadfcb'
      ctx.fill()
      ctx.strokeStyle = on ? th.red : th.green
      ctx.lineWidth = on ? 2.4 : 1.6
      ctx.stroke()
      ctx.fillStyle = on ? th.red : th.ink
      ctx.font = ui.font(11)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t.city.short, t.x + t.w / 2, t.y + t.h / 2)
    }

    const unlocked = GM.storage.data.album[city.id] || []
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      const food = city.foods[cell.i]
      const open = unlocked.indexOf(cell.i) >= 0
      ui.drawCard(ctx, cell.x, cell.y, cell.w, cell.h, open)
      ui.drawPlate(ctx, cell.x + cell.w / 2, cell.y + cell.h * 0.40, Math.min(32, cell.w * 0.34), food, !open)
      ctx.fillStyle = open ? th.ink : '#5a4638'
      ctx.font = ui.font(10)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(open ? food.name : '未点亮', cell.x + cell.w / 2, cell.y + cell.h * 0.88)
    }
  }

  function tap(x, y) {
    if (back && ui.hit(back, x, y)) {
      GM.audio.click()
      GM.go('home')
      return
    }
    for (let i = 0; i < regionTabs.length; i++) {
      if (ui.hit(regionTabs[i], x, y)) {
        GM.audio.click()
        region = cfg.regions[regionTabs[i].i]
        const list = cfg.citiesInRegion(region.id)
        city = list[0]
        layout()
        return
      }
    }
    for (let i = 0; i < provTabs.length; i++) {
      if (ui.hit(provTabs[i], x, y)) {
        GM.audio.click()
        city = provTabs[i].city
        layout()
        return
      }
    }
  }

  return { onEnter: onEnter, onExit: onExit, update: update, draw: draw, onTouchEnd: tap }
})
