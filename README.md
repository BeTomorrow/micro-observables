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

  addTodo(text: string) {
    this._todos.update(todos => [...todos, { text, done: false }]);
  }

  toggleTodo(index: number) {
    this._todos.update(todos => todos.map((todo, i) => (i === index ? { ...todo, done: !todo.done } : todo)));
  }
}

const todoStore = new TodoStore();
todoStore.addTodo("Eat my brocolli");
todoStore.addTodo("Plan trip to Bordeaux");

const TodoList: React.FC = () => {
  const todos = useObservable(todoStore.todos);
  return (
    <div>
      <ul>
        {todos.map((todo, index) => (
          <TodoItem key={index} todo={todo} index={index} />
        ))}
      </ul>
      <AddTodo />
    </div>
  );
};

const TodoItem: React.FC<{ todo: Todo; index: number }> = ({ todo, index }) => {
  return (
    <li style={{ textDecoration: todo.done ? "line-through" : "none" }} onClick={() => todoStore.toggleTodo(index)}>
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

#### useComputedObservable(compute: () => Observable, deps)

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
