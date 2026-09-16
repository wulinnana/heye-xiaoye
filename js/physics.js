GameGlobal.GameReg('physics', function () {
  function radius(type, boxW) {
    return boxW * (0.118 + type * 0.019)
  }

  function makeBody(x, y, type, boxW, maxType) {
    const r = radius(type, boxW, maxType)
    return {
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      r: r,
      type: type,
      mass: r * r,
      rot: (Math.random() - 0.5) * 0.4,
      spin: 0,
      pop: 0.85,
      live: false,
      over: 0,
      lock: 0,
      id: Math.random().toString(36).slice(2)
    }
  }

  function step(world, dt) {
    const events = []
    const bodies = world.bodies
    const g = world.gravity || 1550
    const maxType = world.maxType || 7

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i]
      if (b.held) continue
      b.vy += g * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.vx *= Math.max(0, 1 - 0.35 * dt)
      b.rot += b.spin * dt
      b.spin *= Math.max(0, 1 - 1.6 * dt)
      if (b.pop < 1) b.pop = Math.min(1, b.pop + dt * 5)
      if (b.lock > 0) b.lock -= dt

      if (b.y + b.r > world.floor) {
        b.y = world.floor - b.r
        if (b.vy > 0) {
          if (b.vy > 60) b.live = true
          b.vy *= -0.12
          b.vx *= 0.82
        }
        if (Math.abs(b.vy) < 24) b.vy = 0
      }
      if (b.x - b.r < world.left) {
        b.x = world.left + b.r
        b.vx = Math.abs(b.vx) * 0.2
        b.live = true
      }
      if (b.x + b.r > world.right) {
        b.x = world.right - b.r
        b.vx = -Math.abs(b.vx) * 0.2
        b.live = true
      }
    }

    const used = {}
    const merges = []

    function findMerges() {
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i]
        if (a.held || used[a.id]) continue
        for (let j = i + 1; j < bodies.length; j++) {
          const b = bodies[j]
          if (b.held || used[b.id]) continue
          if (a.type !== b.type) continue
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < (a.r + b.r) * 1.28) {
            used[a.id] = true
            used[b.id] = true
            merges.push([a, b])
          }
        }
      }
    }

    function applyMerges() {
      let n = 0
      for (let i = 0; i < merges.length; i++) {
        const a = merges[i][0]
        const b = merges[i][1]
        const ai = bodies.indexOf(a)
        const bi = bodies.indexOf(b)
        if (ai < 0 || bi < 0) continue
        const nx = (a.x + b.x) / 2
        const ny = (a.y + b.y) / 2
        const nextType = a.type + 1
        bodies.splice(Math.max(ai, bi), 1)
        bodies.splice(Math.min(ai, bi), 1)
        n += 1
        if (nextType <= maxType) {
          const nb = makeBody(nx, ny, nextType, world.boxW, maxType)
          nb.live = true
          nb.pop = 1
          nb.lock = 0
          nb.vy = -8
          bodies.push(nb)
          events.push({ kind: 'merge', x: nx, y: ny, type: nextType, body: nb })
        } else {
          events.push({ kind: 'burst', x: nx, y: ny, type: a.type })
        }
      }
      merges.length = 0
      for (const k in used) delete used[k]
      return n
    }

    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i]
        if (a.held) continue
        for (let j = i + 1; j < bodies.length; j++) {
          const b = bodies[j]
          if (b.held) continue
          let dx = b.x - a.x
          let dy = b.y - a.y
          let dist = Math.sqrt(dx * dx + dy * dy)
          const min = a.r + b.r
          if (dist < 0.0001) {
            dx = 0.01
            dy = 0
            dist = 0.01
          }
          if (a.type === b.type) continue
          if (dist >= min) continue
          const nx = dx / dist
          const ny = dy / dist
          a.live = true
          b.live = true
          const overlap = min - dist
          const m = a.mass + b.mass
          a.x -= nx * overlap * (b.mass / m)
          a.y -= ny * overlap * (b.mass / m)
          b.x += nx * overlap * (a.mass / m)
          b.y += ny * overlap * (a.mass / m)
          const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
          if (rvn < 0) {
            const impulse = -1.05 * rvn / (1 / a.mass + 1 / b.mass)
            a.vx -= impulse * nx / a.mass
            a.vy -= impulse * ny / a.mass
            b.vx += impulse * nx / b.mass
            b.vy += impulse * ny / b.mass
          }
        }
      }
    }

    for (let c = 0; c < 6; c++) {
      findMerges()
      if (!applyMerges()) break
    }

    return events
  }

  return { radius: radius, makeBody: makeBody, step: step }
})
