import { merge } from "rxjs";
import {
  State,
  getRandBlock,
  initialBlockState,
  initialState,
  getBlockRotation,
  generateRandom,
  Constants,
} from "./main.ts";

export {
  Tick,
  MoveLeft,
  MoveRight,
  MoveDown,
  Rotate,
  BlockSave,
  ResetBoard,
  HoldBlock,
  GameEnd,
  IncreaseLevel,
  AlterBoard,
  Utils,
  IncreaseScore,
  CheckRow,
  reduce,
};

export type { Action };

interface Action {
  apply(s: State): State;
}

class Tick implements Action {
  constructor(public readonly elapsed: number) {}

  apply = (s: State) => {
    return s.blockState.y + s.blockState.height >= 19 ||
      Utils.collision(s, 0, 1)
      ? new BlockSave().apply(s)
      : {
          ...s,
          time: s.time + 0.5,
          level: Math.floor(s.score / 500) + 1,
          blockState: {
            ...s.blockState,
            y:
              s.blockState.y + s.blockState.height >= 19 ||
              Utils.collision(s, 0, 1)
                ? s.blockState.y
                : s.blockState.y + 1,
          },
        };
  };
}

class Utils {
  static collision = (s: State, x_amount: number, y_amount: number) => {
    const truelist: boolean[] = s.blockState.blockCoords.map((coord) => {
      return this.checkCoordinate(s, coord.x + x_amount, coord.y + y_amount);
    });
    return truelist.includes(true);
  };

  static checkCoordinate = (s: State, coord_x: number, coord_y: number) => {
    const truelist: boolean[] = s.allCoords.map(
      (coord) => coord.x == coord_x && coord.y == coord_y
    );
    return truelist.includes(true);
  };

  static checkCoords = (
    coords: readonly { x: number; y: number }[],
    allCoords: readonly { x: number; y: number }[]
  ) =>
    coords.some((coord) =>
      allCoords.some((coord2) => coord.x === coord2.x && coord.y === coord2.y)
    );

  static checkBoundaries = (coords: { x: number; y: number }[]) =>
    coords.some((coord) => coord.x < 0 || coord.x > 9 || coord.y > 19);

  static overlap = (
    s: State,
    new_coords: { x: number; y: number }[] | null = null
  ) =>
    new_coords == null
      ? s.blockState.blockCoords
          .map((coord: { x: number; y: number }) =>
            this.checkCoordinate(s, coord.x, coord.y)
          )
          .includes(true)
      : new_coords
          .map(
            (coord) =>
              this.checkCoordinate(s, coord.x, coord.y) ||
              this.checkBoundaries(new_coords)
          )
          .includes(true);

  static checkRowFull = (s: State) => {
    const coordRowDict = s.allCoords.reduce(
      (acc: { [key: number]: number }, coord) => {
        return { ...acc, [coord.y]: (acc[coord.y] || 0) + 1 };
      },
      {}
    );
    return coordRowDict;
  };

  static removeRow = (
    s: State,
    row: number
  ): { x: number; y: number; color: string }[] => {
    const new_coords = s.allCoords.filter((coord) => {
      return coord.y != row;
    });
    const new_A = new_coords.map((coords) =>
      coords.y < row
        ? { x: coords.x, y: (coords.y += 1), color: coords.color }
        : coords
    );

    s = new IncreaseScore().apply(s);
    console.log(new_A);
    return new_A;
  };

  static remove = (s: State, row: number) => {
    const newc = s.allCoords.filter((coord) => {
      return coord.y != row;
    });
    return newc;
  };

  static addRow = (s: State) => {
    s.allCoords.map((coords) => {
      coords.y -= 1;
      return coords;
    });
  };
}

class MoveLeft implements Action {
  apply = (s: State) => ({
    ...s,
    blockState: {
      ...s.blockState,
      x:
        s.blockState.x - s.blockState.leftWidth < -1 ||
        Utils.collision(s, -1, 0)
          ? s.blockState.x
          : s.blockState.x - 1,
    },
  });
}

class MoveRight implements Action {
  apply = (s: State) => ({
    ...s,
    blockState: {
      ...s.blockState,
      x:
        s.blockState.x + s.blockState.rightWidth > 8 || Utils.collision(s, 1, 0)
          ? s.blockState.x
          : s.blockState.x + 1,
    },
  });
}

class MoveDown implements Action {
  apply = (s: State) => {
    return s.blockState.y + s.blockState.height >= 19 ||
      Utils.collision(s, 0, 1)
      ? new BlockSave().apply(s)
      : {
          ...s,
          blockState: {
            ...s.blockState,
            y:
              s.blockState.y + s.blockState.height >= 19 ||
              Utils.collision(s, 0, 1)
                ? s.blockState.y
                : s.blockState.y + 1,
          },
        };
  };
}

