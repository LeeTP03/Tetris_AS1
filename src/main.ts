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
import {Tick, MoveDown, MoveLeft, MoveRight, NextBlock, BlockSave, Rotate} from "./state.ts"
import type {Action} from "./state.ts"

export type {State}
export {getRandBlock}

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
} as const;

const Block = {
  WIDTH: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
  HEIGHT: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
};

/** User input */

type Key = "KeyS" | "KeyA" | "KeyD" | "KeyW" | "Space";

type Event = "keydown" | "keyup" | "keypress";

type Blocks = "lBlock" | "tBlock" | "iBlock" | "oBlock" | "jBlock" | "sBlock" | "zBlock";

/** Utility functions */
const getRandBlock = () => {
  const blockTypes = ["lBlock", "tBlock", "iBlock", "oBlock", "jBlock", "sBlock", "zBlock"]
  const rand = Math.floor(Math.random() * blockTypes.length);
  return blockTypes[rand] ;
}
/** State processing */

type State = {
  gameEnd: boolean;
  allBlocks: BlockState[];
  blockState: BlockState;
  nextBlock: string;
  time: number;
  score: number;
  level: number;
  highScore: number;
};

const initialBlockState: BlockState = {
  x: 4,
  y: -1,
  rotation: 0,
  startHeight: 0,
  height: 1,
  leftWidth: 1,
  rightWidth: 1,
  type : getRandBlock(),
  rotationPoint : 1,
} as const;

const initialState: State = {
  gameEnd: false,
  time: 0,
  allBlocks: [],
  blockState: initialBlockState,
  nextBlock: getRandBlock(),
  score: 0,
  level: 0,
  highScore: 0,
} as const;

type BlockState = {
  x: number;
  y: number;
  rotation: number;
  type: string;
  height: number;
  leftWidth: number;
  rightWidth: number;
  rotationPoint: number;
  startHeight?: number;
};


