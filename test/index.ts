
import test from 'ava';
import { CommandSpec, formatUsage } from '../src';

test('format usage', t => {
	t.is(formatUsage({name: 'foo'}), '--foo <string>');
	t.is(formatUsage({name: 'foo', type: function bar() {}}), '--foo <bar>');
	t.is(formatUsage({name: 'foo', type: Object.assign(() => {}, {displayName: 'bar'})}), '--foo <bar>');
	t.is(formatUsage({name: 'foo', type: 'number'}), '--foo <number>');
	t.is(formatUsage({name: 'foo', alias: 'f'}), '--foo | -f <string>');
	t.is(formatUsage({name: 'foo', alias: 'f', defaultFallback: true}), '[--foo | -f] <string>');
	t.is(formatUsage({name: 'foo', alias: 'f', multiple: true}), '--foo | -f <...string>');
	t.is(formatUsage({name: 'foo', type: 'flag'}), '--foo');
	t.is(formatUsage({name: 'foo', type: 'rest'}), '-- <...>');
});

test('add: validate', t => {
	t.throws(() => new CommandSpec().add({name: 'bar', type: 'flag', multiple: true}));
	t.throws(() => new CommandSpec().add({name: 'bar', type: 'flag', defaultFallback: true}));
	t.throws(() => new CommandSpec().add({name: 'bar', type: 'rest', multiple: true}));
	t.throws(() => new CommandSpec().add({name: 'bar', type: 'rest', defaultFallback: true}));
	t.throws(() => new CommandSpec().add({name: ''}));
	t.throws(() => new CommandSpec().add({name: 'foo', alias: 'bar'}));
	t.throws(() => new CommandSpec().add({name: 'foo', alias: '-'}));
});

test('add: test for duplicates', t => {
	const spec = new CommandSpec().add({name: 'foo', alias: 'f'});
	t.throws(() => spec.add({name: 'foo'}));
	t.throws(() => spec.add({name: 'bar', alias: 'f'}));
	t.throws(() => new CommandSpec()
		.add({name: 'foo', defaultFallback: true})
		.add({name: 'bar', defaultFallback: true}));
	t.throws(() => new CommandSpec()
		.add({name: 'foo', type: 'rest'})
		.add({name: 'bar', type: 'rest'}));
});

test('iterable', t => {
	const spec = new CommandSpec().add({name: 'foo'});
	t.deepEqual(Array.from(spec), [{name: 'foo'}]);
});

test('parse: assert options', t => {
	const spec = new CommandSpec();
	t.throws(() => spec.parse([], {sparse: true, partial: true}));
});

test('parse: empty', t => {
	t.deepEqual(new CommandSpec().parse([]), {});
})

test('parse: single', t => {
	const spec = new CommandSpec([
		{name: 'foo'}
	]);
	t.deepEqual(spec.parse([]), {});
	t.deepEqual(spec.parse(['--foo', 'bar']), {foo: 'bar'});
	t.deepEqual(spec.parse(['--foo=bar']), {foo: 'bar'});
	t.throws(() => spec.parse(['--foo']));
	t.throws(() => spec.parse(['--bar']));
	t.throws(() => spec.parse(['bar']));
	t.throws(() => spec.parse(['--foo', 'bar', '--foo', 'baz']));
});

test('parse: flag', t => {
	const spec = new CommandSpec([
		{name: 'foo', type: 'flag'}
	]);
	t.deepEqual(spec.parse([]), {});
	t.deepEqual(spec.parse(['--foo']), {foo: true});
	t.throws(() => spec.parse(['--foo', 'bar']));
	t.throws(() => spec.parse(['--foo=bar']));
	t.throws(() => spec.parse(['--foo', '--foo']));
});

test('parse: number', t => {
	const spec = new CommandSpec([
		{name: 'foo', type: 'number'}
	]);
	t.deepEqual(spec.parse(['--foo', '42']), {foo: 42});
	t.throws(() => spec.parse(['--foo', 'foo']));
});

test('parse: rest', t => {
	const spec = new CommandSpec([
		{name: 'foo', type: 'rest'}
	]);
	t.deepEqual(spec.parse([]), {});
	t.deepEqual(spec.parse(['--']), {foo: []});
	t.deepEqual(spec.parse(['--', 'foo', '--bar']), {foo: ['foo', '--bar']});
	t.throws(() => spec.parse(['--foo', 'bar']));
	t.throws(() => new CommandSpec([]).parse(['--']));
});

test('parse: alias', t => {
	const spec = new CommandSpec([
		{name: 'foo', alias: 'f'},
		{name: 'bar', alias: 'b', type: 'flag'},
		{name: 'baz', alias: 'z', type: 'flag'}
	]);
	t.deepEqual(spec.parse([]), {});
	t.deepEqual(spec.parse(['-f', 'bar']), {foo: 'bar'});
	t.deepEqual(spec.parse(['-b']), {bar: true});
	t.deepEqual(spec.parse(['-bz']), {bar: true, baz: true});
	t.throws(() => spec.parse(['-']));
	t.throws(() => spec.parse(['-fx', 'bar']));
	t.throws(() => spec.parse(['-bf', 'bar']));
	t.throws(() => spec.parse(['-bf']));
	t.throws(() => spec.parse(['-f=bar']));
	t.throws(() => spec.parse(['-bb']));
	t.throws(() => spec.parse(['-b', '-b']));
	t.throws(() => spec.parse(['-x']));
});

