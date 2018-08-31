
import { Option, Some, None } from "./Option";

export const optics = <T>(value: T): Optic<T> => {
  return new Optic(value);
};

export class Optic<T> {
	private value: Option<T>;
	
  constructor(value: T) {
    this.value = Option.of(value);
	}

  public prop<K extends keyof T>(key: K): Optic<NonNullable<T[K]>> {
		const property = this.value.map(value => value[key]);

		if (property.isNone()) {
			return new Optic(undefined) as any;
		} 
		return new Optic(property.get()) as any;
  }

  /*public index: T extends Array<infer I> // tslint:disable-line
    ? (index: number) => Optic<I>
    : Optic<undefined>;*/

  public get(): Option<T> {
    return this.value;
  }

}

/*Optic.prototype.index = function<U>(index: number): Optic<U> {
  if (this.value[index] === undefined) {
    return new Optic(undefined as any);
  }
  return new Optic(this.value[index]);
};*/