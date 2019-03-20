/**
 * The MIT License (MIT)
 * Copyright (c) Taketoshi Aono
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * @fileoverview
 * @author Taketoshi Aono
 */

import {
  Reducer,
  AnyAction,
  DeepPartial,
  StoreEnhancer,
  Store,
  createStore,
  Dispatch
} from "redux";
import React, { useState, useContext, useMemo, useEffect } from "react";

/**
 * State of root provider holders.
 */
interface HooksState<State> {
  /**
   * Store - single source of truth -.
   */
  store: Store<State, AnyAction>;

  /**
   * Store provider.
   */
  Provider: React.FunctionComponent<React.PropsWithChildren<{}>>;
}

export enum RRHStoreInitilizationTiming {
  EACH_MOUNT,
  ONCE_PER_FACTORY
}

/**
 * Hook options.
 */
interface ReduxHookOption {
  initializationTiming: RRHStoreInitilizationTiming;
}

/**
 * Create new hooks instance.
 * If you need more store, you could create new redux hook instance.
 */
export const generateReduxHooks = (
  options: ReduxHookOption = {
    initializationTiming: RRHStoreInitilizationTiming.ONCE_PER_FACTORY
  }
) => {
  /**
   * Root context of store.
   */
  const context = React.createContext<{ store: Store<any> }>(null as any);

  /**
   * Store must be initialized only once.
   * So we add mutex variable of initialization.
   */
  const __PER_FACTORY_INSTANCES__: HooksState<any> & {
    initialized: boolean;
  } = {
    initialized: false,
    store: null as any,
    Provider: null as any
  };

  /**
   * Return store initialization state of selected initializationTiming.
   */
  function isInitialized(state: HooksState<any>) {
    switch (options.initializationTiming) {
      case RRHStoreInitilizationTiming.EACH_MOUNT:
        return !!state.store;
      case RRHStoreInitilizationTiming.ONCE_PER_FACTORY:
        return __PER_FACTORY_INSTANCES__.initialized;
      default:
        return false;
    }
  }

  /**
   * Update __PER_FACTORY_INSTANCES__ properties.
   */
  function updatePerFactoryInstances(
    newState: HooksState<any> & { initialized?: boolean }
  ) {
    Object.assign(__PER_FACTORY_INSTANCES__, newState);
  }

  /**
   * Return current component state or hooks instance state.
   */
  function getHooksState<State>(): [
    HooksState<State>,
    (state: HooksState<State> & { initialized?: boolean }) => void
  ] {
    switch (options.initializationTiming) {
      case RRHStoreInitilizationTiming.EACH_MOUNT:
        return useState<HooksState<State>>({} as any);
      case RRHStoreInitilizationTiming.ONCE_PER_FACTORY:
        return [__PER_FACTORY_INSTANCES__, updatePerFactoryInstances];
      default:
        throw new Error(
          `Invalid initializationTiming detected ${
            options.initializationTiming
          }`
        );
    }
  }

  /**
   * Get provider from hooks.
   * All arguments same as redux's createStore.
   */
  const useProvider = <State, Ext = {}, StateExt = {}>(
    init: () => {
      reducer: Reducer<State, AnyAction>;
      preloadedState?: DeepPartial<State>;
      storeEnhancer?: StoreEnhancer<Ext, StateExt>;
    }
  ): HooksState<State>["Provider"] => {
    const [state, update] = getHooksState();

    /**
     * Initialize once.
     */
    if (!isInitialized(state)) {
      const { reducer, preloadedState = null, storeEnhancer } = init();
      /**
       * To create redux store, simply we use createStore.
       */
      const store = (() => {
        if (preloadedState === null) {
          return createStore(reducer, storeEnhancer);
        }
        return createStore(reducer, preloadedState, storeEnhancer);
      })();

      /**
       * Provider is 'Provider' of redux store.
       */
      const Provider = ({ children }: React.PropsWithChildren<{}>) => {
        const { Provider } = context;
        const [state, update] = useState({ store });

        useEffect(() => {
          const u = store.subscribe(() => update({ store }));
          update({ store });
          return () => u();
        }, []);

        return <Provider value={state}>{children}</Provider>;
      };

      /**
       * Update per component initialization guard.
       */
      update({ store, Provider, initialized: true });

      return Provider;
    }

    if (!state.Provider) {
      throw new Error(`Failed to initialize Provider.
initilizeTiming is ${
        RRHStoreInitilizationTiming[options.initializationTiming]
      } but store is not initialized and initialization guard was set to true.
Sometimes this caused by use same Provider in different Components.
Check your Component.`);
    }

    return state.Provider;
  };

  function getStore() {
    const { store } = useContext(context);

    if (!store) {
      throw new Error(
        "Use before useDispatchToProps, you must initialize store using useProvider function."
      );
    }

    return store;
  }

  /**
   * Get dispatcher.
   */
  const useDispatch = () => {
    const store = getStore();
    return (payload: AnyAction) => store.dispatch(payload);
  };

  /**
   * Get store.
   */
  const useStore = () => getStore();

  function generateStateSelector<Props, F, Map extends Function>(
    props: Props,
    getMapFirstArguments: (store: Store<any>) => F,
    map: Map,
    deps?: (any[]) | ((state: any) => any[])
  ) {
    const store = getStore();

    /**
     * Calculate deps and update if dependencies updated.
     * So you can filter deps like redux-reselect.
     */
    return useMemo(() => map(getMapFirstArguments(store), props), [
      ...(deps
        ? typeof deps === "function"
          ? deps(store.getState())
          : deps
        : [props]),
      store
    ]);
  }

  /**
   * Select from store state.
   * This function behave like connect(...).
   * @examples
   * const selected = useSelector(
   *   props,
   *   dispatch => ({onClick: dispatch(Action.foo())}),
   *   state => ({state: state.foo}),
   *   []
   * )
   */
  function useSelector<Handlers, ExtractedState, Props, State>(
    props: React.PropsWithChildren<Props>,
    mapDispatchToProps: (dispatch: Dispatch, ownProps: Props) => Handlers,
    mapStateToProps: (state: State, ownProps: Props) => ExtractedState,
    deps?: any[] | ((state: State) => any[])
  ): Handlers & ExtractedState {
    return generateStateSelector(
      props,
      store => store,
      store => {
        return {
          ...mapDispatchToProps(store.dispatch, props),
          ...mapStateToProps(store.getState(), props)
        };
      },
      deps
    );
  }

  /**
   * Select by mapDispatchToProps
   */
  function useDispatchToProps<Props, Handlers>(
    props: Props,
    mapDispatchToProps: (dispatch: Dispatch, ownProps: Props) => Handlers,
    deps?: any[]
  ): Handlers {
    return generateStateSelector(
      props,
      store => store.dispatch,
      mapDispatchToProps,
      deps
    );
  }

  /**
   * Select by mapStateToProps
   */
  function useStateToProps<Props, State, ExtractedState>(
    props: Props,
    mapStateToProps: (state: State, ownProps: Props) => ExtractedState,
    deps?: any[] | ((state: State) => any[])
  ): ExtractedState {
    return generateStateSelector(
      props,
      store => store.getState(),
      mapStateToProps,
      deps
    );
  }

  return {
    useProvider,
    useSelector,
    useDispatchToProps,
    useStateToProps,
    useDispatch,
    useStore
  };
};

/**
 * Default hooks.
 * This default hooks configured as 'PER_FACTORY' initialization.
 */
export const {
  useProvider,
  useSelector,
  useDispatch,
  useDispatchToProps,
  useStateToProps,
  useStore
} = generateReduxHooks();

export interface RRH {
  useProvider: typeof useProvider;
  useSelector: typeof useSelector;
  useDispatchToProps: typeof useDispatchToProps;
  useStateToProps: typeof useStateToProps;
  useDispatch: typeof useDispatch;
  useStore: typeof useStore;
}
