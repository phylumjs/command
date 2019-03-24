# @phylum/command
[![Build Status](https://travis-ci.com/phylumjs/command.svg?branch=master)](https://travis-ci.com/phylumjs/command)
[![Coverage Status](https://coveralls.io/repos/github/phylumjs/command/badge.svg?branch=master)](https://coveralls.io/github/phylumjs/command?branch=master)
[![Latest](https://img.shields.io/npm/v/@phylum/command.svg?label=latest) ![License](https://img.shields.io/npm/l/@phylum/command.svg?label=license)](https://npmjs.org/package/@phylum/command)

Configurable command line parser

## Usage
```bash
npm i @phylum/command
```

```ts
import { CommandSpec } from '@phylum/command';

new CommandSpec()
	.add({name: 'foo', multiple: true})
	.add({name: 'bar', alias: 'b' type: 'flag'})
	.parse(['--foo', 'bar', 'baz', '-b']);

// => { foo: ['bar', 'baz'], bar: true }
```

### Command line format
| Format | Output | Spec |
|-|-|-|
| `"--foo bar"` | `{foo: 'bar'}` | `{name: 'foo'}` |
| `"--foo=bar"` | `{foo: 'bar'}` | `{name: 'foo'}` |
| `"--foo bar baz"` | `{foo: ['bar', 'baz']}` | `{name: 'foo', multiple: true}` |
| `"bar baz"` | `{foo: ['bar', 'baz']}` | `{name: 'foo', multiple: true, defaultFallback: true}` |
| `"--foo"` | `{foo: true}` | `{name: 'foo', type: 'flag'}` |
| `"--foo 42"` | `{foo: 42}` | `{name: 'foo', type: number}`
| `"-f bar"` | `{foo: 'bar'}` | `{name: 'foo', alias: 'f'}` |
| `""` | `{foo: 'bar'}` | `{name: 'foo', defaultValue: 'bar'}` |
| `-- bar --baz` | `{foo: ['bar', '--baz']}` | `{name: 'foo', type: 'rest'}` |

## Options

### `options.partial`
If specified, unknown arguments will be ignored instead of throwing an error.
```ts
new CommandSpec()
	.add({name: 'foo'})
	.parse(['--foo', 'bar', '--baz'], {partial: true});

// => { foo: 'bar' }
```

### `options.sparse`
If specified, arguments that follow others may be associated with the default argument.

```ts
new CommandSpec()
	.add({name: 'foo', default: true})
	.add({name: 'bar'})
	.parse(['--bar', 'baz', 'foo'], {sparse: true});

// => { bar: 'baz', foo: 'foo' }
```

<br>



## Packaged Code
| Path | Type | Entry Point |
|-|-|-|
| `/dist/node` | ES2017, CommonJS Modules | `main` |
| `/dist/es2015` | ES2015, ES Modules | `browser` |
| `/dist/es2017` | ES2017, ES Modules | |
| `/src` | TypeScript Sources | |
