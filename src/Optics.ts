
import { Option, Some, None } from "./Option";

export const optics = <T>(value: T): Optic<T> => {
	return new Optic(value);
};

export class Optic<T> {
	readonly value: Option<T>;

	constructor(value: T) {
		this.value = Option.of(value);
		this.index = this.indexFunc as any;
	}

	public prop<K extends keyof T>(key: K): Optic<NonNullable<T[K]>> {
		const property = this.value.map(value => value[key]);

		if (property.isNone()) {
			return new Optic(undefined) as any;
		}
		return new Optic(property.get()) as Optic<NonNullable<T[K]>>;
	}

	public index: T extends Array<infer I>
		? (index: number) => Optic<I>
		: Optic<undefined>

	private indexFunc<I>(index: number): Optic<I> {
		const indexValue = this.value.map((value: any) => value[index]) as Option<I>;
		if (indexValue.isNone()) {
			return new Optic(undefined as any);
		}
		return new Optic(indexValue.get());
	};

	public get(): Option<T> {
		return this.value;
	}

}

