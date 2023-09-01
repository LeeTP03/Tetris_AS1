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
  Utils,
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
  //checks if a block is colliding with another block or the bottom of the board
  static collision = (s: State, x_amount: number, y_amount: number) => {
    //checks if any of the blocks in the current controlled block is going to move into another block
    //returns a list of booleans, if any of the booleans are true then the block is colliding
    return s.blockState.blockCoords.some((coord) => 
      this.checkCoordinate(s, coord.x + x_amount, coord.y + y_amount)
    );
  };

  //checks if a given coordinate is in the allCoords array
  static checkCoordinate = (s: State, coord_x: number, coord_y: number) => {
    //checks if the coordinate is in the allCoords array
    return s.allCoords.some(
      (coord) => coord.x == coord_x && coord.y == coord_y
    );
  };

  //checks if a given coordinate is out of bounds
  static checkBoundaries = (coords: { x: number; y: number }[]) =>
    coords.some((coord) => coord.x < 0 || coord.x > 9 || coord.y > 19);

  //checks if current block is overlapping with another block or a given set of coordinates are going to collide with a cube or be out of bounds
  static overlap = (
    s: State,
    new_coords: { x: number; y: number }[] | null = null
  ) =>
    new_coords == null
      //if no coordinates are given, check if the current block is overlapping with another block
      ? s.blockState.blockCoords
          .map((coord: { x: number; y: number }) =>
            this.checkCoordinate(s, coord.x, coord.y)
          )
          .includes(true)
      //if coordinates are given, check if the given coordinates are going to collide with a cube or be out of bounds
      : new_coords
          .map(
            (coord) =>
              this.checkCoordinate(s, coord.x, coord.y) ||
              this.checkBoundaries(new_coords)
          )
          .includes(true);

  //returns a dictionary of rows with the number of blocks in each row
  static checkRowBlockCount = (s: State) => {
    //creates a dictionary with the number of blocks in each row
    const coordRowDict = s.allCoords.reduce(
      (acc: { [key: number]: number }, coord) => {
        return { ...acc, [coord.y]: (acc[coord.y] || 0) + 1 };
      },
      {}
    );
    return coordRowDict;
  };

  //removes a given row from the board
  static removeRow = (
    s: State,
    row: number
  ): { x: number; y: number; color: string }[] => {

    //filters the unwanted row out of the allCoords array
    const newCoords = s.allCoords.filter((coord) => {
      return coord.y != row;
    });

    //shifts all the rows above the removed row down by 1
    const newCoordPosition = newCoords.map((coords) =>
      coords.y < row
        ? { x: coords.x, y: (coords.y += 1), color: coords.color }
        : coords
    );
    return newCoordPosition;
  };

  //shifts all rows on the board up by 1
  static shiftBoardUp = (s: State) => {
    s.allCoords.map((coords) => {
      coords.y -= 1;
      return coords;
    });
  };
}

//Action class to manipulate the state to move the current block left
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

//Action class to manipulate the state to move the current block right
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

//Action class to manipulate the state to move the current block down
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

//Action class to manipulate the state to rotate the current block
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

//Action class to manipulate the state to save the current block, make a new live block,
//check if row is compeleted and if so remove it, and generate a new extra difficulty row if needed 
class BlockSave implements Action {
  apply = (s: State) => {
    //generate random number for empty block on extra difficulty row
    const rand = generateRandom(s.time) % 8;

    //adds the current block to the allCoords array
    s.blockState.blockCoords.map((coord) => {
      s = new AddCoord({
        x: coord.x,
        y: coord.y,
        color: s.blockState.color,
      }).apply(s);
    });

    //checks if row should be added on block placement, interval between rows is affected by level, higher level = higher difficulty
    //because interval between rows being added is smaller. Minimum 2 block placements between rows being added
    s.totalPlaced % Math.max(Constants.BLOCKS_BEFORE_NEW_ROW - s.level, 2) == 0
      ? (Utils.shiftBoardUp(s),
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

//Action class to manipulate the state to reset the board
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

//Action class to manipulate the state to swap the current block with the held block
class HoldBlock implements Action {
  apply(s: State): State {
    const new_coords = getBlockRotation(s.holdBlock)[0].map((coord) => ({
      x: coord.x + s.blockState.x,
      y: coord.y + s.blockState.y,
    }));

    //checks if swapped with the held block if it is overlapping with another block
    return Utils.overlap(s, new_coords)
      ? s
      : {
          ...s,
          blockState: { ...s.blockState, type: s.holdBlock },
          holdBlock: s.blockState.type,
        };
  }
}

//Action class to manipulate the state to chaneg if the game has ended
class GameEnd implements Action {
  apply(s: State): State {
    return { ...s, gameEnd: true };
  }
}

//Action class to manipulate the state to add a coordinate to the allCoords array
class AddCoord implements Action {
  constructor(public readonly coord: { x: number; y: number; color: string }) {}
  apply(s: State): State {
    return { ...s, allCoords: [...s.allCoords, this.coord] };
  }
}

//Action class to manipulate the state to check if a row is full and remove it
class CheckRow implements Action {
  apply(s: State): State {
    const coordRowDict = Utils.checkRowBlockCount(s);
    
    //get all rows that are full
    const fullRows = Object.keys(coordRowDict).filter(
      (key) => coordRowDict[parseInt(key)] === 10
    );

    //for each full row, remove it and add score by 100
    fullRows.map(
      (row) => (s = { ...s, allCoords: Utils.removeRow(s, parseInt(row)), score: s.score + 100})
    );
    return s;
  }
}

const reduce = (s: State, a: Action): State => a.apply(s);
