GameGlobal.GameReg('ui', function (GM) {
  const plat = GM.platform
  const state = { modal: null, toasts: [] }

  function T() { return GM.config.theme }

  function font(px, weight) {
    return (weight || 'bold') + ' ' + px + 'px "PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif'
  }

  function round(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  function hit(btn, x, y) {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h
  }

  function drawBtn(ctx, btn) {
    const th = T()
    ctx.save()
    round(ctx, btn.x + 2, btn.y + 3, btn.w, btn.h, btn.r || 16)
    ctx.fillStyle = 'rgba(90,20,20,0.18)'
    ctx.fill()
    round(ctx, btn.x, btn.y, btn.w, btn.h, btn.r || 16)
    ctx.fillStyle = btn.bg0 || th.red
    ctx.fill()
    ctx.strokeStyle = btn.stroke || '#8a1218'
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.fillStyle = btn.color || '#fff6e8'
    ctx.font = btn.font || font(18)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1)
    ctx.restore()
  }

  function drawGhostBtn(ctx, btn) {
    drawTicket(ctx, btn)
  }

  function drawTicket(ctx, btn) {
    const th = T()
    const x = btn.x
    const y = btn.y
    const w = btn.w
    const h = btn.h
    ctx.save()
    round(ctx, x + 2, y + 3, w, h, 6)
    ctx.fillStyle = 'rgba(30,20,10,0.14)'
    ctx.fill()
    round(ctx, x, y, w, h, 6)
    ctx.fillStyle = '#f4ead6'
    ctx.fill()
    ctx.strokeStyle = th.green
    ctx.lineWidth = 4
    ctx.stroke()
    round(ctx, x + 5, y + 5, w - 10, h - 10, 4)
    ctx.strokeStyle = th.red
    ctx.lineWidth = 1.6
    ctx.stroke()
    ctx.fillStyle = th.red
    ctx.font = btn.font || font(15)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(btn.label, x + w / 2, y + h / 2 + 1)
    ctx.restore()
  }

  function toast(text) {
    state.toasts.push({ text: String(text), t: 0, life: 1.8 })
    plat.toast(text)
  }

  function showModal(modal) { state.modal = modal }
  function hideModal() { state.modal = null }

  function update(dt) {
    for (let i = state.toasts.length - 1; i >= 0; i--) {
      state.toasts[i].t += dt
      if (state.toasts[i].t >= state.toasts[i].life) state.toasts.splice(i, 1)
    }
  }

  function drawToasts(ctx) {
    const th = T()
    const w = plat.width
    for (let i = 0; i < state.toasts.length; i++) {
      const t = state.toasts[i]
      const a = t.t < 0.15 ? t.t / 0.15 : (t.t > t.life - 0.25 ? (t.life - t.t) / 0.25 : 1)
      ctx.save()
      ctx.globalAlpha = a
      const y = 92 + i * 42
      round(ctx, w / 2 - 140, y, 280, 36, 8)
      ctx.fillStyle = '#fff4e4'
      ctx.fill()
      ctx.strokeStyle = th.green
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = th.ink
      ctx.font = 'bold 15px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t.text, w / 2, y + 18)
      ctx.restore()
    }
  }

  function wrapText(ctx, text, x, y, maxW, lh) {
    const chars = text.split('')
    let line = ''
    let yy = y
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i]
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, x, yy)
        line = chars[i]
        yy += lh
      } else line = test
    }
    ctx.fillText(line, x, yy)
  }

  function drawModal(ctx) {
    const m = state.modal
    if (!m) return
    const th = T()
    const w = plat.width
    const h = plat.height
    ctx.save()
    ctx.fillStyle = 'rgba(40, 18, 10, 0.48)'
    ctx.fillRect(0, 0, w, h)
    const bw = Math.min(330, w - 36)
    const btns = (m.actions || []).length
    const bh = 176 + btns * 52
    const x = (w - bw) / 2
    const y = (h - bh) / 2
    round(ctx, x, y, bw, bh, 8)
    ctx.fillStyle = th.cream
    ctx.fill()
    ctx.strokeStyle = th.green
    ctx.lineWidth = 5
    ctx.stroke()
    round(ctx, x + 8, y + 8, bw - 16, bh - 16, 4)
    ctx.strokeStyle = th.red
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = th.red
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(m.title, w / 2, y + 42)
    ctx.fillStyle = th.ink
    ctx.font = 'bold 15px sans-serif'
    wrapText(ctx, m.desc || '', w / 2, y + 78, bw - 40, 20)
    m._btns = []
    for (let i = 0; i < btns; i++) {
      const act = m.actions[i]
      const by = y + 122 + i * 52
      const btn = { x: x + 22, y: by, w: bw - 44, h: 42, label: act.label, act: act }
      m._btns.push(btn)
      if (act.primary) drawBtn(ctx, btn)
      else drawTicket(ctx, btn)
    }
    ctx.restore()
  }

  function handleModal(x, y) {
    const m = state.modal
    if (!m || !m._btns) return false
    for (let i = 0; i < m._btns.length; i++) {
      if (hit(m._btns[i], x, y)) {
        const act = m._btns[i].act
        if (!act.keep) hideModal()
        if (act.onClick) act.onClick()
        return true
      }
    }
    return true
  }

  function stallBg(ctx) {
    const w = plat.width
    const h = plat.height
    const th = T()
    ctx.fillStyle = th.bg0
    ctx.fillRect(0, 0, w, h)
    if (!state._stain) {
      state._stain = []
      for (let i = 0; i < 18; i++) {
        state._stain.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 12 + Math.random() * 40,
          a: 0.03 + Math.random() * 0.04
        })
      }
    }
    for (let i = 0; i < state._stain.length; i++) {
      const s = state._stain[i]
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(90,60,30,' + s.a + ')'
      ctx.fill()
    }
    ctx.fillStyle = th.green
    ctx.fillRect(0, 0, w, plat.safeTop + 6)
    const foot = 68 + plat.safeBottom
    ctx.fillStyle = th.wood
    ctx.fillRect(0, h - foot, w, foot)
    ctx.fillStyle = '#4a2e20'
    ctx.fillRect(0, h - foot, w, 6)
  }

  function enamelBg(ctx, t) { stallBg(ctx, t) }

  function drawEnamelTray(ctx, x, y, w, h) {
    const th = T()
    round(ctx, x + 3, y + 6, w, h, 10)
    ctx.fillStyle = 'rgba(40, 24, 12, 0.18)'
    ctx.fill()
    round(ctx, x, y, w, h, 10)
    ctx.fillStyle = th.tray
    ctx.fill()
    ctx.strokeStyle = th.red
    ctx.lineWidth = 10
    ctx.stroke()
    round(ctx, x + 8, y + 8, w - 16, h - 16, 6)
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(140, 70, 40, 0.22)'
    ctx.beginPath()
    ctx.arc(x + 14, y + h - 12, 9, 0.2, Math.PI * 1.1)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + w - 16, y + 16, 7, -0.4, 2.2)
    ctx.fill()
    ctx.fillStyle = 'rgba(160, 40, 30, 0.28)'
    ctx.beginPath()
    ctx.arc(x + w - 12, y + h - 14, 8, 0, Math.PI)
    ctx.fill()
  }

  function drawCard(ctx, x, y, w, h, open) {
    const th = T()
    round(ctx, x + 2, y + 3, w, h, 6)
    ctx.fillStyle = 'rgba(30, 18, 10, 0.14)'
    ctx.fill()
    round(ctx, x, y, w, h, 6)
    ctx.fillStyle = open ? th.cream : '#d4c6b0'
    ctx.fill()
    ctx.strokeStyle = open ? th.green : '#7a6a58'
    ctx.lineWidth = 4
    ctx.stroke()
    round(ctx, x + 6, y + 6, w - 12, h - 12, 3)
    ctx.strokeStyle = open ? th.red : '#9a8870'
    ctx.lineWidth = 1.4
    ctx.stroke()
  }

  function drawCircle(ctx, x, y, r, fill, stroke) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    if (fill) {
      ctx.fillStyle = fill
      ctx.fill()
    }
    if (stroke) {
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2.4
      ctx.stroke()
    }
  }

  function steam(ctx, x, y, r) {
    if (r < 18) return
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = Math.max(1.2, r * 0.045)
    ctx.lineCap = 'round'
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.moveTo(x + i * r * 0.16, y)
      ctx.quadraticCurveTo(x + i * r * 0.24, y - r * 0.14, x + i * r * 0.08, y - r * 0.28)
      ctx.stroke()
    }
  }

  function drawBowlBase(ctx, x, y, inner, c0, c1) {
    ctx.beginPath()
    ctx.ellipse(x, y + inner * 0.22, inner * 0.92, inner * 0.62, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#efe6d4'
    ctx.fill()
    ctx.strokeStyle = '#8a6a48'
    ctx.lineWidth = Math.max(1.2, inner * 0.05)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(x, y + inner * 0.02, inner * 0.78, inner * 0.42, 0, 0, Math.PI * 2)
    ctx.fillStyle = c1
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x, y - inner * 0.02, inner * 0.7, inner * 0.34, 0, 0, Math.PI * 2)
    ctx.fillStyle = c0
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x - inner * 0.18, y - inner * 0.1, inner * 0.28, inner * 0.12, -0.4, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fill()
  }

  function drawFoodBody(ctx, x, y, r, food) {
    const c0 = food.colors[0]
    const c1 = food.colors[1]
    const kind = food.kind || 'round'
    const inner = r * 0.78

    if (kind === 'bowl') {
      drawBowlBase(ctx, x, y, inner, c0, c1)
      ctx.fillStyle = c1
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.ellipse(x - inner * 0.32 + i * inner * 0.22, y + inner * 0.04, inner * 0.12, inner * 0.07, 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
      steam(ctx, x, y - inner * 0.42, r)
    } else if (kind === 'noodle') {
      drawBowlBase(ctx, x, y, inner, c0, c1)
      ctx.strokeStyle = '#f0d090'
      ctx.lineWidth = Math.max(2, r * 0.09)
      ctx.lineCap = 'round'
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        const oy = y - inner * 0.16 + i * inner * 0.09
        ctx.moveTo(x - inner * 0.5, oy)
        ctx.bezierCurveTo(x - inner * 0.1, oy + inner * 0.16, x + inner * 0.1, oy - inner * 0.14, x + inner * 0.5, oy + inner * 0.04)
        ctx.stroke()
      }
      ctx.fillStyle = '#c41e2a'
      ctx.beginPath()
      ctx.arc(x + inner * 0.22, y - inner * 0.02, inner * 0.09, 0, Math.PI * 2)
      ctx.fill()
      steam(ctx, x, y - inner * 0.48, r)
    } else if (kind === 'bun') {
      ctx.beginPath()
      ctx.ellipse(x, y + inner * 0.08, inner * 0.82, inner * 0.62, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#f4e2b8'
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x, y - inner * 0.06, inner * 0.78, inner * 0.58, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#fff6dc'
      ctx.fill()
      ctx.strokeStyle = '#c9a060'
      ctx.lineWidth = Math.max(1.1, r * 0.045)
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(x, y - inner * 0.5)
        ctx.quadraticCurveTo(x + i * inner * 0.18, y - inner * 0.08, x + i * inner * 0.08, y + inner * 0.22)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.ellipse(x, y + inner * 0.42, inner * 0.7, inner * 0.16, 0, 0, Math.PI * 2)
      ctx.fillStyle = c0
      ctx.fill()
      steam(ctx, x, y - inner * 0.55, r)
    } else if (kind === 'meat') {
      ctx.beginPath()
      ctx.ellipse(x, y + inner * 0.06, inner * 0.86, inner * 0.58, -0.25, 0, Math.PI * 2)
      ctx.fillStyle = c1
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x, y, inner * 0.78, inner * 0.5, -0.25, 0, Math.PI * 2)
      ctx.fillStyle = c0
      ctx.fill()
      ctx.strokeStyle = 'rgba(90,16,8,0.45)'
      ctx.lineWidth = Math.max(1.2, r * 0.05)
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath()
        ctx.moveTo(x - inner * 0.4, y + i * inner * 0.16)
        ctx.quadraticCurveTo(x, y + i * inner * 0.22, x + inner * 0.42, y + i * inner * 0.1)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.ellipse(x - inner * 0.18, y - inner * 0.16, inner * 0.28, inner * 0.14, -0.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,230,180,0.35)'
      ctx.fill()
    } else if (kind === 'grill') {
      ctx.strokeStyle = '#5a3a28'
      ctx.lineWidth = Math.max(2, r * 0.07)
      ctx.beginPath()
      ctx.moveTo(x - inner * 0.72, y + inner * 0.18)
      ctx.lineTo(x + inner * 0.72, y - inner * 0.18)
      ctx.stroke()
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath()
        ctx.ellipse(x + i * inner * 0.28, y - i * inner * 0.08, inner * 0.22, inner * 0.16, -0.4, 0, Math.PI * 2)
        ctx.fillStyle = i === 0 ? c0 : c1
        ctx.fill()
      }
    } else if (kind === 'sweet') {
      ctx.beginPath()
      ctx.arc(x, y, inner * 0.72, 0, Math.PI * 2)
      ctx.fillStyle = c0
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y, inner * 0.52, 0, Math.PI * 2)
      ctx.fillStyle = '#fff2c8'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y, inner * 0.28, 0, Math.PI * 2)
      ctx.fillStyle = c1
      ctx.fill()
      ctx.fillStyle = '#5a3a18'
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4
        ctx.beginPath()
        ctx.arc(x + Math.cos(a) * inner * 0.58, y + Math.sin(a) * inner * 0.58, Math.max(1.2, r * 0.045), 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (kind === 'drink') {
      ctx.beginPath()
      ctx.moveTo(x - inner * 0.38, y - inner * 0.42)
      ctx.lineTo(x - inner * 0.52, y + inner * 0.48)
      ctx.quadraticCurveTo(x, y + inner * 0.68, x + inner * 0.52, y + inner * 0.48)
      ctx.lineTo(x + inner * 0.38, y - inner * 0.42)
      ctx.closePath()
      ctx.fillStyle = '#f7f1e4'
      ctx.fill()
      ctx.strokeStyle = '#8a6a48'
      ctx.lineWidth = Math.max(1.2, r * 0.045)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x - inner * 0.4, y - inner * 0.18)
      ctx.lineTo(x - inner * 0.48, y + inner * 0.38)
      ctx.quadraticCurveTo(x, y + inner * 0.52, x + inner * 0.48, y + inner * 0.38)
      ctx.lineTo(x + inner * 0.4, y - inner * 0.18)
      ctx.closePath()
      ctx.fillStyle = c0
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x, y - inner * 0.42, inner * 0.38, inner * 0.12, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#fffef8'
      ctx.fill()
      ctx.stroke()
    } else if (kind === 'fish') {
      ctx.beginPath()
      ctx.ellipse(x - inner * 0.08, y, inner * 0.62, inner * 0.38, 0, 0, Math.PI * 2)
      ctx.fillStyle = c0
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x + inner * 0.42, y)
      ctx.lineTo(x + inner * 0.82, y - inner * 0.32)
      ctx.lineTo(x + inner * 0.7, y)
      ctx.lineTo(x + inner * 0.82, y + inner * 0.32)
      ctx.closePath()
      ctx.fillStyle = c1
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x - inner * 0.38, y - inner * 0.08, Math.max(2, r * 0.07), 0, Math.PI * 2)
      ctx.fillStyle = '#1a120c'
      ctx.fill()
    } else if (kind === 'leaf') {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath()
        ctx.ellipse(x + i * inner * 0.22, y + i * inner * 0.04, inner * 0.28, inner * 0.52, i * 0.45, 0, Math.PI * 2)
        ctx.fillStyle = i === 0 ? c0 : c1
        ctx.fill()
      }
    } else {
      ctx.beginPath()
      ctx.arc(x, y, inner * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = c1
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y, inner * 0.58, 0, Math.PI * 2)
      ctx.fillStyle = c0
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x - inner * 0.18, y - inner * 0.2, inner * 0.22, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.28)'
      ctx.fill()
    }
  }

  function drawPlate(ctx, x, y, r, food, locked) {
    const th = T()
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(x + 2, y + r * 0.58, r * 0.78, r * 0.2, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(40,24,12,0.18)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = locked ? '#d3c6b4' : '#fffef8'
    ctx.fill()
    const rim = Math.max(3.2, r * 0.12)
    ctx.lineWidth = rim
    ctx.strokeStyle = locked ? '#7a90a0' : th.blue
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, r - rim * 0.42, 0, Math.PI * 2)
    ctx.strokeStyle = locked ? '#c5b8a6' : '#ffffff'
    ctx.lineWidth = Math.max(1, r * 0.035)
    ctx.stroke()

    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, Math.max(4, r - rim * 0.85), 0, Math.PI * 2)
    ctx.clip()
    if (food && !locked) drawFoodBody(ctx, x, y - r * 0.04, r, food)
    else {
      ctx.fillStyle = '#5a4638'
      ctx.font = font(Math.max(14, r * 0.55))
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('?', x, y + 1)
    }
    ctx.restore()

    if (food && !locked) {
      const n = food.name || ''
      const label = r < 18 ? '' : (r < 34 ? n.slice(0, 2) : (n.length <= 5 ? n : n.slice(0, 4)))
      if (label) {
        ctx.font = font(Math.max(10, Math.floor(r * 0.28)))
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineJoin = 'round'
        ctx.lineWidth = Math.max(3, r * 0.08)
        ctx.strokeStyle = 'rgba(26,18,12,0.55)'
        ctx.strokeText(label, x, y + r * 0.38)
        ctx.fillStyle = '#fff8ec'
        ctx.fillText(label, x, y + r * 0.38)
      }
    }
    ctx.restore()
  }

  function drawStar(ctx, x, y, r, on) {
    const th = T()
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.42
      const a = -Math.PI / 2 + i * Math.PI / 5
      const px = x + Math.cos(a) * rad
      const py = y + Math.sin(a) * rad
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fillStyle = on ? th.red : '#cbb79a'
    ctx.fill()
    ctx.strokeStyle = on ? '#8a1218' : '#9a8870'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  function drawStars(ctx, cx, cy, got, total, gap, r) {
    total = total || 3
    got = Math.max(0, Math.min(total, got || 0))
    gap = gap || 28
    r = r || 11
    for (let i = 0; i < total; i++) {
      drawStar(ctx, cx + (i - (total - 1) / 2) * gap, cy, r, i < got)
    }
  }

  function drawSign(ctx, x, y, w, h, title, sub) {
    const th = T()
    ctx.save()
    round(ctx, x + 2, y + 3, w, h, 4)
    ctx.fillStyle = 'rgba(20,12,8,0.16)'
    ctx.fill()
    round(ctx, x, y, w, h, 4)
    ctx.fillStyle = th.cream
    ctx.fill()
    ctx.strokeStyle = th.green
    ctx.lineWidth = 5
    ctx.stroke()
    round(ctx, x + 7, y + 7, w - 14, h - 14, 2)
    ctx.strokeStyle = th.red
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = th.red
    ctx.font = font(18)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, x + w / 2, y + (sub ? h * 0.38 : h * 0.52))
    if (sub) {
      ctx.font = font(12)
      ctx.fillStyle = th.ink
      ctx.fillText(sub, x + w / 2, y + h * 0.7)
    }
    ctx.restore()
  }

  function nightBg(ctx, t) { stallBg(ctx, t) }

  return {
    state: state,
    round: round,
    hit: hit,
    drawBtn: drawBtn,
    drawGhostBtn: drawGhostBtn,
    drawTicket: drawTicket,
    toast: toast,
    showModal: showModal,
    hideModal: hideModal,
    update: update,
    drawToasts: drawToasts,
    drawModal: drawModal,
    handleModal: handleModal,
    nightBg: nightBg,
    enamelBg: enamelBg,
    stallBg: stallBg,
    drawEnamelTray: drawEnamelTray,
    drawCard: drawCard,
    drawCircle: drawCircle,
    drawPlate: drawPlate,
    drawSign: drawSign,
    drawStars: drawStars,
    font: font
  }
})
