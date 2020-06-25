# Micro-observables

_A simple Observable library that can be used for easy state-management in React applications._

## Features

- **💆‍♂️ Easy to learn:** No boilerplate required, write code as you would naturally. Just wrap values that you want to expose to your UI into observables. Micro-observables only exposes a few methods to create and transform observables
- **⚛️ React support:** Out-of-the-box React support based on React Hooks
- **🐥 Lightweight:** The whole source code is made of less than 400 lines of code
- **🔥 Peformant:** Observables are evaluated only when needed. Micro-observables also supports React and React Native batching, minimizing the number of render calls
- **🔮 Debuggable:** Micro-observables does not rely on ES6 proxies, making it ease to identify lines of code that trigger renders. Code execution is easy to follow, making debugging straightforward
- **🛠 TypeScript support:** Being written entirely in TypeScript, types are first-class citizen

## Introduction

In micro-observables, observables are objects that store a single value. They are used to store **a piece of state** of your app. An observable notifies listeners each time its value changes, triggering a re-render of all components that are using the observable.

Observables can be derived into new observables by applying functions on them, such as `transform()`, `onlyIf()` or `default()`.

Micro-observables works great in combination with React thanks to the use of the `useObservable()` and `useComputedObservable()` hooks. It can be used as a simple yet powerful alternative to [Redux](https://redux.js.org) or [MobX](https://mobx.js.org).

Micro-observables has been inspired by the simplicity of [micro-signals](https://github.com/lelandmiller/micro-signals). We recommend checking out this library for event-driven programming.

**Note:** If you are used to RxJS, you can think of micro-observables as a React-friendly subset of RxJS exposing only the `BehaviorSubject` class.

## Basic usage

```ts
import assert from "assert";
import { observable } from "micro-observables";

const favoriteBook = observable({ title: "The Jungle Book", author: "Kipling" });
const favoriteAuthor = favoriteBook.transform(book => book.author);

assert.deepEqual(favoriteBook.get(), { title: "The Jungle Book", author: "Kipling" });
assert.equal(favoriteAuthor.get(), "Kipling");

const receivedAuthors: string[] = [];
favoriteAuthor.onChange(author => receivedAuthors.push(author));

favoriteBook.set({ title: "Pride and Prejudice", author: "Austen" });
assert.deepEqual(receivedAuthors, ["Austen"]);

favoriteBook.set({ title: "Hamlet", author: "Shakespeare" });
assert.deepEqual(receivedAuthors, ["Austen", "Shakespeare"]);
```

## Using micro-observables with React

Micro-observables works well with React and can be used to replace state-management libraries such as Redux or MobX. It allows to easily keep components in sync with shared state by storing state-values into observables. The `useObservable()` and `useComputedObservable()` hooks are used to access these values from a component.

### Obligatory TodoList example

```tsx
type Todo = { text: string; done: boolean };

class TodoStore {
  private _todos = observable<Todo[]>([]);

  readonly todos = this._todos.readOnly();
  readonly pendingTodos = this._todos.transform(todos => todos.filter(it => !it.done));

  addTodo(text: string) {
    this._todos.update(todos => [...todos, { text, done: false }]);
  }

  toggleTodo(index: number) {
    this._todos.update(todos =>
      todos.map((todo, i) =>
        i === index ? { ...todo, done: !todo.done } : todo
      )
    );
  }
}

const todoStore = new TodoStore();
todoStore.addTodo("Eat my brocolli");
todoStore.addTodo("Plan trip to Bordeaux");

export const TodoList: React.FC = () => {
  const todos = useObservable(todoStore.todos);
  return (
    <div>
      <TodoListHeader/>
      <ul>
        {todos.map((todo, index) => (
          <TodoItem key={index} todo={todo} index={index} />
        ))}
      </ul>
      <AddTodo />
    </div>
  );
};

const TodoListHeader: React.FC = () => {
  const pendingCount = useComputedObservable(() => todoStore.pendingTodos.transform(it => it.length));
  return <h3>{pendingCount} pending todos</h3>;
}

const TodoItem: React.FC<{ todo: Todo; index: number }> = ({ todo, index }) => {
  return (
    <li
      style={{ textDecoration: todo.done ? "line-through" : "none" }}
      onClick={() => todoStore.toggleTodo(index)}
    >
      {todo.text}
    </li>
  );
};

const AddTodo: React.FC = () => {
  const input = useRef<HTMLInputElement>(null);

  const addTodo = (event: React.FormEvent) => {
    event.preventDefault();
    todoStore.addTodo(input.current!.value);
    input.current!.value = "";
  };

  return (
    <form onSubmit={addTodo}>
      <input ref={input} />
      <button>Add</button>
    </form>
  );
};
```

This example can be run on [CodeSandbox](https://codesandbox.io/s/hopeful-sea-jrd9e?file=/src/TodoList.tsx).

## API

In micro-observables, there are two types of observables: `WritableObservable` and `Observable`. A `WritableObservable` allows to modify its value with the `set()` or `update()` methods. An `Observable` is read-only and can be created from a `WritableObservable` with `readOnly()`, `transform()`, `onlyIf()` and other methods.

### Functions

#### observable(initialValue): WritableObservable

`observable(initialValue)` is a convenient function to create a `WritableObservable`. It is equivalent to `new WritableObservable(initialValue)`.

Wrapping a value with the `observable()` function is all is needed to observe changes of a given value.

**Note:** `initialValue` can be another observable. In this case, the new observable will be automatically updated when `initialValue` changes.

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

**Note:** `newValue` can be another observable. In this case, the observable will be automatically updated when `newValue` changes.

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
class BookStore {
  private _book = observable("The Jungle Book");

  readonly book = this._book.readOnly();
}
```

**Note:** This method only makes sense with TypeScript as the returned observable is the same unchanged observable.

#### Observable.transform(transform: (value) => transformedValue)

Create a new observable with the result of the given transform applied on the input observable. Each time the input observable changes, the returned observable will reflect this changes.

```ts
const book = observable({ title: "The Jungle Book", author: "Kipling" });
const author = book.transform(it => it.author);
assert.equal(author.get(), "Kipling");
book.set({ title: "Hamlet", author: "Shakespeare" });
assert.equal(author.get(), "Shakespeare");
```

**Note:** The `transform` function can return another observable. In this case, the transformed observable will be take the value of the returned automatically updated when `newValue` changes.

#### Observable.onlyIf(predicate: (value) => boolean)

Create a new observable that is only updated when the value of the input observable passes the given predicate. When `onlyIf()` is called, if the current value of the input observable does not pass the predicate, the new observable is initialized with `undefined`

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

#### Observable.default(defaultValue)

Transform the observable into a new observable that contains the value of the input observable if it is not `undefined` or `null`, or `defaultValue` otherwise. It is equivalent to `observable.transform(val => val ?? defaultValue)`. This is especially useful in combination with `onlyIf()` to provide a default value if current value does not initially pass the predicate.

```ts
const userLocation = observable<string | null>(null);
const lastSeenLocation = userLocation.onlyIf(it => it !== null).default("Unknown");
assert.equal(lastSeenLocation.get(), "Unknown");

userLocation.set("Paris");
assert.equal(lastSeenLocation.get(), "Paris");

userLocation.set(null);
assert.equal(lastSeenLocation.get(), "Paris");

userLocation.set("Bordeaux");
assert.equal(lastSeenLocation.get(), "Bordeaux");
```

#### Observable.toPromise()

Convert the observable into a promise. The promise will be resolved the next time the observable changes. This is especially useful in order to `await` a change from an observable.

```ts
const age = observable(34);
(async () => {
  await age.toPromise();
  console.log("Happy Birthday!");
})();
age.set(35);
```

### Static Methods

#### Observable.from(observable1, observable2, ...)

Take several observables and transform them into a single observable containing an array with the values from each observable. This is often used in combination with `transform()` to combine several observables into a single one.

```ts
const author = observable("Shakespeare");
const book = observable("Hamlet");
const bookWithAuthor = Observable.from(author, book).transform(([a, b]) => ({ title: b, author: a }));
assert.deepEqual(bookWithAuthor.get(), { title: "Hamlet", author: "Shakespeare" });

book.set("Romeo and Juliet");
assert.deepEqual(bookWithAuthor.get(), { title: "Romeo and Juliet", author: "Shakespeare" });

author.set("Kipling");
book.set("The Jungle Book");
assert.deepEqual(bookWithAuthor.get(), { title: "The Jungle Book", author: "Kipling" });
```

#### Observable.merge(observables)

Transform an array of observables into a single observable containing an array with the values from each observable. This is almost the identical to `Observable.from()`, except it takes a single array argument while `Observable.from()` takes several observable arguments.

```ts
const booksWithId = [
  { id: 1, book: observable("The Jungle Book") },
  { id: 2, book: observable("Pride and Prejudice") },
  { id: 3, book: observable("Hamlet") },
];
const books = Observable.merge(booksWithId.map(it => it.book));
assert.deepEqual(books.get(), ["The Jungle Book", "Pride and Prejudice", "Hamlet"]);
```

#### Observable.fromPromise(promise, onError?: (error) => value)
Convert the promise into an observable. The observable is initialized with `undefined` and will be updated with the value of the promise when it is resolved. If the promise is rejected, the optional `onError` function is called with the error and should return the value to store in the observable. If no `onError` function is provided, the observable keeps its `undefined` value.

```tsx
async function fetchBook(title: string): Promise<Book> {
  // ...
}

const book = Observable.fromPromise(fetchBook("The Jungle Book"));
assert.equal(book.get(), undefined);
book.onChange(book => console.log(`Retrieved book: ${book}));
```

### Hooks

#### useObservable(observable)

Return the value stored by the observable and trigger a re-render when the value changes.

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

#### useComputedObservable(compute: () => Observable, deps?: any[])

Shortcut for `useObservable(useMemo(compute, deps))`. Return the value stored in the observable returned by the `compute` parameter and trigger a re-render when this value changes. The `compute` function is evaluated each time one of the values in `deps` changes.

```tsx
type Todo = { text: string; completed: boolean; assigneeId: string };

class TodoService {
  private _todos = observable<Todo[]>([]);

  readonly todos = this._todos.readOnly();

  getTodosAssignedTo(assigneeId: string): Observable<Todo[]> {
    return this._todos.transform(todos => todos.filter(it => it.assigneeId === assigneeId));
  }
}

const TodoList: React.FC = () => {
  const user = useObservable(userService.user);
  const todos = useComputedObservable(() => todoService.getTodosAssignedTo(user.id), [user.id]);
  return (
    <div>
      <ul>
        {todos.map((todo, index) => (
          <TodoItem key={index} todo={todo} index={index} />
        ))}
      </ul>
    </div>
  );
};
```
