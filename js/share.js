GameGlobal.GameReg('share', function (GM) {
  const cfg = GM.config

  function titleOf(opts) {
    opts = opts || {}
    if (opts.title) return opts.title
    if (opts.food) return '我在《' + cfg.appName + '》合成出了' + opts.food + '，来一起摆摊！'
    if (opts.score) return '我在《' + cfg.appName + '》摆摊得了' + opts.score + '分！'
    return '《' + cfg.appName + '》' + cfg.shareTagline
  }

  function doShare(opts, onDone) {
    const title = titleOf(opts)
    try {
      GM.storage.data.shares += 1
      GM.storage.save()
    } catch (e) {}

    if (typeof wx !== 'undefined' && wx.shareAppMessage) {
      const payload = {
        title: title,
        imageUrl: 'share-cover.jpg',
        query: 'from=share'
      }
      if (opts && opts.imageUrl) payload.imageUrl = opts.imageUrl
      try {
        wx.shareAppMessage(payload)
      } catch (e) {}
      if (onDone) onDone(true)
      return
    }

    if (GM.ui) GM.ui.toast('请在微信里点分享，发给好友或群聊')
    if (onDone) onDone(false)
  }

  function grantDailyLucky() {
    if (GM.storage.data.daily.shareLucky) return false
    GM.storage.markShareLucky()
    if (GM.run) GM.run.luckyCharges = (GM.run.luckyCharges || 0) + (cfg.rewards.dailyShareLucky || 1)
    return true
  }

  if (typeof wx !== 'undefined' && wx.showShareMenu) {
    try {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage']
      })
    } catch (e) {}
  }
  if (typeof wx !== 'undefined' && wx.updateShareMenu) {
    try {
      wx.updateShareMenu({ withShareTicket: true })
    } catch (e) {}
  }
  if (typeof wx !== 'undefined' && wx.onShareAppMessage) {
    wx.onShareAppMessage(function () {
      const run = GM.run
      return {
        title: titleOf({
          title: run
            ? ('我在' + run.cityName + (run.won ? '合成出了招牌夜宵' : '摆摊得了' + run.score + '分'))
            : ('《' + cfg.appName + '》' + cfg.shareTagline)
        }),
        query: 'from=share',
        imageUrl: 'share-cover.jpg'
      }
    })
  }

  return {
    share: doShare,
    grantDailyLucky: grantDailyLucky,
    titleOf: titleOf
  }
})
