GameGlobal.GameReg('particles', function () {
  const list = []
  const floats = []

  function burst(x, y, color, n) {
    n = n || 16
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 80 + Math.random() * 220
      list.push({
        x: x,
        y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 60,
        life: 0.35 + Math.random() * 0.35,
        t: 0,
        r: 2 + Math.random() * 4,
        color: color
      })
    }
  }

  function floatText(x, y, text, color) {
    floats.push({ x: x, y: y, text: text, color: color || '#ffe08a', t: 0, life: 0.9 })
  }

  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i]
      p.t += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 420 * dt
      if (p.t >= p.life) list.splice(i, 1)
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]
      f.t += dt
      f.y -= 46 * dt
      if (f.t >= f.life) floats.splice(i, 1)
    }
  }

  function draw(ctx) {
    for (let i = 0; i < list.length; i++) {
      const p = list[i]
      const a = 1 - p.t / p.life
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = a
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < floats.length; i++) {
      const f = floats[i]
      ctx.globalAlpha = 1 - f.t / f.life
      ctx.fillStyle = f.color
      ctx.font = 'bold 18px sans-serif'
      ctx.fillText(f.text, f.x, f.y)
    }
    ctx.globalAlpha = 1
  }

  function clear() {
    list.length = 0
    floats.length = 0
  }

  return { burst: burst, floatText: floatText, update: update, draw: draw, clear: clear }
})
