GameGlobal.GameReg('main', function (GM) {
  const plat = GM.platform
  const scenes = {
    home: GM.sceneHome,
    province: GM.sceneProvince,
    city: GM.sceneCity,
    play: GM.scenePlay,
    result: GM.sceneResult,
    album: GM.sceneAlbum,
    settings: GM.sceneSettings
  }
  let name = 'home'
  let last = Date.now()

  GM.go = function (n, data) {
    const cur = scenes[name]
    if (cur && cur.onExit) cur.onExit()
    name = n
    scenes[n].onEnter(data || {})
  }

  plat.onTouchStart(function (x, y) {
    GM.audio.resume()
    if (GM.ads.mock.active || GM.ui.state.modal) return
    const s = scenes[name]
    if (s.onTouchStart) s.onTouchStart(x, y)
  })
  plat.onTouchMove(function (x, y) {
    if (GM.ads.mock.active || GM.ui.state.modal) return
    const s = scenes[name]
    if (s.onTouchMove) s.onTouchMove(x, y)
  })
  plat.onTouchEnd(function (x, y) {
    if (GM.ads.mock.active) {
      GM.ads.onTouchEnd(x, y)
      return
    }
    if (GM.ui.state.modal) {
      GM.ui.handleModal(x, y)
      return
    }
    const s = scenes[name]
    if (s.onTouchEnd) s.onTouchEnd(x, y)
  })

  plat.onHide(function () {
    if (GM.audio.suspend) GM.audio.suspend()
  })
  plat.onShow(function () {
    if (GM.audio.resume) GM.audio.resume()
  })

  function frame() {
    const now = Date.now()
    let dt = (now - last) / 1000
    last = now
    if (dt > 0.05) dt = 0.05
    const s = scenes[name]
    if (s.update) s.update(dt)
    if (GM.audio.update) GM.audio.update(dt)
    GM.particles.update(dt)
    GM.ui.update(dt)
    GM.ads.update(dt)
    plat.ctx.clearRect(0, 0, plat.width, plat.height)
    s.draw(plat.ctx)
    GM.ui.drawModal(plat.ctx)
    GM.ui.drawToasts(plat.ctx)
    GM.ads.draw(plat.ctx)
    const raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : function (cb) { setTimeout(cb, 16) }
    raf(frame)
  }

  GM.go('home')
  if (typeof location !== 'undefined' && location.hash === '#play') {
    GM.go('play', { cityId: 'bj-0', level: 0, boost: true })
  }
  frame()
})
