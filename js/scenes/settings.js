GameGlobal.GameReg('sceneSettings', function (GM) {
  const plat = GM.platform
  const ui = GM.ui
  const cfg = GM.config
  let time = 0
  let back = null
  let rows = []
  let from = 'home'

  const ITEMS = [
    { key: 'sound', title: '音效', desc: '点击、掉落、合成的提示音' },
    { key: 'music', title: '音乐', desc: '夜档小曲，本地生成，不耗流量' },
    { key: 'vibrate', title: '震动', desc: '掉落和过关时的轻触反馈' }
  ]

  function on() {
    return {
      sound: GM.storage.data.sound !== false,
      music: GM.storage.data.music !== false,
      vibrate: GM.storage.data.vibrate !== false
    }
  }

  function layout() {
    const w = plat.width
    back = { x: 14, y: plat.safeTop + 10, w: 70, h: 36, label: '返回' }
    rows = []
    const startY = plat.safeTop + 88
    for (let i = 0; i < ITEMS.length; i++) {
      rows.push({
        item: ITEMS[i],
        x: 16,
        y: startY + i * 96,
        w: w - 32,
        h: 86
      })
    }
  }

  function onEnter(opt) {
    from = (opt && opt.from) || 'home'
    layout()
    GM.ads.showBanner()
  }

  function onExit() { GM.ads.hideBanner() }
  function update(dt) { time += dt }

  function drawSwitch(ctx, x, y, w, h, isOn) {
    const th = cfg.theme
    ui.round(ctx, x, y, w, h, h / 2)
    ctx.fillStyle = isOn ? th.green : '#cbb79a'
    ctx.fill()
    ctx.strokeStyle = isOn ? '#145a38' : '#8a7a68'
    ctx.lineWidth = 2
    ctx.stroke()
    const r = h / 2 - 4
    const cx = isOn ? x + w - r - 5 : x + r + 5
    ctx.beginPath()
    ctx.arc(cx, y + h / 2, r, 0, Math.PI * 2)
    ctx.fillStyle = '#fff8ec'
    ctx.fill()
    ctx.fillStyle = isOn ? '#fff8ec' : th.ink
    ctx.font = ui.font(12)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(isOn ? '开' : '关', x + (isOn ? 22 : w - 22), y + h / 2 + 1)
  }

  function draw(ctx) {
    ui.stallBg(ctx, time)
    const th = cfg.theme
    const w = plat.width
    const flags = on()
    ui.drawTicket(ctx, back)
    ui.drawSign(ctx, 92, plat.safeTop + 8, w - 106, 50, '摊位设置', '音效 · 音乐 · 震动')

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const item = row.item
      const isOn = flags[item.key]
      ui.drawCard(ctx, row.x, row.y, row.w, row.h, true)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = th.ink
      ctx.font = ui.font(18)
      ctx.fillText(item.title, row.x + 18, row.y + 34)
      ctx.fillStyle = th.red
      ctx.font = ui.font(12)
      ctx.fillText(item.desc, row.x + 18, row.y + 58)
      drawSwitch(ctx, row.x + row.w - 86, row.y + 26, 68, 32, isOn)
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = th.ink
    ctx.font = ui.font(12)
    ctx.fillText('进度保存在本机，更新游戏不会清空', w / 2, plat.safeTop + 88 + ITEMS.length * 96 + 12)
  }

  function goBack() {
    if (from === 'play' && GM.run) GM.go('play', { keep: true })
    else GM.go('home')
  }

  function tap(x, y) {
    if (back && ui.hit(back, x, y)) {
      GM.audio.click()
      goBack()
      return
    }
    for (let i = 0; i < rows.length; i++) {
      if (!ui.hit(rows[i], x, y)) continue
      const key = rows[i].item.key
      const flags = on()
      const next = !flags[key]
      GM.storage.setFlag(key, next)
      if (key === 'sound' && next) GM.audio.click()
      else if (key !== 'sound') GM.audio.click()
      ui.toast(rows[i].item.title + (next ? ' 已打开' : ' 已关闭'))
      return
    }
  }

  return { onEnter: onEnter, onExit: onExit, update: update, draw: draw, onTouchEnd: tap }
})
