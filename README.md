# Micro-observables

_A simple Observable library that can be used for easy state-management in React applications._

## Features

- **💆‍♂️ Easy to learn:** No boilerplate required, write code as you would naturally. Just wrap values that you want to expose to your UI into observables. Micro-observables only exposes a few methods to create and transform observables
- **⚛️ React support:** Out-of-the-box React support based on React Hooks
- **🐥 Lightweight:** The whole source code is made of less than 400 lines of code, resulting in a **6kb** production bundle
- **🔥 Peformant:** Observables are evaluated only when needed. Micro-observables also supports [React and React Native batching](#react-batching), minimizing the amount of re-renders
- **🔮 Debuggable:** Micro-observables does not rely on ES6 proxies, making it easy to identify lines of code that trigger renders. Code execution is easy to follow, making debugging straightforward
- **🛠 TypeScript support:** Being written entirely in TypeScript, types are first-class citizen

## Introduction

In micro-observables, observables are objects that store a single value. They are used to store a **piece of state** of your app. An observable notifies listeners each time its value changes, triggering a re-render of all components that are using that observable for example.

Observables can be easily derived into new observables by applying functions on them, such as `transform()`, `onlyIf()` or `default()`.

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

Micro-observables works great with React and can be used to replace state-management libraries such as Redux or MobX. It allows to easily keep components in sync with shared state by storing pieces of state into observables. The `useObservable()` and `useComputedObservable()` hooks are used to access these values from a component.

### Obligatory TodoList example

```tsx
type Todo = { text: string; done: boolean };

class TodoStore {
  private _todos = observable<readonly Todo[]>([]);

  readonly todos = this._todos.readOnly();
  readonly pendingTodos = this._todos.transform(todos => todos.filter(it => !it.done));

  addTodo(text: string) {
    this._todos.update(todos => [...todos, { text, done: false }]);
  }

  toggleTodo(index: number) {
    this._todos.update(todos =>
      todos.map((todo, i) => (i === index ? { ...todo, done: !todo.done } : todo))
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
      <TodoListHeader />
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
  const pendingCount = useObservable(todoStore.pendingTodos.transform(it => it.length));
  return <h3>{pendingCount} pending todos</h3>;
};

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

### React Batching

Micro-observables supports React batched updates: when modifying an observable, all re-renders caused by the changes from the observable and its derived observables are batched, minimizing the total amount of re-renders.

Another important benefit of React Batching is that it ensures **consistency** in renders: you can learn more about this on [MobX Github](https://github.com/mobxjs/mobx-react/pull/787#issuecomment-573599793).

By default, batching is disabled as it depends on the platform your app is targeting. To enable it, import one of these files before using micro-observables (typically in your `index.js` file):

**For React DOM:** `import "micro-observables/batchingForReactDom"`

**For React Native:** `import "micro-observables/batchingForReactNative"`

**For other platforms:** You can use the custom batching function provided by the platform by calling the `setBatchedUpdater()` function from micro-observables.

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

**Note:** The provided `transform` function can return another observable. In this case, the created observable will get its value from the returned observable and will be automatically updated when the value from the returned observable changes.

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
const lastSeenLocation = userLocation.onlyIf(it => !!it).default("Unknown");
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
const bookWithAuthor = Observable.from(author, book).transform(([a, b]) => ({
  title: b,
  author: a,
}));
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

#### Observable.latest(observable1, observable2, ...)

Take several observables and transform them into a single observable containing the value from the last-modified observable. The returned observable is initialized with the value from the first given observable.

```ts
const lastMovie = observable("Minority Report");
const lastTvShow = observable("The Big Bang Theory");
const lastWatched = Observable.latest(lastMovie, lastTvShow);
assert.equal(lastWatched.get(), "Minority Report");

lastTvShow.set("Game of Thrones");
assert.equal(lastWatched.get(), "Game of Thrones");

lastMovie.set("Forrest Gump");
assert.equal(lastWatched.get(), "Forrest Gump");
```

#### Observable.compute(compute: () => value)

`Observable.compute()` is your **silver bullet** when it is too difficult to create a new observable with the usual `transform()`, `onlyIf()` or `latest()` methods. It is especially useful when dealing with complex data structures. It takes a function that computes a new value by directly accessing values from other observables and it returns a new observable containing the result of this computation.

**How it works:** Each time the observable is evaluated, it calls the provided `compute` function and automatically tracks the observables that are used during the computation (i.e. those on which `get()` is getting called). It then registers these observables as input, ensuring that the new observable is updated each time one of them changes. If you are familiar with MobX, it works the same way as the `@computed` observables.

**Note:** There is a slight performance impact of using `Observable.compute()` as it has to track and update the inputs dynamically. But unless you're dealing with thousands of computed observables, it should not be noticeable.

```ts
const authors = new Map([
  [0, observable("Kipling")],
  [1, observable("Shakespeare")],
  [2, observable("Austen")],
]);
const books = observable([
  { title: "The Jungle Book", authorId: 0 },
  { title: "Pride and Prejudice", authorId: 2 },
  { title: "Persuasion", authorId: 2 },
]);
const booksWithAuthors = Observable.compute(() =>
  books.get().map(book => ({ title: book.title, author: authors.get(book.authorId).get() }))
);
assert.deepEqual(booksWithAuthors.get(), [
  { title: "The Jungle Book", author: "Kipling" },
  { title: "Pride and Prejudice", author: "Austen" },
  { title: "Persuasion", author: "Austen" },
]);
```

#### Observable.fromPromise(promise, onError?: (error) => value)

Convert the promise into an observable. The observable is initialized with `undefined` and will be updated with the value of the promise when it is resolved. If the promise is rejected, the optional `onError` function is called with the error and should return the value to assign to the observable. If no `onError` function is provided, the observable keeps its `undefined` value.

```tsx
async function fetchBook(title: string): Promise<Book> {
  // ...
}

const book = Observable.fromPromise(fetchBook("The Jungle Book"));
assert.equal(book.get(), undefined);
book.onChange(book => console.log(`Retrieved book: ${book}));
```

#### Observable.batch(block: () => void)

Group together several observable modifications. It ensures that listeners from any derived observable are only called once which might be useful for data consistency or for performance.

Additionally, if React batching is enabled, it batches re-renders together. You can learn more about React batching and how to enable it [here](#react-batching).

```tsx
const numbers = [...Array(10)].map((_, index) => observable(index));
const total = Observable.compute(() => numbers.reduce((a, b) => a.get() + b.get()));
expect(total.get()).toStrictEqual(45);

// Listeners of "total" will only be called once, with the final result.
// Without batching(), it would have been called 10 times
total.onChange(val => assert.equal(val, 65));
Observable.batch(() => numbers.forEach(num => num.update(it => it + 1)));
```

### React Hooks

#### useObservable(observable)

Return the value of the observable and trigger a re-render when the value changes.

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

Shortcut for `useObservable(useMemo(compute, deps))`. Return the value of the observable computed by the `compute` parameter and trigger a re-render when this value changes.

The `compute` function is evaluated each time one of the values in `deps` changes. If unspecified, `deps` defaults to `[]`, resulting in the `compute` function being called only once.

```tsx
type User = { id: string; displayName: string };
type Todo = { text: string; completed: boolean; assigneeId: string };

class UserStore {
  private _user = observable<User>();

  readonly user = this._user.readOnly();
}

class TodoStore {
  private _todos = observable<readonly Todo[]>([]);

  readonly todos = this._todos.readOnly();

  getTodosAssignedTo(assigneeId: string): Observable<Todo[]> {
    return this._todos.transform(todos => todos.filter(it => it.assigneeId === assigneeId));
  }
}

const TodoList: React.FC = () => {
  const userTodos = useComputedObservable(() =>
    userStore.user.transform(user => todoStore.getTodosAssignedTo(user.id))
  );
  return (
    <div>
      <ul>
        {userTodos.map((todo, index) => (
          <TodoItem key={index} todo={todo} index={index} />
        ))}
      </ul>
    </div>
  );
};
```

**Note:** `useComputedObservable()` is an optimized version of `useObservable()` that avoids recreating a new observable and reevaluating its value at each render. It will **not decrease the amount of renders**. Most of the time, you actually don't even need it, creating an observable is a fast operation and if your observable evaluation does not require heavy computation, you can use `useObservable()` instead.
