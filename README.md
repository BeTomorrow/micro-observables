# Micro-observables

_A simple Observable library that can be used for state management in React applications._

## Observables

In micro-observables, observables store a single value and allow adding and removing listeners in order to be notified when this value changes. If you are used to RxJS, think of micro-observables as a subset of RxJS exposing only the _BehaviorSubject_ class.

Observables can be transformed into new observables by applying functions on them,

### Basic usage

```ts
import assert from "assert";
import { observable } from "micro-observables";

const favoriteBook = observable({ title: "The Jungle Book", author: "Rudyard Kipling" });
const favoriteAuthor = favoriteBook.transform(book => book.author);

assert.deepEqual(favoriteBook.get(), { title: "The Jungle Book", author: "Rudyard Kipling" });
assert.equal(favoriteAuthor.get(), "Rudyard Kipling");

const receivedAuthors: string[] = [];
favoriteAuthor.subscribe(book => receivedAuthors.push(book));

favoriteBook.set({ title: "Pride and Prejudice", author: "Jane Austen" });
assert.deepEqual(receivedAuthors, ["Jane Austen"]);

favoriteBook.set({ title: "Hamlet", author: "William Shakespeare" });
assert.deepEqual(receivedAuthors, ["William Shakespeare"]);
```
