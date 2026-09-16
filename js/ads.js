GameGlobal.GameReg('ads', function (GM) {
  const cfg = GM.config
  const plat = GM.platform

  const mock = {
    active: null,
    banner: false
  }

  let rewarded = null
  let interstitial = null
  let banner = null
  let lastInterstitial = 0
  let rewardedReady = false

  function hasId(id) {
    return !!(id && String(id).indexOf('adunit') === 0)
  }

  function envVersion() {
    try {
      if (typeof wx !== 'undefined' && wx.getAccountInfoSync) {
        return wx.getAccountInfoSync().miniProgram.envVersion || ''
      }
    } catch (e) {}
    return plat.isWx ? 'develop' : 'browser'
  }

  function mockAllowed() {
    return envVersion() !== 'release'
  }

  function realEnabled() {
    return plat.isWx && hasId(cfg.ads.rewarded)
  }

  function bindRewarded() {
    if (!realEnabled() || rewarded) return
    try {
      rewarded = wx.createRewardedVideoAd({ adUnitId: cfg.ads.rewarded })
      rewarded.onLoad(function () { rewardedReady = true })
      rewarded.onError(function () { rewardedReady = false })
      rewarded.onClose(function (res) {
        const ok = !!(res && res.isEnded)
        const cb = rewarded._cb
        rewarded._cb = null
        if (ok) {
          GM.storage.markAd()
          if (cb && cb.ok) cb.ok()
        } else if (cb && cb.fail) {
          cb.fail('未看完广告，没有奖励')
        }
      })
      rewarded.load()
    } catch (e) {
      rewarded = null
    }
  }

  function bindInterstitial() {
    if (!plat.isWx || !hasId(cfg.ads.interstitial) || interstitial) return
    try {
      interstitial = wx.createInterstitialAd({ adUnitId: cfg.ads.interstitial })
      interstitial.onError(function () {})
      interstitial.load()
    } catch (e) {
      interstitial = null
    }
  }

  function showBanner() {
    mock.banner = false
    if (!plat.isWx || !hasId(cfg.ads.banner)) return
    hideBanner(true)
    try {
      banner = wx.createBannerAd({
        adUnitId: cfg.ads.banner,
        adIntervals: 30,
        style: {
          left: 0,
          top: plat.height - 100,
          width: plat.width
        }
      })
      banner.onResize(function () {
        if (!banner || !banner.style) return
        banner.style.top = plat.height - (banner.style.realHeight || 90)
      })
      banner.onError(function () {})
      banner.show()
    } catch (e) {
      banner = null
    }
  }

  function hideBanner(keepMock) {
    if (!keepMock) mock.banner = false
    if (banner) {
      try { banner.hide(); banner.destroy() } catch (e) {}
      banner = null
    }
  }

  function startMock(kind, title, desc, onOk, onFail) {
    mock.active = {
      kind: kind,
      title: title,
      desc: desc,
      t: 0,
      dur: kind === 'interstitial' ? 1.1 : 2.2,
      onOk: onOk,
      onFail: onFail
    }
  }

  function watchRewarded(reason, onOk, onFail) {
    const meta = {
      revive: { title: '看广告复活', desc: '看完即可继续摆摊' },
      lucky: { title: '幸运掉落', desc: '看完后下一个变成大食材' },
      clear: { title: '消除危机', desc: '看完后清掉最危险的 3 个' },
      boost: { title: '开局好运', desc: '看完后本局开场掉落更大食材' }
    }[reason] || { title: '观看广告', desc: '看完即可获得奖励' }

    bindRewarded()
    if (rewarded) {
      rewarded._cb = { ok: onOk, fail: onFail }
      const play = function () {
        rewarded.show().catch(function () {
          return rewarded.load().then(function () { return rewarded.show() })
        }).catch(function () {
          if (mockAllowed()) {
            startMock(reason, meta.title + '（预览）', '广告位暂不可用，预览模式直接发奖', onOk, onFail)
          } else if (onFail) onFail('广告尚未开通')
        })
      }
      play()
      return
    }

    if (mockAllowed()) {
      startMock(reason, meta.title, meta.desc + '（预览模式）', function () {
        GM.storage.markAd()
        if (onOk) onOk()
      }, onFail)
      return
    }
    if (onFail) onFail('广告尚未开通')
    else if (GM.ui) GM.ui.toast('广告尚未开通')
  }

  function showInterstitial(force) {
    const now = plat.now()
    if (!force && now - lastInterstitial < cfg.interstitialCooldown) return false
    if (!force && (GM.storage.data.games || 0) < 2) return false
    lastInterstitial = now
    bindInterstitial()
    if (interstitial) {
      interstitial.show().catch(function () {
        interstitial.load().then(function () { return interstitial.show() }).catch(function () {})
      })
      return true
    }
    if (!mockAllowed()) return false
    startMock('interstitial', '插屏广告', '预览模式 · 上线后将展示流量主插屏', function () {}, null)
    return true
  }

  function update(dt) {
    const a = mock.active
    if (!a) return
    a.t += dt
    if (a.t >= a.dur) {
      const ok = a.onOk
      mock.active = null
      if (ok) ok()
    }
  }

  function draw(ctx) {
    const w = plat.width
    const h = plat.height
    if (mock.banner && mockAllowed() && !hasId(cfg.ads.banner)) {
      ctx.save()
      ctx.fillStyle = '#fff8ee'
      ctx.fillRect(12, h - 78 - plat.safeBottom, w - 24, 64)
      ctx.strokeStyle = '#c81e2b'
      ctx.strokeRect(12, h - 78 - plat.safeBottom, w - 24, 64)
      ctx.fillStyle = '#c81e2b'
      ctx.font = '13px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Banner 广告位 · 填入 ads.banner 后自动替换', w / 2, h - 42 - plat.safeBottom)
      ctx.restore()
    }

    const a = mock.active
    if (!a) return
    ctx.save()
    ctx.fillStyle = 'rgba(6,4,12,0.78)'
    ctx.fillRect(0, 0, w, h)
    const bw = Math.min(320, w - 40)
    const bh = 210
    const x = (w - bw) / 2
    const y = (h - bh) / 2
    round(ctx, x, y, bw, bh, 18)
    ctx.fillStyle = '#1b1430'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,209,102,0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#ffd166'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(a.title, w / 2, y + 48)
    ctx.fillStyle = 'rgba(255,248,231,0.8)'
    ctx.font = '14px sans-serif'
    ctx.fillText(a.desc, w / 2, y + 82)
    const p = Math.min(1, a.t / a.dur)
    round(ctx, x + 28, y + 118, bw - 56, 12, 6)
    ctx.fillStyle = '#2a2340'
    ctx.fill()
    round(ctx, x + 28, y + 118, (bw - 56) * p, 12, 6)
    ctx.fillStyle = '#ff8a3d'
    ctx.fill()
    ctx.fillStyle = '#fff8e7'
    ctx.font = '13px sans-serif'
    ctx.fillText(a.kind === 'interstitial' ? '即将关闭' : '观看中… 看完自动领奖', w / 2, y + 160)
    ctx.fillStyle = 'rgba(255,248,231,0.45)'
    ctx.font = '12px sans-serif'
    ctx.fillText('点击空白可跳过（仅预览）', w / 2, y + 186)
    ctx.restore()
  }

  function round(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  function onTouchEnd() {
    const a = mock.active
    if (!a) return true
    if (a.kind === 'interstitial' || a.t > 0.35) {
      const ok = a.onOk
      mock.active = null
      if (ok) ok()
    }
    return true
  }

  bindRewarded()
  bindInterstitial()

  return {
    mock: mock,
    watchRewarded: watchRewarded,
    showInterstitial: showInterstitial,
    showBanner: showBanner,
    hideBanner: hideBanner,
    update: update,
    draw: draw,
    onTouchEnd: onTouchEnd,
    realEnabled: realEnabled
  }
})
