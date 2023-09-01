/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import { fromEvent, interval, merge, from } from "rxjs";
import { map, filter, scan, take, takeWhile } from "rxjs/operators";
import {
  Tick,
  MoveDown,
  MoveLeft,
  MoveRight,
  Rotate,
  HoldBlock,
  GameEnd,
  Utils,
  ResetBoard,
} from "./state.ts";
import type { Action } from "./state.ts";

export type { State };
export {
  getRandBlock,
  initialBlockState,
  initialState,
  generateRandom,
  getBlockRotation,
  Constants,
};

/** Constants */

const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
  PREVIEW_WIDTH: 160,
  PREVIEW_HEIGHT: 80,
} as const;

const Constants = {
  TICK_RATE_MS: 500,
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
  BLOCKS_BEFORE_NEW_ROW: 15,
} as const;

const Block = {
  WIDTH: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
  HEIGHT: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
};

/** User input */

type Key = "KeyS" | "KeyA" | "KeyD" | "KeyW" | "Space" | "KeyR" | "KeyH";

type Event = "keydown" | "keyup" | "keypress";

type Blocks =
  | "lBlock"
  | "tBlock"
  | "iBlock"
  | "oBlock"
  | "jBlock"
  | "sBlock"
  | "zBlock";

/** Utility functions */
const getRandBlock = (seed: number) => {
  const blockTypes = [
    "lBlock",
    "tBlock",
    "iBlock",
    "oBlock",
    "jBlock",
    "sBlock",
    "zBlock",
  ];
  const rand = Math.floor(seed % blockTypes.length);
  return blockTypes[rand];
};

//generates a random number using the given seed
const generateRandom = (seed: number) => {
  const a = 1103515245;
  const c = 12345;
  const m = 2 ** 31;

  return Math.floor((a * seed + c) % m);
};

//returns the rotation states for each block according to Nintendo's Tetris rotation system
const getBlockRotation = (blockType: string) => {
  const blockTypes = [
    "lBlock",
    "tBlock",
    "iBlock",
    "jBlock",
    "sBlock",
    "zBlock",
    "oBlock",
  ];

  //all block rotation states
  const zBlockRotation = [
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 0 },
    ],
  ];

  const sBlockRotation = [
    [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 0 },
    ],
  ];

  const iBlockRotation = [
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ],
  ];

  const tBlockRotation = [
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 1 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 0 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
    ],
  ];

  const lBlockRotation = [
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 0 },
    ],
  ];

  const jBlockRotation = [
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 0 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
  ];

  const oBlockRotation = [
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
  ];

  const blockFunc = [
    lBlockRotation,
    tBlockRotation,
    iBlockRotation,
    jBlockRotation,
    sBlockRotation,
    zBlockRotation,
    oBlockRotation,
  ];
  return blockFunc[blockTypes.indexOf(blockType)];
};

/** States */
//Blueprint for Game State
type State = Readonly<{
  gameEnd: boolean;
  totalPlaced: number;
  allCoords: readonly { x: number; y: number; color: string }[];
  blockState: BlockState;
  nextBlock: string;
  holdBlock: string;
  time: number;
  score: number;
  level: number;
  highScore: number;
}>;

//Blueprint for a block
type BlockState = {
  x: number;
  y: number;
  rotation: number;
  type: string;
  height: number;
  leftWidth: number;
  rightWidth: number;
  color: string;
  blockCoords: readonly { x: number; y: number }[];
};

//initial block state
const initialBlockState: BlockState = {
  x: 4,
  y: -1,
  rotation: 0,
  height: 1,
  leftWidth: 1,
  rightWidth: 1,
  type: getRandBlock(generateRandom(0)),
  blockCoords: [],
  color: "",
} as const;

//initial game state
const initialState: State = {
  gameEnd: false,
  time: 0,
  totalPlaced: 0,
  allCoords: [],
  blockState: initialBlockState,
  holdBlock: getRandBlock(generateRandom(2)),
  nextBlock: getRandBlock(generateRandom(4)),
  score: 0,
  level: 1,
  highScore: 0,
} as const;

/** Rendering (side effects) */

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
  elem.setAttribute("visibility", "visible");
  elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
  elem.setAttribute("visibility", "hidden");

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
  namespace: string | null,
  name: string,
  props: Record<string, string> = {}
) => {
  const elem = document.createElementNS(namespace, name) as SVGElement;
  Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
  return elem;
};