/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State) => {
  return s;
};

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
  const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
    HTMLElement;
  const container = document.querySelector("#main") as HTMLElement;

  svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
  svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
  preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
  preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);

  // Text fields
  const levelText = document.querySelector("#levelText") as HTMLElement;
  const scoreText = document.querySelector("#scoreText") as HTMLElement;
  const highScoreText = document.querySelector("#highScoreText") as HTMLElement;
  const timeText = document.querySelector("#timeText") as HTMLElement;

  /** User input */

  const key$ = fromEvent<KeyboardEvent>(document, "keypress");

  const fromKey = (keyCode: Key) =>
    key$.pipe(filter(({ code }) => code === keyCode));

  const left$ = fromKey("KeyA").pipe(map(() => new MoveLeft()));
  const right$ = fromKey("KeyD").pipe(map(() => new MoveRight()));
  const down$ = fromKey("KeyS").pipe(map(() => new MoveDown()));
  const up$ = fromKey("KeyW").pipe(map(() => new Rotate()));
  const next$ = fromKey("Space").pipe(map(() => new NextBlock()));

  /** Observables */

  /** Determines the rate of time steps */
  const tick$ = interval(Constants.TICK_RATE_MS).pipe(
    map((elapsed) => new Tick(elapsed))
  );

  //Block Rotations

  const zBlockRotation = [
  [{x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: 2}, {x: 2, y: 2}],
  [{x: 1, y: 1}, {x: 2, y: 1}, {x: 1, y: 2}, {x: 2, y: 0}]
  ];

  const sBlockRotation = [
    [{x: 0, y: 2}, {x: 1, y: 2}, {x: 1, y: 1}, {x: 2, y: 1}],
    [{x: 1, y: 1}, {x: 2, y: 1}, {x: 2, y: 2}, {x: 1, y: 0}]
  ];

  const iBlockRotation = [
    [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x:3, y: 0}],
    [{x: 1, y: -1}, {x: 1, y: 0}, {x: 1, y: 1}, {x:1, y: 2}]
  ];

  const tBlockRotation = [
    [{x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x:1, y: 2}],
    [{x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}, {x:0, y: 1}],
    [{x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x:1, y: 0}],
    [{x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}, {x:2, y: 1}]
  ];

  const lBlockRotation = [
    [{x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x:2, y: 2}],
    [{x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}, {x:0, y: 2}],
    [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x:2, y: 1}],
    [{x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}, {x:2, y: 0}]
  ];

  const jBlockRotation = [
    [{x: 0, y: 1}, {x: 1, y: 1}, {x: 0, y: 2}, {x:2, y: 1}],
    [{x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}, {x:0, y: 0}],
    [{x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x:2, y: 0}],
    [{x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}, {x:2, y: 2}],
  ];



  
  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   *
   * @param s Current state
   */
  const render = (s: State) => {
    // Add blocks to the main grid canvas
    svg.innerHTML = ""
    preview.innerHTML = "";
      

    const createCube = (x:number ,y:number, color:string, svgblock : SVGGraphicsElement & HTMLElement = svg) => {
      const cube = createSvgElement(svgblock.namespaceURI, "rect", {
        height: `${Block.HEIGHT}`,
        width: `${Block.WIDTH}`,
        x: `${x * Block.WIDTH}`,
        y: `${y * Block.HEIGHT}`,
        style: `fill: ${color}`,
      });
      svgblock.appendChild(cube);
    }

    const createOBlock = (blockState: BlockState = initialBlockState, svgblock : SVGGraphicsElement & HTMLElement) => {
      createCube(blockState.x, blockState.y+1, "green", svgblock);
      createCube(blockState.x + 1, blockState.y+1, "green", svgblock);
      createCube(blockState.x , blockState.y + 2, "green", svgblock);
      createCube(blockState.x + 1, blockState.y + 2 , "green", svgblock);
      blockState.height = 2;
      blockState.leftWidth = 2;
      blockState.rightWidth = 1;
    };

    const createIBlock = (blockState: BlockState = initialBlockState, svgblock : SVGGraphicsElement & HTMLElement) => {
      const rotationState = iBlockRotation[blockState.rotation % iBlockRotation.length];
      rotationState.forEach((cube) => {
        createCube(blockState.x + cube.x, blockState.y + cube.y, "blue", svgblock);
      });
      blockState.rotation % 2 == 0 
      ? (blockState.height = 0, blockState.leftWidth = 2, blockState.rightWidth = 3) 
      : (blockState.height = 2, blockState.leftWidth = 1, blockState.rightWidth = 1)
    };

    const createTBlock = (blockState: BlockState = initialBlockState, svgblock : SVGGraphicsElement & HTMLElement) => {
      const rotationState = tBlockRotation[blockState.rotation % tBlockRotation.length];
      rotationState.forEach((cube) => {
        createCube(blockState.x + cube.x, blockState.y + cube.y, "purple", svgblock);
      });
      blockState.rotation % 4 == 0 
      ? (blockState.height = 2, blockState.leftWidth = 2, blockState.rightWidth = 2)
      : blockState.rotation % 4 == 1  
      ? (blockState.height = 2, blockState.leftWidth = 2, blockState.rightWidth = 1)
      : blockState.rotation % 4 == 2
      ? (blockState.height = 1, blockState.leftWidth = 2, blockState.rightWidth = 2)
      : (blockState.height = 2, blockState.leftWidth = 1, blockState.rightWidth = 2)
    };

    const createLBlock = (blockState: BlockState = initialBlockState, svgblock : SVGGraphicsElement & HTMLElement) => {
      const rotationState = lBlockRotation[blockState.rotation % lBlockRotation.length];
      rotationState.forEach((cube) => {
        createCube(blockState.x + cube.x, blockState.y + cube.y, "orange", svgblock);
      });
      blockState.rotation % 4 == 0 
      ? (blockState.height = 2, blockState.leftWidth = 2, blockState.rightWidth = 2)
      : blockState.rotation % 4 == 1  
      ? (blockState.height = 2, blockState.leftWidth = 2, blockState.rightWidth = 1)
      : blockState.rotation % 4 == 2
      ? (blockState.height = 1, blockState.leftWidth = 2, blockState.rightWidth = 2)
      : (blockState.height = 2, blockState.leftWidth = 1, blockState.rightWidth = 2)
    };

    const createJBlock = (blockState: BlockState = initialBlockState, svgblock : SVGGraphicsElement & HTMLElement) => {
      const rotationState = jBlockRotation[blockState.rotation % jBlockRotation.length];
      rotationState.forEach((cube) => {
        createCube(blockState.x + cube.x, blockState.y + cube.y, "cyan", svgblock);
      });
      blockState.rotation % 4 == 0 
      ? (blockState.height = 2, blockState.leftWidth = 2, blockState.rightWidth = 2)
      : blockState.rotation % 4 == 1  
      ? (blockState.height = 2, blockState.leftWidth = 2, blockState.rightWidth = 1)
      : blockState.rotation % 4 == 2
      ? (blockState.height = 1, blockState.leftWidth = 2, blockState.rightWidth = 2)
      : (blockState.height = 2, blockState.leftWidth = 1, blockState.rightWidth = 2)
    };

    const createZBlock = (blockState: BlockState = initialBlockState, svgblock : SVGGraphicsElement & HTMLElement) => {
      const rotationState = zBlockRotation[blockState.rotation % zBlockRotation.length];
      rotationState.forEach((cube) => {
        createCube(blockState.x + cube.x, blockState.y + cube.y, "yellow", svgblock);
      });
      blockState.rotation % 2 == 0 
      ? (blockState.height = 2, blockState.leftWidth = 2, blockState.rightWidth = 2) 
      : (blockState.height = 2, blockState.leftWidth = 1, blockState.rightWidth = 2)
    };

    const createSBlock = (blockState: BlockState = initialBlockState, svgblock : SVGGraphicsElement & HTMLElement) => {
      const rotationState = sBlockRotation[blockState.rotation % sBlockRotation.length];
      rotationState.forEach((cube) => {
        createCube(blockState.x + cube.x, blockState.y + cube.y, "red", svgblock);
      });
      blockState.rotation % 2 == 0 
      ? (blockState.height = 2, blockState.leftWidth = 2, blockState.rightWidth = 2) 
      :(blockState.height = 2, blockState.leftWidth = 1, blockState.rightWidth = 2)
    };

    const staticBlock = (blockState: BlockState, svgblock : SVGGraphicsElement & HTMLElement ) => {
      const blockTypes = ["lBlock", "tBlock", "iBlock", "oBlock", "jBlock", "sBlock", "zBlock"]
      const blockFunc = [createOBlock, createIBlock, createTBlock, createLBlock, createJBlock, createSBlock, createZBlock];
      blockFunc[blockTypes.indexOf(blockState.type)](blockState, svgblock);
    }

    const createBlock = (s : State) => {
      const blockTypes = ["lBlock", "tBlock", "iBlock", "oBlock", "jBlock", "sBlock", "zBlock"]
      const blockFunc = [createOBlock, createIBlock, createTBlock, createLBlock, createJBlock, createSBlock, createZBlock];
      blockFunc[blockTypes.indexOf(s.blockState.type)](s.blockState, svg);
    }
    createBlock(s);

    s.allBlocks.forEach((block) => {
      staticBlock(block, svg);
    });

    staticBlock({x: 2, y: 0, startHeight: 0, rotation: 0, type: s.nextBlock, height: 0, leftWidth: 0, rightWidth: 0, rotationPoint: 0}, preview)
    
    
  };

  const source$ = merge(tick$, left$, right$, down$, up$, next$)
    .pipe(scan((s: State, a: Action) => (a.apply(s)), initialState),
    takeWhile((s: State) => !s.gameEnd))
    .subscribe((s: State) => {
      Tick.collision(s) ? (
        Tick.boardOut(s) ? s.gameEnd = true : s.gameEnd = false,
        new BlockSave().apply(s),
        s.blockState = {...initialBlockState,
        type: s.nextBlock},
        s.nextBlock = getRandBlock()) : s.blockState = s.blockState;
      console.log(s.time, s.blockState);
      console.log(s.allBlocks)
      render(s);
      s.blockState.height + s.blockState.y >= 19 ? (new BlockSave().apply(s), s.blockState = {...initialBlockState, type: s.nextBlock}, s.nextBlock = getRandBlock()) : s.blockState = s.blockState;
      levelText.innerHTML = `${s.gameEnd}`;
      scoreText.innerHTML = `${s.score}`;
      highScoreText.innerHTML = `${s.highScore}`;
      timeText.innerHTML = `${Math.round(s.time/2)}`;
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