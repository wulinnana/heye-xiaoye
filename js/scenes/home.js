GameGlobal.GameReg('sceneHome', function (GM) {
  const plat = GM.platform
  const ui = GM.ui
  const cfg = GM.config
  let time = 0
  let btns = []
  let rows = []
  let scroll = 0
  let maxScroll = 0
  let dragY = 0
  let dragging = false
  let moved = 0
  let listBox = null

  const ROW = 76
  const HEAD = 30

  function layout() {
    const w = plat.width
    const h = plat.height
    const by = h - 56 - plat.safeBottom
    listBox = {
      x: 12,
      y: plat.safeTop + 88,
      w: w - 24,
      h: by - 14 - (plat.safeTop + 88)
    }
    rows = []
    let y = 0
    for (let r = 0; r < cfg.regions.length; r++) {
      const region = cfg.regions[r]
      const list = cfg.citiesInRegion(region.id)
      rows.push({ kind: 'head', region: region, y: y, h: HEAD })
      y += HEAD
      for (let i = 0; i < list.length; i++) {
        rows.push({ kind: 'prov', province: list[i], y: y, h: ROW })
        y += ROW + 8
      }
    }
    maxScroll = Math.max(0, y - listBox.h)
    if (scroll > maxScroll) scroll = maxScroll
    const gap = 10
    const bw = (w - 28 - gap * 2) / 3
    btns = [
      { id: 'album', x: 14, y: by, w: bw, h: 44, label: '图鉴' },
      { id: 'share', x: 14 + (bw + gap), y: by, w: bw, h: 44, label: '分享' },
      { id: 'settings', x: 14 + (bw + gap) * 2, y: by, w: bw, h: 44, label: '设置' }
    ]
  }

  function onEnter() {
    layout()
    GM.ads.showBanner()
  }

  function onExit() { GM.ads.hideBanner() }
  function update(dt) { time += dt }

  function drawBar(ctx, x, y, w, h, ratio, open) {
    const th = cfg.theme
    ui.round(ctx, x, y, w, h, h / 2)
    ctx.fillStyle = '#e4d6c0'
    ctx.fill()
    const fw = Math.max(open && ratio > 0 ? 8 : 0, Math.floor(w * Math.max(0, Math.min(1, ratio))))
    if (fw > 0) {
      ui.round(ctx, x, y, fw, h, h / 2)
      ctx.fillStyle = open ? th.green : '#9a8870'
      ctx.fill()
    }
    ctx.strokeStyle = open ? th.green : '#8a7a68'
    ctx.lineWidth = 1.6
    ui.round(ctx, x, y, w, h, h / 2)
    ctx.stroke()
  }

  function draw(ctx) {
    ui.stallBg(ctx, time)
    const w = plat.width
    const th = cfg.theme
    const st = GM.storage
    ui.drawSign(ctx, w / 2 - 128, plat.safeTop + 8, 256, 50, '点亮中国', '各省特色宵夜 · ' + st.albumCount() + '/' + st.albumTotal())
    ctx.textAlign = 'center'
    ctx.fillStyle = th.ink
    ctx.font = ui.font(13)
    ctx.fillText('已点亮 ' + st.albumCount() + '/' + st.albumTotal() + '   ·   完成 ' + st.totalCleared() + ' 关', w / 2, plat.safeTop + 76)

    ctx.save()
    ctx.beginPath()
    ctx.rect(listBox.x, listBox.y, listBox.w, listBox.h)
    ctx.clip()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const y = listBox.y + row.y - scroll
      if (y + row.h < listBox.y || y > listBox.y + listBox.h) continue
      if (row.kind === 'head') {
        ctx.textAlign = 'left'
        ctx.fillStyle = th.red
        ctx.font = ui.font(14)
        ctx.fillText(row.region.name, listBox.x + 6, y + 20)
        continue
      }
      const p = row.province
      const open = st.cityUnlocked(p)
      const lit = st.litFoods(p.id)
      const total = p.foods.length
      ui.drawCard(ctx, listBox.x, y, listBox.w, ROW, open)
      ui.drawPlate(ctx, listBox.x + 36, y + ROW / 2, 22, p.foods[open ? Math.min(lit, total - 1) : 0], !open || lit === 0)
      ctx.textAlign = 'left'
      ctx.fillStyle = open ? th.ink : '#5a4638'
      ctx.font = ui.font(17)
      ctx.fillText(p.name, listBox.x + 66, y + 26)
      ctx.fillStyle = open ? th.red : '#7a6a58'
      ctx.font = ui.font(11)
      ctx.fillText(open ? (p.towns.length + ' 座城市 · ' + p.tag) : '未开张', listBox.x + 66, y + 46)
      drawBar(ctx, listBox.x + 66, y + 56, listBox.w - 150, 10, lit / total, open)
      ctx.textAlign = 'right'
      ctx.fillStyle = open ? th.green : '#7a6a58'
      ctx.font = ui.font(12)
      ctx.fillText(lit + '/' + total, listBox.x + listBox.w - 14, y + 64)
    }
    ctx.restore()

    for (let i = 0; i < btns.length; i++) ui.drawTicket(ctx, btns[i])
  }

  function openProvince(p) {
    if (GM.storage.cityUnlocked(p)) {
      GM.go('province', { provinceId: p.id })
      return
    }
    const prev = cfg.regions[p.tier - 1]
    ui.showModal({
      title: p.name + ' 还没开张',
      desc: prev ? ('先在「' + prev.name + '」任意一省过一关，或看广告提前开张。') : '看广告可提前开张。',
      actions: [
        {
          label: '看广告提前开张',
          primary: true,
          onClick: function () {
            GM.ads.watchRewarded('boost', function () {
              GM.storage.skipCity(p.id)
              ui.toast(p.short + ' 已开张')
              GM.go('province', { provinceId: p.id })
            }, function (msg) { ui.toast(msg || '未获得奖励') })
          }
        },
        { label: '取消', onClick: function () {} }
      ]
    })
  }

  function hitRow(x, y) {
    if (!listBox || x < listBox.x || x > listBox.x + listBox.w || y < listBox.y || y > listBox.y + listBox.h) return null
    const ly = y - listBox.y + scroll
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row.kind !== 'prov') continue
      if (ly >= row.y && ly <= row.y + row.h) return row.province
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

    for (let i = 0; i < btns.length; i++) {
      if (!ui.hit(btns[i], x, y)) continue
      GM.audio.click()
      if (btns[i].id === 'album') GM.go('album')
      else if (btns[i].id === 'settings') GM.go('settings', { from: 'home' })
      else if (btns[i].id === 'share') {
        GM.share.share({ title: '我在《合成夜宵》点亮各省夜宵，已完成 ' + GM.storage.totalCleared() + ' 关！' }, function (ok) {
          if (ok && GM.share.grantDailyLucky()) ui.toast('分享成功，下场幸运掉落 +1')
        })
      }
      return
    }

    const p = hitRow(x, y)
    if (p) {
      GM.audio.click()
      openProvince(p)
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
