# Micro-observables

_A simple Observable library that can be used for easy state management in React applications._

## Introduction

In micro-observables, observables are objects that store a single value and that notify listeners when this value changes. If you are used to RxJS, you can think of micro-observables as a React-friendly subset of RxJS exposing only the `BehaviorSubject` class.

Observables can be converted into new observables by applying functions on them, such as `transform()` and `onlyIf()`.

Micro-observables works great in combination with React thanks to the use of the `useObservable()` and `useComputedObservable()` hooks. It can be used as a simple yet powerful alternative to [Redux](https://redux.js.org) or [MobX](https://mobx.js.org).

Micro-observables has been inspired by the simplicity of [micro-signals](https://github.com/lelandmiller/micro-signals). We recommend checking out this library for event-driven programming.

### Basic usage

```ts
import assert from "assert";
import { observable } from "micro-observables";

const favoriteBook = observable({ title: "The Jungle Book", author: "Kipling" });
const favoriteAuthor = favoriteBook.transform(book => book.author);

assert.deepEqual(favoriteBook.get(), { title: "The Jungle Book", author: "Kipling" });
assert.equal(favoriteAuthor.get(), "Kipling");

const receivedAuthors: string[] = [];
favoriteAuthor.onChange(book => receivedAuthors.push(book));

favoriteBook.set({ title: "Pride and Prejudice", author: "Austen" });
assert.deepEqual(receivedAuthors, ["Austen"]);

favoriteBook.set({ title: "Hamlet", author: "Shakespeare" });
assert.deepEqual(receivedAuthors, ["Austen", "Shakespeare"]);
```

## Using micro-observables with React

Micro-observables works well with React and can be used to replace state-management libraries such as Redux or MobX. It allows to easily keep components in sync with shared state by storing state-values into observables and by using the `useObservable()` and `useComputedObservable()` hooks to access these values.

### Obligatory TodoList example

```tsx
type Todo = { text: string; completed: boolean };

class TodoService {
    private _todos = observable<Todo[]>([]);

    get todos() {
        return this._todos.readOnly();
    }

    addTodo(text: string) {
        this._todos.update(todos => [...todos, { text, completed: false }]);
    }

    toggleTodo(index: number) {
        this._todos.update(todos => todos.map(
            (todo, i) => i === index ? { ...todo, completed: !todo.completed } : todo
        ));
    }
}

const todoService = new TodoService();

const TodoList: React.FC = () => {
    const todos = useObservable(todoService.todos);
    return <div>
        <ul>
            {todos.map((todo, index) => <TodoItem key={index} todo={todo} index={index} />)}
        </ul>
    </div>;
};

const TodoItem: React.FC({ todo: Todo, index: number }) = ({todo, index}) => {
    return <li
        style={{ textDecoration: completed ? "line-through" : "none" }}
        onClick={() => todoService.toggleTodo(index)}
    >
        {todo.text}
    </li>;
}
```

## API

In micro-observables, there are two types of observables: `WritableObservable` and `Observable`. A `WritableObservable` allows to modify its value with the `set()` or `update()` methods. An `Observable` is read-only and can be created from a `WritableObservable` with the `readOnly()`, `transform()` or `onlyIf()` methods.

### Functions

#### observable(initialValue): WritableObservable

`observable(initialValue)` is a convenient function to create a `WritableObservable`. It is equivalent to `new WritableObservable(initialValue)`.

Wrapping a value with the `observable()` function is all is needed to observe changes of a given value.

```ts
const book = observable("The Jungle Book");
```

### Instance Methods

#### Observable.get()

Return the value contained by the observable without having to subscribe to it.

```ts
const book = observable("The Jungle Book");
assert.equal(book.get(), "The Jungle Book");
```

#### WritableObservable.set(newValue)

Set the new value contained by the observable. If the new value is not equal to the current one, listeners will be called with the new value.

```ts
const book = observable("The Jungle Book");
book.set("Pride and Prejudice");
assert.equal(book.get(), "Pride and Prejudice");
```

#### WritableObservable.update(updater: (value) => newValue)

Convenient method to modify the value contained by the observable, using its current value. It is equivalent to `observable.set(updater(observable.get()))`. This is especially useful to work with collections or to increment values for example.

```ts
const books = observable(["The Jungle Book"]);
books.update(it => [...it, "Pride and Prejudice"]);
assert.deepEqual(books.get(), ["The Jungle Book", "Pride and Prejudice"]);
```

#### Observable.onChange(listener: (value, prevValue) => void)

Add a listener that will be called when the observable's value changes. It returns a function to call to unsubscribe from the observable. Each time the value changes, all the listeners are called with the new value and the previous value. **Note:** Unlike other observable libraries, the listener is not called immediately with the current value when `onChange()` is called.

```ts
const book = observable("The Jungle Book");

const received: string[] = [];
const prevReceived: string[] = [];
const unsubscribe = book.onChange((newBook, prevBook) => {
	received.push(newBook);
	prevReceived.push(prevBook);
});
assert.deepEqual(received, []);
assert.deepEqual(prevReceived, []);

book.set("Pride and Prejudice");
assert.deepEqual(received, ["Pride and Prejudice"]);
assert.deepEqual(prevReceived, ["The Jungle Book"]);

unsubscribe();
book.set("Hamlet");
assert.deepEqual(received, ["Pride and Prejudice"]);
assert.deepEqual(prevReceived, ["The Jungle Book"]);
```

#### WritableObservable.readOnly()

Cast the observable into a read-only observable without the `set()` and `update()` methods. This is used for better encapsulation, preventing outside modifications when an observable is exposed.

```ts
class BookService {
	private _book = observable("The Jungle Book");

	get book() {
		return this._book.readOnly();
	}
}
```

#### Observable.transform(transform)

Create a new observable with the result of the given transform applied on the calling observable. It works the same as `Array.map()`.

```ts
const book = observable({ title: "The Jungle Book", author: "Kipling" });
const author = book.transform(it => it.author);
assert.equal(author.get(), "Kipling");
book.set({ title: "Hamlet", author: "Shakespeare" });
assert.equal(author.get(), "Shakespeare");
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

### Static Methods

#### Observable.compute(inputObservables, compute: (inputValues) => result)

Create a new observable with the result of the given computation applied on the input observables. This is a more generic version of the instance method `Observable.transform()`, allowing to use several observables as input.

```ts
const author = observable("Shakespeare");
const book = observable("Hamlet");
const bookWithAuthor = Observable.compute([author, book], (a, b) => ({ title: b, author: a }));
assert.deepEqual(bookWithAuthor.get(), { title: "Hamlet", author: "Shakespeare" });

book.set("Romeo and Juliet");
assert.deepEqual(bookWithAuthor.get(), { title: "Romeo and Juliet", author: "Shakespeare" });

author.set("Kipling");
book.set("The Jungle Book");
assert.deepEqual(bookWithAuthor.get(), { title: "The Jungle Book", author: "Kipling" });
```

### Hooks

#### useObservable(observable, onChange?)

Return the value stored by the observable and trigger a re-render when the value changes. It can take an optional listener than can be used to perform side-effects when the value changes.

```tsx
const TodoList: React.FC = () => {
	const todos = useObservable(todoService.todos);
	return (
		<div>
			{todos.map((todo, index) => (
				<TodoItem key={index} todo={todo} />
			))}
		</div>
	);
};
```

#### useComputedObservable(compute: () => Observable, deps?, onChange?)

Shortcut for `useObservable(useMemo(compute), deps, onChange)`. Returns the value stored in the computed observable and trigger a re-render when this value changes. This is equivalent to `useObservable(Observable.compute(inputObservables, compute))` with the use of `useMemo()` to avoid creating a new observable each time the component is rendered.

```tsx
const TodoList: React.FC = () => {
	const mostUrgent = useComputedObservable(() =>
		todoService.todos.transform(todos => (todos.length > 0 ? todos[0] : null))
	);
	const assignedToUser = useComputedObservable(() => todoService.getTodosForUser(userId), [userId]);
	return (
		<div>{mostUrgent ? `Your most urgent task is: ${mostUrgent.text}` : "Well done, there is nothing left to do"}</div>
	);
};
```

**Note:** The previous example could have been written with `useObservable()` instead of `useComputedObservable()`, like this:

```tsx
const TodoList: React.FC = () => {
	const todos = useObservable(todoService.todos);
	const mostUrgent = todos.length > 0 ? todos[0] : null;
	return (
		<div>{mostUrgent ? `Your most urgent task is: ${mostUrgent.text}` : "Well done, there is nothing left to do"}</div>
	);
};
```

The main difference here is that using `useComputedObservable()` will prevent unnecessary renders if the first todo remains the same. In the `useObservable()` version, the `TodoList` component will be re-rendered each time `todoService.todos` changes, even if the first todo has not changed.
