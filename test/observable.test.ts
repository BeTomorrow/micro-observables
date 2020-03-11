import { observable, Observable } from "../src/observable";

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

test("Listeners added with Observable.onChange should be called when value changes", () => {
	const book = observable("The Jungle Book");

	const received: string[] = [];
	const prevReceived: string[] = [];
	book.onChange((newBook, prevBook) => {
		received.push(newBook);
		prevReceived.push(prevBook);
	});
	expect(received).toStrictEqual([]);
	expect(prevReceived).toStrictEqual([]);

	book.set("Pride and Prejudice");
	expect(received).toStrictEqual(["Pride and Prejudice"]);
	expect(prevReceived).toStrictEqual(["The Jungle Book"]);
});

test("Listeners added with Observable.onChange should be removed when calling returned function", () => {
	const book = observable("The Jungle Book");

	const received: string[] = [];
	const addBookToReceived = (newBook: string) => received.push(newBook);
	const unsubscribe1 = book.onChange(addBookToReceived);
	const unsubscribe2 = book.onChange(addBookToReceived);
	expect(received).toStrictEqual([]);

	book.set("Pride and Prejudice");
	expect(received).toStrictEqual(["Pride and Prejudice", "Pride and Prejudice"]);

	unsubscribe1();
	book.set("Hamlet");
	expect(received).toStrictEqual(["Pride and Prejudice", "Pride and Prejudice", "Hamlet"]);

	unsubscribe1();
	book.set("Romeo and Juliet");
	expect(received).toStrictEqual(["Pride and Prejudice", "Pride and Prejudice", "Hamlet", "Romeo and Juliet"]);

	unsubscribe2();
	book.set("Macbeth");
	expect(received).toStrictEqual(["Pride and Prejudice", "Pride and Prejudice", "Hamlet", "Romeo and Juliet"]);
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

	const received: string[] = [];
	author.onChange(newAuthor => received.push(newAuthor));

	book.set({ title: "Pride and Prejudice", author: "Austen" });
	expect(author.get()).toBe("Austen");
	expect(received).toStrictEqual(["Austen"]);

	book.set({ title: "Hamlet", author: "Shakespeare" });
	expect(author.get()).toBe("Shakespeare");
	expect(received).toStrictEqual(["Austen", "Shakespeare"]);
});

test("Observable.onlyOf should create a new observable, keeping only the values that passes the given predicate", () => {
	const counter = observable(0);
	const even = counter.onlyIf(it => it % 2 === 0);
	const odd = counter.onlyIf(it => it % 2 === 1);
	expect(even.get()).toBe(0);
	expect(odd.get()).toBe(undefined);

	const receivedEven: number[] = [];
	const receivedOdd: number[] = [];
	even.onChange(val => receivedEven.push(val!));
	odd.onChange(val => receivedOdd.push(val!));

	counter.update(it => it + 1);
	expect(even.get()).toBe(0);
	expect(odd.get()).toBe(1);
	expect(receivedEven).toStrictEqual([]);
	expect(receivedOdd).toStrictEqual([1]);

	counter.update(it => it + 1);
	expect(even.get()).toBe(2);
	expect(odd.get()).toBe(1);
	expect(receivedEven).toStrictEqual([2]);
	expect(receivedOdd).toStrictEqual([1]);

	counter.update(it => it + 1);
	expect(even.get()).toBe(2);
	expect(odd.get()).toBe(3);
	expect(receivedEven).toStrictEqual([2]);
	expect(receivedOdd).toStrictEqual([1, 3]);
});

test("Observable.compute should create a new observable with the result of the computation applied on the given input values", () => {
	const author = observable("Shakespeare");
	const book = observable("Hamlet");
	const bookWithAuthor = Observable.compute([author, book], (a, b) => ({ title: b, author: a }));
	expect(bookWithAuthor.get()).toStrictEqual({ title: "Hamlet", author: "Shakespeare" });

	book.set("Romeo and Juliet");
	expect(bookWithAuthor.get()).toStrictEqual({ title: "Romeo and Juliet", author: "Shakespeare" });

	author.set("Kipling");
	book.set("The Jungle Book");
	expect(bookWithAuthor.get()).toStrictEqual({ title: "The Jungle Book", author: "Kipling" });
});
