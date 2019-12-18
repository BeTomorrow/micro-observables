# Micro-observables

_A simple Observable library that can be used for easy state management in React applications._

## Observables

In micro-observables, observables are objects that store a single value and that notifies when this value changes. If you are used to RxJS, you can think of micro-observables as a tiny subset of RxJS exposing only the `BehaviorSubject` class.

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

In micro-observables, there are two types of observables : `WritableObservable` and `Observable`. A `WritableObservable` allows to modify its value with the `set()` or `update()` methods. An `Observable` is read-only and can be created from a `WritableObservable` with the `readOnly()`, `transform()` or `onlyIf()` methods.

### Functions

#### observable(initialValue): WritableObservable
`observable(initialValue)` is a convenient function to create a `WritableObservable`. It is equivalent to `new WritableObservable(initialValue)`.

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
Convenient method to modify the value contained by the observable, using the current value. It is equivalent to `observable.set(updater(observable.get()))`. This is especially useful to work with collections or to increment values for example.

```ts
const books = observable(["The Jungle Book"]));
books.update(it => [...it, "Pride and Prejudice"]);
assert.deepEqual(books.get(), ["The Jungle Book", "Pride and Prejudice"]);
```

#### Observable.subscribe(listener)
Add a listener that will be called when the observable's value changes. It returns a function to call to unsubscribe from the observable. **Note:** Unlike other observable libraries, the listener is not called immediately with the current value when `subscribe()` is called.

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
Create a new observable with the result of the given transform applied on the calling observable. It works the same as `Array.map()`.

```ts
const book = observable({ title: "The Jungle Book", author: "Kipling" });
const author = book.transform(it => it.author);
assert.deepEqual(author.get(), "Kipling");
book.set({ title: "Hamlet", author: "Shakespeare" });
assert.deepEqual(author.get(), "Shakespeare");
```

#### Observable.onlyIf(predicate)
Create a new observable that is updated when the value of the calling observable passes the given predicate. When `onlyIf()` is called, if the value of the calling observable doesn't pass the predicate, the new observable is initialized with `undefined`. It works the same as `Array.filter()`.

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
Cast the observable into a read-only observable without the `set()` and `update()` methods. This is used for better encapsulation, to prevent outside modifications when exposing an observable.

```ts
class BookService {
    private _book = observable("The Jungle Book");

    get book() {
        return this._book.readOnly();
    }
}
```

### Static Methods

#### Observable.compute(inputObservables, compute: (inputValues) => result)

Create a new observable with the result of the given computation applied on the input observables. This is a more generic version of the instance method `Observable.transform()`, allowing to use several observables as input.

```ts
const author = observable("Shakespeare");
const book = observable("Hamlet");
const bookWithAuthor = Observable.compute(
    [author, book] => (a, b) => ({ title: b, author: a })
);
assert.deepEqual(bookWithAuthor.get(), { title: "Hamlet", author: "Shakespeare" })

book.set("Romeo and Juliet");
assert.deepEqual(bookWithAuthor.get(), { title: "Romeo and Juliet", author: "Shakespeare" })

author.set("Kipling");
book.set("The Jungle Book");
assert.deepEqual(bookWithAuthor.get(), { title: "The Jungle Book", author: "Kipling" })

```

## Using micro-observables with React