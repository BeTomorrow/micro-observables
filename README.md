# Micro-observables

_A simple Observable library that can be used for easy state management in React applications._

## Observables

In micro-observables, observables store a single value and allow adding and removing listeners in order to be notified when this value changes. If you are used to RxJS, think of micro-observables as a subset of RxJS exposing only the `BehaviorSubject` class.

Observables can be transformed into new observables by applying functions on them,

### Basic usage

```ts
import assert from "assert";
import { observable } from "micro-observables";

const favoriteBook = observable({ title: "The Jungle Book", author: "Kipling" });
const favoriteAuthor = favoriteBook.transform(book => book.author);

assert.deepEqual(favoriteBook.get(), { title: "The Jungle Book", author: "Kipling" });
assert.equal(favoriteAuthor.get(), "Kipling");

const receivedAuthors: string[] = [];
favoriteAuthor.subscribe(book => receivedAuthors.push(book));

favoriteBook.set({ title: "Pride and Prejudice", author: "Austen" });
assert.deepEqual(receivedAuthors, ["Austen"]);

favoriteBook.set({ title: "Hamlet", author: "Shakespeare" });
assert.deepEqual(receivedAuthors, ["Austen", "Shakespeare"]);
```

## API

In micro-observables, there are two types of observables : `Observable` and `WritableObservable`. An `Observable`' is read-only and can be created from a `WritableObservable` with the `readOnly()`, `transform()` or `onlyIf()` methods. A `WritableObservable` allows to modify its value with the `set()` or `update()` methods.

### Functions

#### observable(initialValue): WritableObservable
`observable(initialValue)` is a convenient function to create a writable observable. It is equivalent to `new WritableObservable(initialValue)`.

Wrapping a value with the `observable()` function is all is needed to observe changes of a given value.

```ts
const book = observable("The Jungle Book")
```

### Instance Methods

#### Observable.get()
Returns the value contained by the observable without having to subscribe to it.

```ts
const book = observable("The Jungle Book");
assert.equal(book.get(), "The Jungle Book");
```

#### WritableObservable.set(newValue)
Sets the new value contained by the observable. If the new value is not equal to the current one, listeners will be called with the new value.

```ts
const book = observable("The Jungle Book");
book.set("Pride and Prejudice");
assert.equal(book.get(), "Pride and Prejudice");
```

#### WritableObservable.update(updater: (value) => newValue)
Convenient method to modify the value contained by the observable, using the currentValue. It is equivalent to `observable.set(updater(observable.get()))`. This is especially useful to work with collections or to increment values for example.

```ts
import { List } from "immutable";
const books = observable(new List(["The Jungle Book"]));
books.update(it => it.push("Pride and Prejudice"));
assert.deepEqual(books.get().toArray(), ["The Jungle Book", "Pride and Prejudice"]);
```

#### Observable.subscribe(listener)
Add a listener that will be called when the value of the observable changes. It returns a function to call to unsubscribe from the observable. **Note:** Unlike other observable libraries, the listener is not called immediately with the current value when `subscribe()` is called.

```ts
const book = observable("The Jungle Book");

const received: string[] = [];
const unsubscribe = book.subscribe(newBook => received.push(newBook));
assert.deepEqual(received, []);

book.set("Pride and Prejudice");
assert.deepEqual(received, ["Pride and Prejudice"]);

unsubscribe();
book.set("Hamlet")
assert.deepEqual(received, ["Pride and Prejudice"]);
```

#### Observable.transform(transform)
Create a new observable with the result of the transform applied on the calling observable. It works the same as `Array.map()`.

```ts
const book = observable({ title: "The Jungle Book", author: "Kipling" });
const author = book.transform(it => it.author);
assert.deepEqual(author.get(), "Kipling");
book.set({ title: "Hamlet", author: "Shakespeare" });
assert.deepEqual(author.get(), "Shakespeare");
```

#### Observable.onlyIf(predicate)
Create a new observable that is updated when the value of the calling observable passes the given predicate. When `onlyIf()` is called, if the value of the calling observable doesn't pass the predicate, the new observable contains initially `undefined`. It works the same as `Array.filter()`.

```ts
const counter = observable(0);
const even = counter.onlyIf(it => it % 2 === 0);
const odd = counter.onlyIf(it => it % 2 === 1);
assert.equal(even.get(), 0);
assert.equal(odd.get(), undefined);

counter.update(it => it + 1);
assert.equal(even.get(), 0);
assert.equal(odd.get(), 1);

counter.update(it => it + 1);
assert.equal(even.get(), 2);
assert.equal(odd.get(), 1);
```

#### WritableObservable.readOnly()
