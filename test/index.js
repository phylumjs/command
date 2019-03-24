// @ts-check
'use strict';

import test from 'ava';
import { formatUsage, CommandSpec } from '..';

test('format usage', t => {
	t.is(formatUsage({name: 'foo'}), '--foo <string>');
	t.is(formatUsage({name: 'foo', type: 'number'}), '--foo <number>');
	t.is(formatUsage({name: 'foo', alias: 'f'}), '--foo | -f <string>');
	t.is(formatUsage({name: 'foo', alias: 'f', default: true}), '[--foo | -f] <string>');
	t.is(formatUsage({name: 'foo', alias: 'f', multiple: true}), '--foo | -f <...string>');
	t.is(formatUsage({name: 'foo', type: 'flag'}), '--foo');
});

test('parse: single', t => {
	const spec = new CommandSpec([
		{name: 'foo'}
	]);
	t.deepEqual(spec.parse([]), {});
	t.deepEqual(spec.parse(['--foo', 'bar']), {foo: 'bar'});
	t.deepEqual(spec.parse(['--foo=bar']), {foo: 'bar'});
	t.throws(() => spec.parse(['--foo']));
	t.throws(() => spec.parse(['--foo']));
	t.throws(() => spec.parse(['bar']));
});

test('parse: flag', t => {
	const spec = new CommandSpec([
		{name: 'foo', type: 'flag'}
	]);
	t.deepEqual(spec.parse([]), {});
	t.deepEqual(spec.parse(['--foo']), {foo: true});
	t.throws(() => spec.parse(['--foo', 'bar']));
});

test('parse: alias', t => {
	const spec = new CommandSpec([
		{name: 'foo', alias: 'f'}
	]);
	t.deepEqual(spec.parse([]), {});
	t.deepEqual(spec.parse(['-f', 'bar']), {foo: 'bar'});
	t.deepEqual(spec.parse(['--foo', 'bar']), {foo: 'bar'});
});

test('parse: multiple', t => {
	const spec = new CommandSpec([
		{name: 'foo', multiple: true}
	]);
	t.deepEqual(spec.parse(['--foo', 'bar', 'baz']), {foo: ['bar', 'baz']});
});

test('parse: default', t => {
	const spec = new CommandSpec([
		{name: 'bar', type: 'flag'},
		{name: 'foo', default: true}
	]);
	t.deepEqual(spec.parse(['--foo', 'bar']), {foo: 'bar'});
	t.deepEqual(spec.parse(['bar']), {foo: 'bar'});
	t.deepEqual(spec.parse(['--bar', 'bar']), {bar: true, foo: 'bar'});
	t.throws(() => spec.parse(['bar', 'baz']));
});

test('parse: default multiple', t => {
	const spec = new CommandSpec([
		{name: 'bar', type: 'flag'},
		{name: 'foo', default: true, multiple: true}
	]);
	t.deepEqual(spec.parse(['foo', '--bar', 'baz']), {foo: ['foo', 'baz'], bar: true});
	t.deepEqual(spec.parse(['--bar', 'foo', '--foo', 'baz']), {foo: ['foo', 'baz'], bar: true});
});

test('parse: default value', t => {
	const spec = new CommandSpec([
		{name: 'foo', defaultValue: 'bar'}
	]);
	t.deepEqual(spec.parse([]), {foo: 'bar'});
	t.deepEqual(spec.parse(['--foo=baz']), {foo: 'baz'});
});

test('parse: multiple default value', t => {
	const spec = new CommandSpec([
		{name: 'foo', multiple: true, defaultValue: 'bar'}
	]);
	t.deepEqual(spec.parse([]), {foo: ['bar']});
	t.deepEqual(spec.parse(['--foo']), {foo: ['bar']});
	t.deepEqual(spec.parse(['--foo', 'baz', 'bee']), {foo: ['baz', 'bee']});
});
