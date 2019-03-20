# RRH

## What's this?

Simple [React Hooks](https://reactjs.org/docs/hooks-overview.html) of [React Redux](https://github.com/reduxjs/react-redux)

## Install

__npm__

You must install some dependent packages before use RHH.

- [react](https://github.com/facebook/react)
- [redux](https://github.com/reduxjs/redux)


```shell
npm install rrh --save
```

__yarn__

```shell
yarn add rrh
```

## How to use

__Provider__

```javascript
import React from 'react';
import { useProvider } from 'rrh';
import reducer from './reducer';
import middleware from './middleware'
import Child from './child';

const Component = () => {
  const Provider = useProvider(() => ({
    reducer,
    preloadedState: {count: 1},
    storeEnhancer: applyMiddleware(middleware)
  }));

  return <Provider><Child></Provider>
}
```


__connect__

```javascript
import React from 'react';
import { useSelector } from 'rrh';

const Child = (props) => {
  const selected = useSelector(
    props,
    (dispatch, props) => ({
      increment: () => dispatch({type: 'INCREMENT', payload: 1}),
      decrement: () => dispatch({type: 'DECREMENT', payload: -1}),
    }),
    (state, props) => ({count: state.count}),
    state => [state.count]
  );

  return (
    <div>
      {selected.count}
      <button onClick={selected.increment}>INC</button>
      <button onClick={selected.decrement}>DEC</button>
    </div>
  )
}
```

## API

### useProvider

__types__

```typescript
<State, Ext = {}, StateExt = {}>(init: () => {
  reducer: Reducer<State, AnyAction>;
  preloadedState?: DeepPartial<State>;
  storeEnhancer?: StoreEnhancer<Ext, StateExt>;
}) => Provider
```

__overview__

Return redux store Provider Component that has store inside.  
No props needed.
All arguments are same as redux's `createStore`.

Store and provider is initialized once per process when useProvider called.
So if you want to create new store and Provider, you need to create new hooks instance. See [Multiple store](#muliple-store).


### useSelector

__types__

```typescript
<Handlers, ExtractedState, Props, State>(
  props: React.PropsWithChildren<Props>,
  mapDispatchToProps: (dispatch: Dispatch, ownProps: Props) => Handlers,
  mapStateToProps: (state: State, ownProps: Props) => ExtractedState,
  deps?: any[] | ((state: State) => any[])
) => Handlers & ExtractedState
```
__overview__

useSelector behave like redux's `connect(config)(Component)`, but like [https://github.com/reduxjs/reselect](Redux-reselect),  
we will check dependencies are updated or not, by using `useMemo`.
So if `deps` is updated, `mapDispatchToProps` and `mapStateToProps` will be called.

If you want to specify deps from state, do like below.

```javascript
useSelector(props, () => {...}, () => {...}, (state) => [state.valueA, state.valueB, ...])
```

or if you want to use array deps just like other hooks.

```javascript
useSelector(props, () => {...}, () => {...}, [props.valueA, props.valueB])
```

### useDispatchToProps

__types__

```typescript
<Props, Handlers>(
  props: Props,
  mapDispatchToProps: (dispatch: Dispatch, ownProps: Props) => Handlers,
  deps?: any[]
) => Handlers
```

__overview__

`useDispatchToProps` can partialy call mapDispatchToProps to the store state.


### useStateToProps

__types__

```
<Props, State, ExtractedState>(
  props: Props,
  mapStateToProps: (state: State, ownProps: Props) => ExtractedState,
  deps?: any[] | ((state: State) => any[])
) => ExtractedState
```

__overview__

`useStateToProps` can partialy call mapStateToProps to the store state.

If you want to specify deps from state, do like below.

```javascript
useStateToProps(props, () => {...}, (state) => [state.valueA, state.valueB, ...])
```

or if you want to use array deps just like other hooks.

```javascript
useStateToProps(props, () => {...}, [props.valueA, props.valueB])
```

### useDispatch

__types__

```typescript
() => Dispatch
```

__overview__

`useDispatch` is simply return `store.dispatch`.

```javascript
const dispatch = useDispatch()
dispatch({type: 'ACTION', ...});
```

### useStore

__types__

```typescript
() => Store
```

__overview__

`useStore` is simply return `store`.

```javascript
const store = useStore()
console.log(store.getState());
```


## Muliple store.

If you want to create muliple store, you need to create new hooks instance by using `generateReduxHooks`.

### generateReduxHooks

__types__

```typescript
enum RRHStoreInitilizationTiming {
  EACH_MOUNT,
  ONCE_PER_FACTORY
}

interface Options {
  initializationTiming: RRHStoreInitilizationTiming
}

(options: Options) => Hooks
```

__overview__

`generateReduxHooks` is create new hooks instance.  

All hooks returned from `generateReduxHooks` is not initialized, so if you call `useProvider`,  
new `store` and `Provider` will be created.
Between hooks instances, store is __not__ shared.


__initialization timing__

`generateReduxHooks` accepts `RRHStoreInitilizationTiming`, this options behave like below.

|type|description|
----|----
|EACH_MOUNT|Store and Provider will be initialized each componentDidMount|
|ONCE_PER_FACTORY|Store and Provider will be initialized only first `useProvider` call.|


__default hooks__

All default hooks that exported from 'rrh' package are initialized by `RRHStoreInitilizationTiming.ONCE_PER_FACTORY`.
