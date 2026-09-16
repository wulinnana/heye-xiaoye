GameGlobal.GameReg('platform', function (GM) {
  const isWx = typeof wx !== 'undefined' && typeof wx.createCanvas === 'function'
  const listeners = { start: [], move: [], end: [] }

  function bind(type, fn) {
    listeners[type].push(fn)
  }

  function emit(type, x, y) {
    const arr = listeners[type]
    for (let i = 0; i < arr.length; i++) arr[i](x, y)
  }

  if (isWx) {
    const canvas = wx.createCanvas()
    const sys = wx.getSystemInfoSync()
    const dpr = sys.pixelRatio || 1
    const width = sys.windowWidth
    const height = sys.windowHeight
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const safeTop = sys.statusBarHeight || 24
    const safeBottom = sys.safeArea ? Math.max(0, height - sys.safeArea.bottom) : 0

    wx.onTouchStart(function (e) {
      const t = e.touches && e.touches[0]
      if (t) emit('start', t.clientX, t.clientY)
    })
    wx.onTouchMove(function (e) {
      const t = e.touches && e.touches[0]
      if (t) emit('move', t.clientX, t.clientY)
    })
    wx.onTouchEnd(function (e) {
      const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
      if (t) emit('end', t.clientX, t.clientY)
      else emit('end', 0, 0)
    })
    wx.onTouchCancel(function () { emit('end', 0, 0) })

    return {
      isWx: true,
      canvas: canvas,
      ctx: ctx,
      width: width,
      height: height,
      dpr: dpr,
      safeTop: safeTop,
      safeBottom: safeBottom,
      onTouchStart: function (fn) { bind('start', fn) },
      onTouchMove: function (fn) { bind('move', fn) },
      onTouchEnd: function (fn) { bind('end', fn) },
      onShow: function (fn) { wx.onShow(fn) },
      onHide: function (fn) { wx.onHide(fn) },
      toast: function (title) {
        wx.showToast({ title: String(title), icon: 'none', duration: 1800 })
      },
      vibrate: function (heavy) {
        if (GM.storage && GM.storage.data.vibrate === false) return
        try {
          if (heavy && wx.vibrateLong) wx.vibrateLong()
          else if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
        } catch (e) {}
      },
      now: function () { return Date.now() }
    }
  }

  const canvas = document.getElementById('game') || document.createElement('canvas')
  if (!canvas.parentNode) document.body.appendChild(canvas)
  const dpr = window.devicePixelRatio || 1

  function layout() {
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(300, Math.floor(rect.width) || Math.min(430, window.innerWidth))
    const height = Math.max(500, Math.floor(rect.height) || window.innerHeight)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { width: width, height: height, ctx: ctx }
  }

  let sized = layout()
  window.addEventListener('resize', function () {
    const next = layout()
    sized.width = next.width
    sized.height = next.height
    sized.ctx = next.ctx
    api.ctx = next.ctx
    api.width = next.width
    api.height = next.height
  })

  function pos(e) {
    const rect = canvas.getBoundingClientRect()
    const src = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || e
    return {
      x: (src.clientX - rect.left) * (sized.width / rect.width),
      y: (src.clientY - rect.top) * (sized.height / rect.height)
    }
  }

  canvas.addEventListener('mousedown', function (e) {
    const p = pos(e)
    emit('start', p.x, p.y)
  })
  window.addEventListener('mousemove', function (e) {
    if (!(e.buttons & 1)) return
    const p = pos(e)
    emit('move', p.x, p.y)
  })
  window.addEventListener('mouseup', function (e) {
    const p = pos(e)
    emit('end', p.x, p.y)
  })
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault()
    const p = pos(e)
    emit('start', p.x, p.y)
  }, { passive: false })
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault()
    const p = pos(e)
    emit('move', p.x, p.y)
  }, { passive: false })
  canvas.addEventListener('touchend', function (e) {
    e.preventDefault()
    const p = pos(e)
    emit('end', p.x, p.y)
  }, { passive: false })

  const api = {
    isWx: false,
    canvas: canvas,
    ctx: sized.ctx,
    width: sized.width,
    height: sized.height,
    dpr: dpr,
    safeTop: 16,
    safeBottom: 12,
    onTouchStart: function (fn) { bind('start', fn) },
    onTouchMove: function (fn) { bind('move', fn) },
    onTouchEnd: function (fn) { bind('end', fn) },
    onShow: function () {},
    onHide: function () {},
    toast: function (title) { console.log('[toast]', title) },
    vibrate: function (heavy) {
      if (GM.storage && GM.storage.data.vibrate === false) return
      try {
        if (navigator.vibrate) navigator.vibrate(heavy ? 32 : 10)
      } catch (e) {}
    },
    now: function () { return Date.now() }
  }
  return api
})
