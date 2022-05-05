import { observable, Observable } from "../src/observable";

test("Observable.get() should return initial value", () => {
  const book = observable("The Jungle Book");
  expect(book.get()).toBe("The Jungle Book");
});

test("Observable.set() should change observable's value", () => {
  const book = observable("The Jungle Book");
  book.set("Pride and Prejudice");
  expect(book.get()).toBe("Pride and Prejudice");
});

test("Observable's value should change when input observable changes", () => {
  const book1 = observable("The Jungle Book");
  const book2 = observable(book1);
  expect(book1.get()).toBe("The Jungle Book");
  expect(book2.get()).toBe("The Jungle Book");
  book1.set("Pride and Prejudice");
  expect(book1.get()).toBe("Pride and Prejudice");
  expect(book2.get()).toBe("Pride and Prejudice");
});

test("Observable.update() should change observable's value, using current value", () => {
  const books = observable(["The Jungle Book"]);
  books.update(it => [...it, "Pride and Prejudice"]);
  expect(books.get()).toStrictEqual(["The Jungle Book", "Pride and Prejudice"]);
});

test("Listeners added with Observable.subscribe() should be called when value changes", () => {
  const book = observable("The Jungle Book");

  const received: string[] = [];
  const prevReceived: string[] = [];
  book.subscribe((newBook, prevBook) => {
    received.push(newBook);
    prevReceived.push(prevBook);
  });
  expect(received).toStrictEqual([]);
  expect(prevReceived).toStrictEqual([]);

  book.set("Pride and Prejudice");
  expect(received).toStrictEqual(["Pride and Prejudice"]);
  expect(prevReceived).toStrictEqual(["The Jungle Book"]);
});

