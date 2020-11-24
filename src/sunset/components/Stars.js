import React, { useEffect, useState } from 'react'
import { randomBetween } from './utils'

export function Stars({ n, width, height, x, y, scrollT }) {
  const [cnt, setCnt] = useState(0)
  const [stars, setStars] = useState(() => {
    return [...Array(n).keys()].map((i) => {
      const cx = randomBetween(0, width)
      const cy = randomBetween(height * 0.5, height * 1.1)
      const cr = Math.random() * 2
      return {
        cx,
        cy,
        cr
      }
    })
  })

  useEffect(() => {
    const mouseListener = ({ clientX: x, clientY: y }) => {
      setCnt(cnt + 1)
    }

    document.addEventListener('mousemove', mouseListener)
    return () => {
      document.removeEventListener('mousemove', mouseListener)
    }
  }, [cnt])

  return (
    <g>
      {stars.map(({ cx, cy, cr }, i) => {
        // the second part of y(*) is based on the scroll,
        // stars closer to us (with a higher r) will move based on the scroll
        return (
          <circle
            key={i}
            cx={x(cx)}
            cy={y(cy - cr * scrollT * 50)}
            r={cr + Math.random()}
            style={{ fill: 'var(--link)' }}
          />
        )
      })}
    </g>
  )
}
