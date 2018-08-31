
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

  public get(): Option<T> {
    return this.value;
  }

}
