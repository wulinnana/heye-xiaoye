var G = typeof GameGlobal !== 'undefined' ? GameGlobal : window
G.GM = G.GM || {}
G.GameReg = function (name, fn) {
  G.GM[name] = fn(G.GM)
}
