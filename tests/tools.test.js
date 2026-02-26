import test from 'node:test'
import assert from 'node:assert/strict'

import {
	aNodes,
	contains,
	convertToFunctionId,
	deepSetProperty,
	isEqual,
	ms2S,
	parseOptions,
	sDecode,
} from '../tools.js'

test('contains returns true only for included array values', () => {
	assert.equal(contains(['engines', 'nodes'], 'nodes'), true)
	assert.equal(contains(['engines', 'nodes'], 'templates'), false)
	assert.equal(contains(undefined, 'nodes'), false)
})

test('ms2S formats milliseconds under and above ten seconds', () => {
	assert.equal(ms2S(1250), 1.3)
	assert.equal(ms2S(10000), 10)
	assert.equal(ms2S(15499), 16)
})

test('parseOptions maps 3-char keys and fills missing keys with null', () => {
	const parsed = parseOptions('abc123def456', ['abc', 'def', 'ghi'])
	assert.deepEqual(parsed, {
		abc: '123',
		def: '456',
		ghi: null,
	})
})

test('deepSetProperty creates nested paths and sets value', () => {
	const out = {}
	deepSetProperty(out, ['engineA', '/MyNode', 'properties', 'x'], 123)
	assert.deepEqual(out, {
		engineA: {
			'/MyNode': {
				properties: {
					x: 123,
				},
			},
		},
	})
})

test('convertToFunctionId creates expected default function id', () => {
	assert.equal(convertToFunctionId('play next item'), 'Default//PlayNextItem/0')
})

test('aNodes counts nodes across engines and skips #all# bucket', () => {
	const nodes = {
		'#all#': { '/A': {} },
		engine1: { '/A': {}, '/B': {} },
		engine2: { '/A': {} },
	}
	assert.equal(aNodes(nodes), 3)
})

test('sDecode decodes custom replacements from base64 strings', () => {
	const input = Buffer.from('hello/world+', 'utf8')
		.toString('base64')
		.replaceAll('+', '_p')
		.replaceAll('/', '_s')
		.replaceAll('=', '_e')

	assert.equal(sDecode(input), 'hello/world+')
	assert.equal(sDecode(42), undefined)
})

test('isEqual checks deep equality for objects and arrays', () => {
	assert.equal(
		isEqual(
			{ a: 1, b: { c: ['x', 'y'] } },
			{ a: 1, b: { c: ['x', 'y'] } },
		),
		true,
	)
	assert.equal(
		isEqual(
			{ a: 1, b: { c: ['x', 'y'] } },
			{ a: 1, b: { c: ['x', 'z'] } },
		),
		false,
	)
})
