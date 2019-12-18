import { observable, Observable } from "./observable";

test("Observable.get should return initial value", () => {
	const book = observable("The Jungle Book");
	expect(book.get()).toBe("The Jungle Book");
});

test("Observable.set should override current value", () => {
	const book = observable("The Jungle Book");
	book.set("Pride and Prejudice");
	expect(book.get()).toBe("Pride and Prejudice");
});

test("Observable.update should override current value, using current value", () => {
	const books = observable(["The Jungle Book"]);
	books.update(it => [...it, "Pride and Prejudice"]);
	expect(books.get()).toStrictEqual(["The Jungle Book", "Pride and Prejudice"]);
});

test("Listeners added with Observable.subscribe should be called when value changes", () => {
	const book = observable("The Jungle Book");

	const received: string[] = [];
	const unsubscribe = book.subscribe(newBook => received.push(newBook));
	expect(received).toStrictEqual([]);

	book.set("Pride and Prejudice");
	expect(received).toStrictEqual(["Pride and Prejudice"]);

	unsubscribe();
	book.set("Hamlet");
	expect(received).toStrictEqual(["Pride and Prejudice"]);
});

test("Observable.readOnly should not change value contained in observable", () => {
	const book = observable("The Jungle Book");
	const readOnlyBook = book.readOnly();
	expect(readOnlyBook.get()).toBe("The Jungle Book");

	book.set("Pride and Prejudice");
	expect(readOnlyBook.get()).toBe("Pride and Prejudice");
});

test("Observable.transform should create a new observable with the result of the transform applied on the current value", () => {
	const book = observable({ title: "The Jungle Book", author: "Kipling" });
	const author = book.transform(it => it.author);
	expect(author.get()).toBe("Kipling");

	book.set({ title: "Hamlet", author: "Shakespeare" });
	expect(author.get()).toBe("Shakespeare");
});

test("Observable.onlyOf should create a new observable, keeping only the values that passes the given predicate", () => {
	const counter = observable(0);
	const even = counter.onlyIf(it => it % 2 === 0);
	const odd = counter.onlyIf(it => it % 2 === 1);
	expect(even.get()).toBe(0);
	expect(odd.get()).toBe(undefined);

	counter.update(it => it + 1);
	expect(even.get()).toBe(0);
	expect(odd.get()).toBe(1);

	counter.update(it => it + 1);
	expect(even.get()).toBe(2);
	expect(odd.get()).toBe(1);
});

test("Observable.compute should create a new observable with the result of the computation applied on the given input values", () => {
	const author = observable("Shakespeare");
	const book = observable("Hamlet");
	const bookWithAuthor = Observable.compute([author, book],
		(a, b) => ({ title: b, author: a })
	);
	expect(bookWithAuthor.get()).toStrictEqual({ title: "Hamlet", author: "Shakespeare" });

	book.set("Romeo and Juliet");
	expect(bookWithAuthor.get()).toStrictEqual({ title: "Romeo and Juliet", author: "Shakespeare" });

	author.set("Kipling");
	book.set("The Jungle Book");
	expect(bookWithAuthor.get()).toStrictEqual({ title: "The Jungle Book", author: "Kipling" });
});