test('parse: multiple', t => {
	const spec = new CommandSpec([
		{name: 'foo', multiple: true}
	]);
	t.deepEqual(spec.parse(['--foo', 'bar', 'baz']), {foo: ['bar', 'baz']});
});

test('parse: default fallback', t => {
	const spec = new CommandSpec([
		{name: 'bar', alias: 'b', type: 'flag'},
		{name: 'foo', defaultFallback: true}
	]);
	t.deepEqual(spec.parse([]), {});
	t.deepEqual(spec.parse(['--foo', 'bar']), {foo: 'bar'});
	t.deepEqual(spec.parse(['bar']), {foo: 'bar'});
	t.throws(() => spec.parse(['bar', 'baz']));
	t.throws(() => spec.parse(['--bar', 'foo']));
});

test('parse: default fallback multiple', t => {
	const spec = new CommandSpec([
		{name: 'bar'},
		{name: 'baz', type: 'flag'},
		{name: 'foo', defaultFallback: true, multiple: true}
	]);
	t.deepEqual(spec.parse(['foo', 'bar']), {foo: ['foo', 'bar']});
	t.throws(() => spec.parse(['foo', '--bar', 'bar', 'baz']));
	t.throws(() => spec.parse(['foo', '--baz', 'baz']));
});

test('parse: default fallback sparse', t => {
	const spec = new CommandSpec([
		{name: 'bar'},
		{name: 'baz', alias: 'z', type: 'flag'},
		{name: 'bee', alias: 'e', type: 'flag'},
		{name: 'foo', defaultFallback: true, multiple: true}
	]);
	t.deepEqual(spec.parse(['foo', '--bar', 'bar', 'baz'], {sparse: true}), {foo: ['foo', 'baz'], bar: 'bar'});
	t.deepEqual(spec.parse(['foo', '--baz', 'baz'], {sparse: true}), {foo: ['foo', 'baz'], baz: true});
	t.deepEqual(spec.parse(['-z', 'foo', 'bar'], {sparse: true}), {baz: true, foo: ['foo', 'bar']});
	t.deepEqual(spec.parse(['-ze', 'foo'], {sparse: true}), {baz: true, bee: true, foo: ['foo']});
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

test('partial: single', t => {
	const spec = new CommandSpec([
		{name: 'foo'}
	]);
	t.deepEqual(spec.parse([], {partial: true}), {});
	t.deepEqual(spec.parse(['--foo', 'bar'], {partial: true}), {foo: 'bar'});
	t.deepEqual(spec.parse(['--foo', 'bar', 'baz'], {partial: true}), {foo: 'bar'});
	t.deepEqual(spec.parse(['--bar', '--foo', 'bar', 'baz'], {partial: true}), {foo: 'bar'});
});

test('partial: aliases', t => {
	const spec = new CommandSpec([
		{name: 'foo', alias: 'f', type: 'flag'},
		{name: 'bar', alias: 'b', multiple: true}
	]);
	t.deepEqual(spec.parse(['-fx'], {partial: true}), {foo: true});
	t.deepEqual(spec.parse(['-b', 'a', '--bar', 'b']), {bar: ['a', 'b']});
	t.throws(() => spec.parse(['-bx'], {partial: true}));
});

test('partial: flag', t => {
	const spec = new CommandSpec([
		{name: 'foo', type: 'flag'}
	]);
	t.deepEqual(spec.parse([], {partial: true}), {});
	t.deepEqual(spec.parse(['--foo', 'bar'], {partial: true}), {foo: true});
	t.deepEqual(spec.parse(['--foo', 'bar', 'baz'], {partial: true}), {foo: true});
	t.deepEqual(spec.parse(['--bar', '--foo', 'bar', 'baz'], {partial: true}), {foo: true});
});

test('partial: rest', t => {
	const spec = new CommandSpec([
		{name: 'foo', type: 'rest'}
	]);
	t.deepEqual(spec.parse(['--', 'foo', '--bar'], {partial: true}), {foo: ['foo', '--bar']});
	t.deepEqual(new CommandSpec().parse(['--', 'foo', '--bar'], {partial: true}), {});
});

test('partial: multiple', t => {
	const spec = new CommandSpec([
		{name: 'foo', multiple: true}
	]);
	t.deepEqual(spec.parse([], {partial: true}), {});
	t.deepEqual(spec.parse(['--foo', 'bar', 'baz'], {partial: true}), {foo: ['bar', 'baz']});
	t.deepEqual(spec.parse(['bee', '--foo', 'bar', 'baz'], {partial: true}), {foo: ['bar', 'baz']});
	t.deepEqual(spec.parse(['--foo', 'bar', 'baz', '--bar', 'bee'], {partial: true}), {foo: ['bar', 'baz']});
});
