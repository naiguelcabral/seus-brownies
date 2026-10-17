import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import ThemeToggle from '../src/components/ThemeToggle'
import Footer from '../src/components/Footer'

test('theme SSR uses the stable automatic snapshot without browser globals', () => {
  assert.equal(typeof window, 'undefined')
  const first = renderToString(createElement(ThemeToggle))
  const second = renderToString(createElement(ThemeToggle))
  assert.equal(first, second)
  assert.match(first, />Auto<\/button>/)
  assert.match(first, /Theme mode: auto/)
})

test('footer SSR retains the current year without requiring a browser', () => {
  const html = renderToString(createElement(Footer))
  assert.ok(html.includes(String(new Date().getFullYear())))
  assert.match(html, /Cacau/)
})
