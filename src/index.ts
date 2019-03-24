
export interface ArgumentSpec {
	readonly name: string;
	readonly alias?: string;
	readonly type?: ArgumentType;
	readonly defaultValue?: string | number | boolean;

	// Must not be specified if type is 'flag':
	readonly multiple?: boolean;
	readonly default?: boolean;
}

export type ArgumentType = 'string' | 'number' | 'flag';

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
	private readonly _defaulted = new Set<ArgumentSpec>();
	private _default: ArgumentSpec;

	public add(spec: ArgumentSpec) {
		if (spec.type === 'flag' && (spec.multiple || spec.default)) {
			throw new TypeError(`spec.multiple and spec.default can not be used with type "flag".`);
		}
		if (this._names.has(spec.name)) {
			throw new TypeError(`spec.name is already used: "${spec.name}"`);
		}
		if (spec.alias && this._aliases.has(spec.alias)) {
			throw new TypeError(`spec.alias is already used: "${spec.alias}"`);
		}
		if (spec.default && this._default) {
			throw new TypeError(`spec.default can only be used by one spec.`);
		}
		this._names.set(spec.name, spec);
		if (spec.alias) {
			this._aliases.set(spec.alias, spec);
		}
		if ('defaultValue' in spec) {
			this._defaulted.add(spec);
		}
		if (spec.default) {
			this._default = spec;
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

		let spec: ArgumentSpec = this._default;
		const command: Command = {};

		const setValue = (value: string) => {
			if (spec.multiple) {
				(command[spec.name] || (command[spec.name] = [])).push(parseValue(value, spec.type));
			} else if (spec.name in command) {
				throw new CommandError(`Duplicate argument: ${formatUsage(spec)}`);
			} else {
				command[spec.name] = parseValue(value, spec.type);
				spec = sparse ? this._default : null;
			}
		};

		for (const arg of argv) {
			const token = /^(?:--([^=]+)|-([^=]))(?:=(.*))?/.exec(arg);
			if (token) {
				const [, name, alias, value] = token;
				spec = name ? this._names.get(name) : this._aliases.get(alias);
				if (spec) {
					if (spec.type === 'flag') {
						if (value) {
							throw new CommandError(`Flags must not have a value: ${formatUsage(spec)}`);
						} else if (spec.name in command) {
							throw new CommandError(`Duplicate flag: ${formatUsage(spec)}`);
						} else {
							command[spec.name] = true;
							spec = sparse ? this._default : null;
						}
					} else if (value) {
						setValue(value);
					}
				} else if (!partial) {
					throw new CommandError(`Unknown argument: "${arg}"`);
				}
			} else if (spec) {
				setValue(arg);
			} else if (!partial) {
				throw new CommandError(`Unexpected argument: "${arg}"`);
			}
		}
		if (spec && !spec.multiple && !(spec.name in command)) {
			throw new CommandError(`Missing value: ${formatUsage(spec)}`);
		}
		for (const spec of this._defaulted) {
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
	const nameAndAlias = `--${spec.name}${spec.alias ? ` | -${spec.alias}` : ''}`;
	const scope = spec.default ? `[${nameAndAlias}]` : nameAndAlias;
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