class Rotate implements Action {
  apply = (s: State) => {
    const blockRotation = getBlockRotation(s.blockState.type);
    const nextRotation =
      blockRotation[(s.blockState.rotation + 1) % blockRotation.length];
    const newCoords = nextRotation.map((coord) => ({
      x: coord.x + s.blockState.x,
      y: coord.y + s.blockState.y,
    }));

    return {
      ...s,
      blockState: {
        ...s.blockState,
        rotation: Utils.overlap(s, newCoords)
          ? s.blockState.rotation
          : s.blockState.rotation + 1,
      },
    };
  };
}

class BlockSave implements Action {
  apply = (s: State) => {
    //generate random number for empty block on extra difficulty row
    const rand = generateRandom(s.time) % 8;

    s.blockState.blockCoords.map((coord) => {
      s = new AddCoord({
        x: coord.x,
        y: coord.y,
        color: s.blockState.color,
      }).apply(s);
    });

    //checks if row should be added on Utils block placement, interval between rows is affected by level, higher level = higher difficulty
    //because interval between rows being added is smaller. Minimum 2 block placements between rows being added
    s.totalPlaced % Math.max(Constants.BLOCKS_BEFORE_NEW_ROW - s.level, 2) == 0
      ? (Utils.addRow(s),
        Array.from(Array(10).keys()).map((num) =>
          num != rand
            ? (s = new AddCoord({ x: num, y: 19, color: "grey" }).apply(s))
            : null
        ))
      : null;

    //checks if a row is full and removes it
    s = new CheckRow().apply(s);

    //resets current block state and generates new block
    return {
      ...s,
      totalPlaced: s.totalPlaced + 1,
      blockState: {
        ...s.blockState,
        x: 4,
        y: -1,
        rotation: 0,
        type: s.nextBlock,
      },
      highScore: s.score > s.highScore ? s.score : s.highScore,
      nextBlock: getRandBlock(generateRandom(s.time)),
    };
  };
}

class ResetBoard implements Action {
  apply(s: State): State {
    return {
      ...s,
      allCoords: [],
      blockState: {
        ...initialBlockState,
        type: getRandBlock(generateRandom(s.time)),
      },
      score: 0,
      level: 1,
      time: 0,
      totalPlaced: 0,
      gameEnd: false,
      nextBlock: getRandBlock(generateRandom(s.time + 1)),
      holdBlock: getRandBlock(generateRandom(s.time + 2)),
    };
  }
}

class HoldBlock implements Action {
  apply(s: State): State {
    const new_coords = getBlockRotation(s.holdBlock)[0].map((coord) => ({
      x: coord.x + s.blockState.x,
      y: coord.y + s.blockState.y,
    }));

    return Utils.overlap(s, new_coords)
      ? s
      : {
          ...s,
          blockState: { ...s.blockState, type: s.holdBlock },
          holdBlock: s.blockState.type,
        };
  }
}

class IncreaseLevel implements Action {
  apply(s: State): State {
    return { ...s, level: s.level + 1 };
  }
}

class AlterBoard implements Action {
  constructor(public readonly row: number) {}
  apply(s: State): State {
    const new_coords = Utils.removeRow(s, this.row);
    return { ...s, allCoords: new_coords };
  }
}

class GameEnd implements Action {
  apply(s: State): State {
    return { ...s, gameEnd: true };
  }
}

class IncreaseScore implements Action {
  apply(s: State): State {
    return { ...s, score: s.score + 100 };
  }
}

class AddCoord implements Action {
  constructor(public readonly coord: { x: number; y: number; color: string }) {}
  apply(s: State): State {
    return { ...s, allCoords: [...s.allCoords, this.coord] };
  }
}

class ChangeAllCoords implements Action {
  constructor(
    public readonly coords: { x: number; y: number; color: string }[]
  ) {}
  apply(s: State): State {
    return { ...s, allCoords: this.coords };
  }
}

class CheckRow implements Action {
  apply(s: State): State {
    const coordRowDict = Utils.checkRowFull(s);
    const fullRows = Object.keys(coordRowDict).filter(
      (key) => coordRowDict[parseInt(key)] === 10
    );
    fullRows.map(
      (row) => (s = { ...s, allCoords: Utils.removeRow(s, parseInt(row)), score: s.score + 100})
    );
    return s;
  }
}

const reduce = (s: State, a: Action): State => a.apply(s);
