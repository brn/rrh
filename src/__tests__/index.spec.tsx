/**
 * @fileoverview
 * @author Taketoshi Aono
 */

import ReactTestUtils from "react-dom/test-utils";
import React, { useContext, useState } from "react";
import {
  RRH,
  generateReduxHooks,
  useSelector,
  RRHStoreInitilizationTiming,
  useStore
} from "../index";
import * as assert from "power-assert";
import nodeAssert from "assert";
import ReactTestRenderer from "react-test-renderer";

describe("generateReduxHooks()", () => {
  type State = { count: number };
  const Child = ({ hooks }: { hooks: RRH }) => {
    const state = hooks.useStateToProps({}, (state: State) => state);
    return <div>{state.count}</div>;
  };
  const Renderer = ({
    count,
    hooks,
    ChildComponent = Child
  }: State & {
    hooks: RRH;
    ChildComponent?: React.FunctionComponent<{ hooks: RRH }>;
  }) => {
    const Provider = hooks.useProvider(() => {
      return {
        reducer: (s: State = { count: 0 }, a) => {
          if (a.type === "UPDATE") {
            return a.payload;
          }
          return s;
        },
        preloadedState: {
          count
        }
      };
    });
    return (
      <Provider>
        <ChildComponent hooks={hooks} />
      </Provider>
    );
  };

  it("should generate new hooks", () => {
    const hooks = generateReduxHooks();
    assert.strictEqual(
      Object.keys(hooks)
        .sort()
        .join(","),
      [
        "useDispatch",
        "useDispatchToProps",
        "useProvider",
        "useSelector",
        "useStateToProps",
        "useStore"
      ].join(",")
    );
  });

  it("should generate per factory hooks", () => {
    const hooks = generateReduxHooks();
    assert.deepStrictEqual(
      ReactTestRenderer.create(<Renderer hooks={hooks} count={3} />).toJSON(),
      {
        type: "div",
        props: {},
        children: ["3"]
      }
    );
    assert.deepStrictEqual(
      ReactTestRenderer.create(<Renderer hooks={hooks} count={4} />).toJSON(),
      {
        type: "div",
        props: {},
        children: ["3"]
      }
    );
  });

  it("should generate per mount hooks", () => {
    const hooks = generateReduxHooks({
      initializationTiming: RRHStoreInitilizationTiming.EACH_MOUNT
    });
    assert.deepStrictEqual(
      ReactTestRenderer.create(<Renderer hooks={hooks} count={3} />).toJSON(),
      {
        type: "div",
        props: {},
        children: ["3"]
      }
    );
    assert.deepStrictEqual(
      ReactTestRenderer.create(<Renderer hooks={hooks} count={4} />).toJSON(),
      {
        type: "div",
        props: {},
        children: ["4"]
      }
    );
  });

  describe("useSelector()", () => {
    function renderTestComponent({
      isPassFunction = false,
      isUseStateValue = false,
      getDeps
    }: {
      getDeps?(props: any): any[];
      isPassFunction?: boolean;
      isUseStateValue?: boolean;
    } = {}): [ReactTestRenderer.ReactTestRenderer, () => void] {
      const hooks = generateReduxHooks();
      let onClick: () => void = () => {};
      let count = 3;
      const Child = ({ hooks }: { hooks: RRH }) => {
        const [state, update] = useState({});
        const args: [any, any, any] = [
          state,
          d => {
            return { onClick: () => d({ type: "CLICK" }) };
          },
          (s: State) => {
            return { testCount: isUseStateValue ? s.count : count++ };
          }
        ];
        const selected: any = !getDeps
          ? hooks.useSelector(...args)
          : hooks.useSelector(
              ...([...args, isPassFunction ? getDeps : getDeps(state)] as [
                any,
                any,
                any,
                any
              ])
            );

        onClick = () => update({});

        return <div>{selected.testCount}</div>;
      };

      const rendered = ReactTestRenderer.create(
        <Renderer hooks={hooks} count={3} ChildComponent={Child} />
      );

      return [rendered, onClick];
    }

    it("should select state", () => {
      const [rendered] = renderTestComponent();

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });
    });

    it("should update if props updated", () => {
      const [rendered, onClick] = renderTestComponent();
      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });

      ReactTestRenderer.act(() => {
        onClick();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["4"]
      });
    });

    it("should skip update if deps is empty", () => {
      const [rendered, onClick] = renderTestComponent({ getDeps: s => [] });
      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });

      ReactTestRenderer.act(() => {
        onClick();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });
    });

    it("should check update if deps is specified", () => {
      const [rendered, onClick] = renderTestComponent({ getDeps: s => [s] });
      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });

      ReactTestRenderer.act(() => {
        onClick();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["4"]
      });
    });

    it("should check update if deps selector is specified", () => {
      const [rendered, onClick] = renderTestComponent({
        getDeps: s => [s.count],
        isPassFunction: true
      });
      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });

      ReactTestRenderer.act(() => {
        onClick();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });
    });
  });

  describe("useStateToProps()", () => {
    function renderTestComponent({
      isPassFunction = false,
      isUseStateValue = false,
      getDeps
    }: {
      getDeps?(props: any): any[];
      isPassFunction?: boolean;
      isUseStateValue?: boolean;
    } = {}): [ReactTestRenderer.ReactTestRenderer, () => void] {
      const hooks = generateReduxHooks();
      let onClick: () => void = () => {};
      let count = 3;
      const Child = ({ hooks }: { hooks: RRH }) => {
        const [state, update] = useState({});
        const args: [any, any] = [
          state,
          (s: State) => {
            return { testCount: isUseStateValue ? s.count : count++ };
          }
        ];
        const selected: any = !getDeps
          ? hooks.useStateToProps(...args)
          : hooks.useStateToProps(
              ...([...args, isPassFunction ? getDeps : getDeps(state)] as [
                any,
                any,
                any
              ])
            );

        onClick = () => update({});

        return <div>{selected.testCount}</div>;
      };

      const rendered = ReactTestRenderer.create(
        <Renderer hooks={hooks} count={3} ChildComponent={Child} />
      );

      return [rendered, onClick];
    }

    it("should state to props", () => {
      const [rendered] = renderTestComponent();

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });
    });

    it("should update if props updated", () => {
      const [rendered, onClick] = renderTestComponent();
      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });

      ReactTestRenderer.act(() => {
        onClick();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["4"]
      });
    });

    it("should skip update if deps is empty", () => {
      const [rendered, onClick] = renderTestComponent({ getDeps: s => [] });
      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });

      ReactTestRenderer.act(() => {
        onClick();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });
    });

    it("should check update if deps is specified", () => {
      const [rendered, onClick] = renderTestComponent({ getDeps: s => [s] });
      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });

      ReactTestRenderer.act(() => {
        onClick();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["4"]
      });
    });

    it("should check update if deps selector is specified", () => {
      const [rendered, onClick] = renderTestComponent({
        getDeps: s => [s.count],
        isPassFunction: true
      });
      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });

      ReactTestRenderer.act(() => {
        onClick();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });
    });
  });

  describe("useDispatchToProps()", () => {
    function renderTestComponent(
      getDeps?: (props: any) => any[]
    ): [ReactTestRenderer.ReactTestRenderer, () => void, () => void] {
      const hooks = generateReduxHooks();
      let onClick: () => void = () => {};
      let onDispatch: () => void = () => {};
      let called = 0;
      const Child = ({ hooks }: { hooks: RRH }) => {
        const [state, update] = useState({});
        const args: [any, any] = [
          state,
          d => {
            called++;
            return {
              onTest: () => d({ type: "UPDATE", payload: { count: 10 } })
            };
          }
        ];
        const selected: any = !getDeps
          ? hooks.useDispatchToProps(...args)
          : hooks.useDispatchToProps(
              ...([...args, getDeps(state)] as [any, any, any])
            );
        const p = hooks.useStateToProps({}, (s: State) => s);

        onClick = () => update({});
        onDispatch = selected.onTest;

        return <div>{`${called}:${p.count}`}</div>;
      };

      const rendered = ReactTestRenderer.create(
        <Renderer hooks={hooks} count={3} ChildComponent={Child} />
      );

      return [rendered, onClick, onDispatch];
    }

    it("should state to props", () => {
      const [rendered] = renderTestComponent();

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["1:3"]
      });
    });

    it("should update if props updated", () => {
      const [rendered, onClick] = renderTestComponent();
      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["1:3"]
      });

      ReactTestRenderer.act(() => {
        onClick();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["2:3"]
      });
    });

    it("should skip update if deps is empty", () => {
      const [rendered, onClick] = renderTestComponent(s => []);
      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["1:3"]
      });

      ReactTestRenderer.act(() => {
        onClick();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["1:3"]
      });
    });

    it("should check update if deps is specified", () => {
      const [rendered, onClick] = renderTestComponent(s => [s]);
      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["1:3"]
      });

      ReactTestRenderer.act(() => {
        onClick();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["2:3"]
      });
    });

    it("should dispatch reducer", () => {
      const [rendered, _, onDispatch] = renderTestComponent();

      ReactTestRenderer.act(() => {
        onDispatch();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["1:10"]
      });
    });
  });

  describe("useDispatch()", () => {
    it("should dispatch reducer", () => {
      const hooks = generateReduxHooks();

      let onDispatch: () => void = () => {};

      const Child = ({ hooks }: { hooks: RRH }) => {
        const p = hooks.useDispatch();
        const state = hooks.useStateToProps({}, (s: State) => s);
        onDispatch = () => p({ type: "UPDATE", payload: { count: 10 } });

        return <div>{`${state.count}`}</div>;
      };

      const rendered = ReactTestRenderer.create(
        <Renderer hooks={hooks} count={3} ChildComponent={Child} />
      );

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });

      ReactTestRenderer.act(() => {
        onDispatch();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["10"]
      });
    });
  });

  describe("useStore()", () => {
    it("should dispatch reducer", () => {
      const hooks = generateReduxHooks();

      let onDispatch: () => void = () => {};

      const Child = ({ hooks }: { hooks: RRH }) => {
        const store = hooks.useStore();
        onDispatch = () =>
          store.dispatch({ type: "UPDATE", payload: { count: 10 } });

        return <div>{`${store.getState().count}`}</div>;
      };

      const rendered = ReactTestRenderer.create(
        <Renderer hooks={hooks} count={3} ChildComponent={Child} />
      );

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["3"]
      });

      ReactTestRenderer.act(() => {
        onDispatch();
      });

      assert.deepStrictEqual(rendered.toJSON(), {
        type: "div",
        props: {},
        children: ["10"]
      });
    });
  });
});