test("Listeners added with Observable.subscribe() should be removed when calling returned function", () => {
  const book = observable("The Jungle Book");

  const received: string[] = [];
  const addBookToReceived = (newBook: string) => received.push(newBook);
  const unsubscribe1 = book.subscribe(addBookToReceived);
  const unsubscribe2 = book.subscribe(addBookToReceived);
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

test("Listeners can be removed as soon as they are invoked without preventing other listeners to be invoked", () => {
  const book = observable("The Jungle Book");

  const received: string[] = [];
  const addBookToReceived = (newBook: string) => received.push(newBook);
  const unsubscribe1 = book.subscribe(newBook => {
    addBookToReceived(newBook);
    unsubscribe1();
  });
  const unsubscribe2 = book.subscribe(addBookToReceived);
  expect(received).toStrictEqual([]);

  book.set("Pride and Prejudice");
  expect(received).toStrictEqual(["Pride and Prejudice", "Pride and Prejudice"]);

  book.set("Hamlet");
  expect(received).toStrictEqual(["Pride and Prejudice", "Pride and Prejudice", "Hamlet"]);

  unsubscribe2();
  book.set("Romeo and Juliet");
  expect(received).toStrictEqual(["Pride and Prejudice", "Pride and Prejudice", "Hamlet"]);
});

test("Observable.select() should create a new observable with the result of the transform applied on the current value", () => {
  const book = observable({ title: "The Jungle Book", author: "Kipling" });
  const author = book.select(it => it.author);
  expect(author.get()).toBe("Kipling");

  const received: string[] = [];
  author.subscribe(newAuthor => received.push(newAuthor));

  book.set({ title: "Pride and Prejudice", author: "Austen" });
  expect(author.get()).toBe("Austen");
  expect(received).toStrictEqual(["Austen"]);

  book.set({ title: "Hamlet", author: "Shakespeare" });
  expect(author.get()).toBe("Shakespeare");
  expect(received).toStrictEqual(["Austen", "Shakespeare"]);
});

test("Observable.select() should accept a function returning another observable", () => {
  const books = [observable("The Jungle Book"), observable("Pride and Prejudice")];
  const selectedIndex = observable(0);
  const selectedBook = selectedIndex.select(it => books[it]);
  expect(selectedBook.get()).toStrictEqual("The Jungle Book");

  const received: string[] = [];
  selectedBook.subscribe(b => received.push(b));
  books[0].set("Hamlet");
  selectedIndex.set(1);
  books[1].set("Romeo and Juliet");
  expect(received).toStrictEqual(["Hamlet", "Pride and Prejudice", "Romeo and Juliet"]);
});

test("Observable.onlyOf() should create a new observable, keeping only the values that passes the given predicate", () => {
  const counter = observable(0);
  const even = counter.onlyIf(it => it % 2 === 0);
  const odd = counter.onlyIf(it => it % 2 === 1);
  expect(even.get()).toBe(0);
  expect(odd.get()).toBe(undefined);

  const receivedEven: number[] = [];
  const receivedOdd: number[] = [];
  even.subscribe(val => receivedEven.push(val!));
  odd.subscribe(val => receivedOdd.push(val!));

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

test("Observable.select() should create a new observable with the result of the computation applied on the given input values", () => {
  const author = observable("Shakespeare");
  const title = observable("Hamlet");
  const bookWithAuthor = Observable.select([author, title], (a, t) => ({
    author: a,
    title: t,
  }));
  expect(bookWithAuthor.get()).toStrictEqual({ author: "Shakespeare", title: "Hamlet" });

  title.set("Romeo and Juliet");
  expect(bookWithAuthor.get()).toStrictEqual({ author: "Shakespeare", title: "Romeo and Juliet" });

  author.set("Kipling");
  title.set("The Jungle Book");
  expect(bookWithAuthor.get()).toStrictEqual({ author: "Kipling", title: "The Jungle Book" });
});

test("Observable.from() should create a new observable containing an array with the values from the given observables", () => {
  const book1 = observable("The Jungle Book");
  const book2 = observable("Pride and Prejudice");
  const books = Observable.from(book1, book2);
  expect(books.get()).toStrictEqual(["The Jungle Book", "Pride and Prejudice"]);

  const received: [string, string][] = [];
  books.subscribe(val => received.push(val));

  book1.set("Romeo and Juliet");
  expect(books.get()).toStrictEqual(["Romeo and Juliet", "Pride and Prejudice"]);
  expect(received).toStrictEqual([["Romeo and Juliet", "Pride and Prejudice"]]);

  book2.set("Hamlet");
  expect(books.get()).toStrictEqual(["Romeo and Juliet", "Hamlet"]);
  expect(received).toStrictEqual([
    ["Romeo and Juliet", "Pride and Prejudice"],
    ["Romeo and Juliet", "Hamlet"],
  ]);
});

test("Observable.merge() should transform an array of observables into an observable of array", () => {
  const book1 = observable("The Jungle Book");
  const book2 = observable("Pride and Prejudice");
  const books = Observable.merge([book1, book2]);
  expect(books.get()).toStrictEqual(["The Jungle Book", "Pride and Prejudice"]);

  book1.set("Romeo and Juliet");
  book2.set("Hamlet");
  expect(books.get()).toStrictEqual(["Romeo and Juliet", "Hamlet"]);
});

test("Observable.latest() should create a new observable with the value from the latest changed observable", () => {
  const book1 = observable("The Jungle Book");
  const book2 = observable("Pride and Prejudice");
  const latestBook = Observable.latest(book1, book2);
  expect(latestBook.get()).toStrictEqual("The Jungle Book");

  book1.set("Romeo and Juliet");
  expect(latestBook.get()).toStrictEqual("Romeo and Juliet");

  book2.set("Hamlet");
  expect(latestBook.get()).toStrictEqual("Hamlet");
});

test("Observable.compute() should automatically tracks inputs and be updated when an input is modified", () => {
  const title = observable("Hamlet");
  const author = observable("Shakespeare");
  const book = Observable.compute(() => ({ title: title.get(), author: author.get() }));
  expect(book.get()).toStrictEqual({ author: "Shakespeare", title: "Hamlet" });

  const received: { title: string; author: string }[] = [];
  book.subscribe(b => received.push(b));
  title.set("Romeo and Juliet");
  expect(received).toStrictEqual([{ author: "Shakespeare", title: "Romeo and Juliet" }]);

  title.set("Pride and Prejudice");
  author.set("Austen");
  expect(received).toStrictEqual([
    { author: "Shakespeare", title: "Romeo and Juliet" },
    { author: "Shakespeare", title: "Pride and Prejudice" },
    { author: "Austen", title: "Pride and Prejudice" },
  ]);

  const bookTitleLength = Observable.compute(() => book.get().title.length);
  expect(bookTitleLength.get()).toStrictEqual(19);

  const receivedLength: number[] = [];
  bookTitleLength.subscribe(l => receivedLength.push(l));
  title.set("Prejudice and Pride");
  expect(receivedLength).toStrictEqual([]);

  title.set("Persuasion");
  expect(receivedLength).toStrictEqual([10]);
});

test("Observable.fromPromise() should create a new observable initialized with undefined and changed when the promise is resolved", async () => {
  const bookPromise = Promise.resolve("The Jungle Book");
  const book = Observable.fromPromise(bookPromise);
  expect(book.get()).toStrictEqual(undefined);

  await expect(bookPromise).resolves;
  expect(book.get()).toStrictEqual("The Jungle Book");

  const failedBookPromise = Promise.reject("timeout");
  const failedBook = Observable.fromPromise(failedBookPromise, e => `Failed to fetch book: ${e}`);
  expect(failedBook.get()).toStrictEqual(undefined);

  await expect(failedBookPromise).rejects;
  expect(failedBook.get()).toStrictEqual("Failed to fetch book: timeout");
});

test("Observable.toPromise() should create a promise that is resolved the next time the observable's value changes", async () => {
  const book = observable("The Jungle Book");
  const bookPromise = book.toPromise();
  book.set("Pride and Prejudice");
  await expect(bookPromise).resolves.toStrictEqual("Pride and Prejudice");
});

test("Computed observables should call listeners as few as possible", () => {
  const books = observable(["The Jungle Book", "Pride and Prejudice"]);
  const book1 = books.select(it => it[0]);
  const book2 = books.select(it => it[1]);
  const newBooks = Observable.from(book1, book2);
  expect(newBooks.get()).toStrictEqual(books.get());

  books.set(["Romeo and Juliet", "Hamlet"]);
  expect(newBooks.get()).toStrictEqual(books.get());

  const received: string[][] = [];
  newBooks.subscribe(b => received.push(b));
  books.set(["The Jungle Book", "Pride and Prejudice"]);
  expect(received).toStrictEqual([["The Jungle Book", "Pride and Prejudice"]]);
});

test("Observable.batch() calls listeners of modified observables only once", () => {
  const numbers = Array.from(Array(10).keys()).map(index => observable(index));
  const total = Observable.merge(numbers).select(num => num.reduce((a, b) => a + b));
  expect(total.get()).toStrictEqual(45);

  let received: number[] = [];
  total.subscribe(t => received.push(t));
  numbers.forEach(num => num.update(it => it + 1));
  expect(received).toStrictEqual([46, 47, 48, 49, 50, 51, 52, 53, 54, 55]);

  received = [];
  Observable.batch(() => numbers.forEach(num => num.update(it => it + 1)));
  expect(received).toStrictEqual([65]);
});