/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */
export function main() {
  // Canvas elements
  const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
    HTMLElement;
  const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
    HTMLElement;
  const hold = document.querySelector("#svgHold") as SVGGraphicsElement &
    HTMLElement;
  const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
    HTMLElement;
  const container = document.querySelector("#main") as HTMLElement;

  svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
  svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
  preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
  preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);
  hold.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
  hold.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);

  // Text fields
  const levelText = document.querySelector("#levelText") as HTMLElement;
  const scoreText = document.querySelector("#scoreText") as HTMLElement;
  const highScoreText = document.querySelector("#highScoreText") as HTMLElement;
  const timeText = document.querySelector("#timeText") as HTMLElement;
  const newRow = document.querySelector("#newRow") as HTMLElement;

  /** User input */

  const key$ = fromEvent<KeyboardEvent>(document, "keypress");

  const fromKey = (keyCode: Key) =>
    key$.pipe(filter(({ code }) => code === keyCode));

  const left$ = fromKey("KeyA").pipe(map(() => new MoveLeft()));
  const right$ = fromKey("KeyD").pipe(map(() => new MoveRight()));
  const down$ = fromKey("KeyS").pipe(map(() => new MoveDown()));
  const up$ = fromKey("KeyW").pipe(map(() => new Rotate()));
  const reset$ = fromKey("KeyR").pipe(map(() => new ResetBoard()));
  const hold$ = fromKey("KeyH").pipe(map(() => new HoldBlock()));
  // const next$ = fromKey("Space").pipe(map(() => new NextBlock()));

  /** Observables */

  /** Determines the rate of time steps */
  const tick$ = interval(Constants.TICK_RATE_MS).pipe(
    map((elapsed) => new Tick(elapsed))
  );

  const end$ = interval(100).pipe(map(() => new GameEnd()));

  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   *
   * @param s Current state
   */
  const render = (s: State) => {
    // Add blocks to the main grid canvas

    //clears the svg so that blocks that have been drawn previously wont stay when we redraw
    svg
      .querySelectorAll("rect")
      .forEach((elem) =>
        elem.getAttribute("id") == "gameOverRect" ? null : elem.remove()
      );
    preview.innerHTML = "";
    hold.innerHTML = "";

    //creates a cube at the given coordinates with the given color for the given svg element
    const createCube = (
      x: number,
      y: number,
      color: string,
      svgblock: SVGGraphicsElement & HTMLElement
    ) => {
      const cube = createSvgElement(svgblock.namespaceURI, "rect", {
        height: `${Block.HEIGHT}`,
        width: `${Block.WIDTH}`,
        x: `${x * Block.WIDTH}`,
        y: `${y * Block.HEIGHT}`,
        style: `fill: ${color}`,
      });
      svgblock.appendChild(cube);
    };

    //creates an OBlock at given blockState
    const createOBlock = (
      blockState: BlockState,
      svgblock: SVGGraphicsElement & HTMLElement
    ) => {
      blockState.color = "yellow";

      createCube(blockState.x, blockState.y + 1, "yellow", svgblock);
      createCube(blockState.x + 1, blockState.y + 1, "yellow", svgblock);
      createCube(blockState.x, blockState.y + 2, "yellow", svgblock);
      createCube(blockState.x + 1, blockState.y + 2, "yellow", svgblock);
      blockState.height = 2;
      blockState.leftWidth = 2;
      blockState.rightWidth = 1;

      blockState.blockCoords = [
        { x: blockState.x, y: blockState.y + 1 },
        { x: blockState.x + 1, y: blockState.y + 1 },
        { x: blockState.x, y: blockState.y + 2 },
        { x: blockState.x + 1, y: blockState.y + 2 },
      ];
    };

    //creates an IBlock at given blockState
    const createIBlock = (
      blockState: BlockState,
      svgblock: SVGGraphicsElement & HTMLElement
    ) => {
      const iBlockRotation = getBlockRotation("iBlock");
      const rotationState =
        iBlockRotation[blockState.rotation % iBlockRotation.length];
      blockState.blockCoords = rotationState.map((cube) => ({
        x: blockState.x + cube.x,
        y: blockState.y + cube.y,
      }));
      blockState.color = "cyan";

      rotationState.forEach((cube) => {
        createCube(
          blockState.x + cube.x,
          blockState.y + cube.y,
          "cyan",
          svgblock
        );
      });

      blockState.rotation % 2 == 0
        ? ((blockState.height = 1),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 3))
        : ((blockState.height = 3),
          (blockState.leftWidth = 1),
          (blockState.rightWidth = 1));
    };

    //creates a TBlock at given blockState
    const createTBlock = (
      blockState: BlockState,
      svgblock: SVGGraphicsElement & HTMLElement
    ) => {
      const tBlockRotation = getBlockRotation("tBlock");
      const rotationState =
        tBlockRotation[blockState.rotation % tBlockRotation.length];
      blockState.blockCoords = rotationState.map((cube) => ({
        x: s.blockState.x + cube.x,
        y: s.blockState.y + cube.y,
      }));
      blockState.color = "purple";

      rotationState.forEach((cube) => {
        createCube(
          blockState.x + cube.x,
          blockState.y + cube.y,
          "purple",
          svgblock
        );
      });
      blockState.rotation % 4 == 0
        ? ((blockState.height = 2),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 2))
        : blockState.rotation % 4 == 1
        ? ((blockState.height = 2),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 1))
        : blockState.rotation % 4 == 2
        ? ((blockState.height = 1),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 2))
        : ((blockState.height = 2),
          (blockState.leftWidth = 1),
          (blockState.rightWidth = 2));
    };

    //creates an LBlock at given blockState
    const createLBlock = (
      blockState: BlockState,
      svgblock: SVGGraphicsElement & HTMLElement
    ) => {
      const lBlockRotation = getBlockRotation("lBlock");
      const rotationState =
        lBlockRotation[blockState.rotation % lBlockRotation.length];
      blockState.blockCoords = rotationState.map((cube) => ({
        x: blockState.x + cube.x,
        y: blockState.y + cube.y,
      }));
      blockState.color = "orange";

      rotationState.forEach((cube) => {
        createCube(
          blockState.x + cube.x,
          blockState.y + cube.y,
          "orange",
          svgblock
        );
      });
      blockState.rotation % 4 == 0
        ? ((blockState.height = 2),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 2))
        : blockState.rotation % 4 == 1
        ? ((blockState.height = 2),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 1))
        : blockState.rotation % 4 == 2
        ? ((blockState.height = 1),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 2))
        : ((blockState.height = 2),
          (blockState.leftWidth = 1),
          (blockState.rightWidth = 2));
    };

    //creates a JBlock at given blockState
    const createJBlock = (
      blockState: BlockState,
      svgblock: SVGGraphicsElement & HTMLElement
    ) => {
      const jBlockRotation = getBlockRotation("jBlock");
      const rotationState =
        jBlockRotation[blockState.rotation % jBlockRotation.length];
      blockState.blockCoords = rotationState.map((cube) => ({
        x: blockState.x + cube.x,
        y: blockState.y + cube.y,
      }));
      blockState.color = "blue";

      rotationState.forEach((cube) => {
        createCube(
          blockState.x + cube.x,
          blockState.y + cube.y,
          "blue",
          svgblock
        );
      });
      blockState.rotation % 4 == 0
        ? ((blockState.height = 2),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 2))
        : blockState.rotation % 4 == 1
        ? ((blockState.height = 2),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 1))
        : blockState.rotation % 4 == 2
        ? ((blockState.height = 1),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 2))
        : ((blockState.height = 2),
          (blockState.leftWidth = 1),
          (blockState.rightWidth = 2));
    };

    //creates a ZBlock at given blockState
    const createZBlock = (
      blockState: BlockState,
      svgblock: SVGGraphicsElement & HTMLElement
    ) => {
      const zBlockRotation = getBlockRotation("zBlock");
      const rotationState =
        zBlockRotation[blockState.rotation % zBlockRotation.length];
      blockState.blockCoords = rotationState.map((cube) => ({
        x: s.blockState.x + cube.x,
        y: s.blockState.y + cube.y,
      }));
      blockState.color = "red";

      rotationState.forEach((cube) => {
        createCube(
          blockState.x + cube.x,
          blockState.y + cube.y,
          "red",
          svgblock
        );
      });
      blockState.rotation % 2 == 0
        ? ((blockState.height = 2),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 2))
        : ((blockState.height = 2),
          (blockState.leftWidth = 1),
          (blockState.rightWidth = 2));
    };

    //creates an SBlock at given blockState
    const createSBlock = (
      blockState: BlockState = initialBlockState,
      svgblock: SVGGraphicsElement & HTMLElement
    ) => {
      const sBlockRotation = getBlockRotation("sBlock");
      const rotationState =
        sBlockRotation[blockState.rotation % sBlockRotation.length];
      blockState.blockCoords = rotationState.map((cube) => ({
        x: s.blockState.x + cube.x,
        y: s.blockState.y + cube.y,
      }));
      blockState.color = "green";

      rotationState.forEach((cube) => {
        createCube(
          blockState.x + cube.x,
          blockState.y + cube.y,
          "green",
          svgblock
        );
      });

      blockState.rotation % 2 == 0
        ? ((blockState.height = 2),
          (blockState.leftWidth = 2),
          (blockState.rightWidth = 2))
        : ((blockState.height = 2),
          (blockState.leftWidth = 1),
          (blockState.rightWidth = 2));
    };

    //creates a static block to display preview and hold blocks
    const staticBlock = (
      blockState: BlockState,
      svgblock: SVGGraphicsElement & HTMLElement
    ) => {
      const blockTypes = [
        "lBlock",
        "tBlock",
        "iBlock",
        "oBlock",
        "jBlock",
        "sBlock",
        "zBlock",
      ];
      const blockFunc = [
        createLBlock,
        createTBlock,
        createIBlock,
        createOBlock,
        createJBlock,
        createSBlock,
        createZBlock,
      ];
      blockFunc[blockTypes.indexOf(blockState.type)](blockState, svgblock);
    };

    //creates the current block from the state's blockState
    const createBlock = (s: State) => {
      const blockTypes = [
        "lBlock",
        "tBlock",
        "iBlock",
        "oBlock",
        "jBlock",
        "sBlock",
        "zBlock",
      ];
      const blockFunc = [
        createLBlock,
        createTBlock,
        createIBlock,
        createOBlock,
        createJBlock,
        createSBlock,
        createZBlock,
      ];
      blockFunc[blockTypes.indexOf(s.blockState.type)](s.blockState, svg);
    };
    createBlock(s);

    //creates all the cubes that currently exist in the allCoords array
    s.allCoords.map((coord) => {
      createCube(coord.x, coord.y, coord.color, svg);
    });

    //creates the preview and hold blocks
    staticBlock(
      {
        x: 2,
        y: 0,
        rotation: 0,
        type: s.nextBlock,
        height: 0,
        color: "",
        leftWidth: 0,
        rightWidth: 0,
        blockCoords: [],
      },
      preview
    );
    staticBlock(
      {
        x: 2,
        y: 0,
        rotation: 0,
        type: s.holdBlock,
        height: 0,
        color: "",
        leftWidth: 0,
        rightWidth: 0,
        blockCoords: [],
      },
      hold
    );
  };

  const source$ = merge(tick$, left$, right$, down$, up$, reset$, hold$, end$)
    .pipe(scan((s: State, a: Action) => a.apply(s), initialState))
    .subscribe((s: State) => {
      //re-renders board
      render(s);

      levelText.innerHTML = `${s.level}`;
      scoreText.innerHTML = `${s.score}`;
      highScoreText.innerHTML = `${s.highScore}`;
      const minutes = `${Math.floor(s.time / (60 * 2))}`;
      const seconds = `${Math.round(s.time) % 60}`;
      timeText.innerHTML = `${minutes.padStart(2, "0")} : ${seconds.padStart(
        2,
        "0"
      )}`;
      newRow.innerHTML =
        s.totalPlaced %
          Math.max(Constants.BLOCKS_BEFORE_NEW_ROW - s.level, 2) !=
        0
          ? `New row in: ${
              Math.max(Constants.BLOCKS_BEFORE_NEW_ROW - s.level, 2) -
              (s.totalPlaced %
                Math.max(Constants.BLOCKS_BEFORE_NEW_ROW - s.level, 2))
            } blocks`
          : "NEW ROW INCOMING";

      if (s.gameEnd) {
        show(gameover);
      } else {
        hide(gameover);
      }
    });
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
