
export interface ArgumentSpec {
	/**
	 * The argument name.
	 * Must be at least one char.
	 */
	readonly name: string;
	/**
	 * The argument alias.
	 * Must be exactly one char.
	 */
	readonly alias?: string;
	/**
	 * The argument type.
	 */
	readonly type?: ArgumentType;
	/**
	 * The default value.
	 */
	readonly defaultValue?: string | number | boolean;
	/**
	 * If set, multiple values are allowed.
	 * Can not be used with type "flag" or "rest".
	 */
	readonly multiple?: boolean;
	/**
	 * If set, this argument can be used without the name.
	 * Can not be used with type "flag" or "rest".
	 */
	readonly defaultFallback?: boolean;
}

export type ArgumentType = 'string' | 'number' | 'flag' | 'rest';

export type Command = {[Name in string]: any};

export interface ArgumentOptions {
	readonly sparse?: boolean;
	readonly partial?: boolean;
}

export class CommandSpec implements Iterable<ArgumentSpec> {
	public constructor(specs?: Iterable<ArgumentSpec>) {
		if (specs) {
			for (const spec of specs) {
				this.add(spec);
			}
		}
	}

	private readonly _specs = new Set<ArgumentSpec>();
	private readonly _names = new Map<string, ArgumentSpec>();
	private readonly _aliases = new Map<string, ArgumentSpec>();
	private readonly _defaultValues = new Set<ArgumentSpec>();
	private _defaultFallback: ArgumentSpec;
	private _rest: ArgumentSpec;

	public add(spec: ArgumentSpec) {
		// Validate:
		if (spec.name.length < 1) {
			throw new TypeError(`spec.name must have at least one character.`);
		}
		if (spec.alias && spec.alias.length !== 1) {
			throw new TypeError(`spec.alias must be exactly one character.`);
		}
		if (spec.alias === '-') {
			throw new TypeError(`spec.alias must not be "-"`);
		}
		if ((spec.type === 'flag' || spec.type === 'rest') && (spec.multiple || spec.defaultFallback)) {
			throw new TypeError(`spec.multiple and spec.defaultFallback can not be used with type "flag" or "rest".`);
		}

		// Test for duplicates:
		if (this._names.has(spec.name)) {
			throw new TypeError(`spec.name is already used: "${spec.name}"`);
		}
		if (spec.alias && this._aliases.has(spec.alias)) {
			throw new TypeError(`spec.alias is already used: "${spec.alias}"`);
		}
		if (spec.defaultFallback && this._defaultFallback) {
			throw new TypeError(`spec.defaultFallback can only be used by one spec.`);
		}
		if (spec.type === 'rest' && this._rest) {
			throw new TypeError(`type "rest" can only be used by one argument.`);
		}

		// Apply:
		this._names.set(spec.name, spec);
		if (spec.alias) {
			this._aliases.set(spec.alias, spec);
		}
		if ('defaultValue' in spec) {
			this._defaultValues.add(spec);
		}
		if (spec.defaultFallback) {
			this._defaultFallback = spec;
		}
		if (spec.type === 'rest') {
			this._rest = spec;
		}
		this._specs.add(spec);
		return this;
	}

	public [Symbol.iterator]() {
		return this._specs[Symbol.iterator]();
	}

	public parse(argv: string[], {sparse, partial}: ArgumentOptions = {}): Command {
		if (partial && sparse) {
			throw new TypeError('options.partial can not be used with options.sparse');
		}

		let spec: ArgumentSpec = this._defaultFallback;
		const command: Command = {};

		const setValue = (value: string) => {
			if (spec.multiple) {
				(command[spec.name] || (command[spec.name] = [])).push(parseValue(value, spec.type));
			} else if (spec.name in command) {
				throw new CommandError(`Duplicate argument: ${formatUsage(spec)}`);
			} else {
				command[spec.name] = parseValue(value, spec.type);
				spec = sparse ? this._defaultFallback : null;
			}
		};

		for (let i = 0; i < argv.length; i++) {
			const arg = argv[i];
			const token = /^(?:--([^=]+)|-([^=\-]))(?:=(.*))?/.exec(arg);
			if (token) {
				const [, name, alias, value] = token;
				spec = name ? this._names.get(name) : this._aliases.get(alias);
				if (spec && spec.type !== 'rest') {
					if (spec.type === 'flag') {
						if (value) {
							throw new CommandError(`Flags must not have a value: ${formatUsage(spec)}`);
						} else if (spec.name in command) {
							throw new CommandError(`Duplicate flag: ${formatUsage(spec)}`);
						} else {
							command[spec.name] = true;
							spec = sparse ? this._defaultFallback : null;
						}
					} else if (value) {
						setValue(value);
					}
				} else if (!partial) {
					throw new CommandError(`Unknown argument: "${arg}"`);
				}
			} else if (arg === '--') {
				spec = this._rest;
				if (spec) {
					command[spec.name] = argv.slice(i + 1);
					i = argv.length;
				} else if (partial) {
					i = argv.length;
				} else {
					throw new CommandError(`Unexpected rest arguments.`);
				}
			} else if (spec) {
				setValue(arg);
			} else if (!partial) {
				throw new CommandError(`Unexpected argument: "${arg}"`);
			}
		}
		if (spec) {
			if (spec.type !== 'rest' && !spec.multiple && !(spec.name in command)) {
				throw new CommandError(`Missing value: ${formatUsage(spec)}`);
			}
		}
		for (const spec of this._defaultValues) {
			if (!(spec.name in command)) {
				command[spec.name] = spec.multiple ? [spec.defaultValue] : spec.defaultValue;
			}
		}
		return command;
	}
}

export function parseValue(value: string, type: ArgumentType) {
	if (type === 'number') {
		return Number(value);
	}
	return value;
}

export function formatUsage(spec: ArgumentSpec) {
	if (spec.type === 'rest') {
		return '-- <...>';
	}
	const nameAndAlias = `--${spec.name}${spec.alias ? ` | -${spec.alias}` : ''}`;
	const scope = spec.defaultFallback ? `[${nameAndAlias}]` : nameAndAlias;
	const type = spec.type || 'string';
	if (spec.multiple) {
		return `${scope} <...${type}>`;
	} else if (spec.type === 'flag') {
		return `${scope}`;
	} else {
		return `${scope} <${type}>`;
	}
}

export class CommandError extends TypeError {
	public constructor(message: string) {
		super(message);
	}

	public get name() {
		return 'CommandError';
	}
}
