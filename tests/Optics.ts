// import { Option, Some, None } from "../src/Option";
import { optics, Optic } from "../src/Optics";

import * as assert from 'assert'

interface Person {
	name: string
	address?: Address
}

interface Address {
	city: string
	street: string
	number?: number
}

const ricardo: Person = {
	name: "Ricardo"
}

const emmanuel: Person = {
	name: "Emmanuel",
	address: {
		city: "Maribor",
		street: "Fake Street"
	}
}

const opticsRicardo = optics(ricardo)
const opticsEmmanuel = optics(emmanuel)

describe("Optics can get props", () => {
	it("should return Option when getting existing property", () => {
		assert(opticsRicardo.prop("name") instanceof Optic)
	})

	it("should return Option when getting undefined property ", () => {
		assert(opticsRicardo.prop("address") instanceof Optic)
	})

	it("should return Some when getting existing property", () => {
		assert(opticsRicardo.prop("name").get().isSome())
	})

	it("should return None when getting existing property", () => {
		assert(opticsRicardo.prop("address").get().isNone())
	})

	it("should return Some with the actual value when getting existing property", () => {
		assert( opticsEmmanuel.prop("address").prop("city").get().getOrNull() === "Maribor")
	})
});

