import { merge } from "rxjs";
import {State, getRandBlock, initialBlockState, initialState, getBlockRotation, generateRandom} from "./main.ts"
export {Tick, MoveLeft, MoveRight, MoveDown, Rotate, BlockSave, ResetBoard, HoldBlock, GameEnd, IncreaseLevel, AlterBoard, reduce}
export type {Action}

interface Action {
    apply(s: State): State;
  }

class Tick implements Action{
    constructor(public readonly elapsed: number){}

    apply = (s : State) => {
        return (s.blockState.y + s.blockState.height >= 19) || (Tick.collision(s,0,1))
        ? (new BlockSave().apply(s))
        : {...s,
            time: s.time += 0.5,
        blockState: {
            ...s.blockState,
            y: (s.blockState.y + s.blockState.height >= 19) || (Tick.collision(s,0,1)) ? s.blockState.y : s.blockState.y + 1
            }
        }
    }

    static overlap = (s : State, new_coords : { x:number, y:number }[] | null = null) => {
        let truelist : boolean[] = [];
        new_coords == null 
        ? s.blockState.blockCoords.map((coord) => {s.allCoords.map((coord2) => {coord.x == coord2.x && coord.y == coord2.y ? truelist.push(true) : truelist.push(false)})})
        : (new_coords.map((coord) => {s.allCoords.map((coord2) => {(coord.x == coord2.x && coord.y == coord2.y) ? truelist.push(true) : truelist.push(false)})}),
          new_coords.map((coord) => {coord.x < 0 || coord.x > 9 || coord.y > 19 ? truelist.push(true) : truelist.push(false)}) )
        return truelist.includes(true)
    }

    static collision = (s : State, x_amount: number, y_amount: number) => {
        const truelist : boolean[] = s.blockState.blockCoords.map((coord) => {return (Tick.checkCoordinate(s, coord.x + x_amount, coord.y + y_amount))})
        return truelist.includes(true)
    }

    static checkCoordinate = (s : State, coord_x : number, coord_y : number) => {
        const truelist : boolean[] = s.allCoords.map((coord) => coord.x == coord_x && coord.y == coord_y)
        return truelist.includes(true)
    }

    static checkRowFull = (s : State) => {
        let truelist: {[key:number] : number } = {};
        s.allCoords.map((coord) => {truelist[coord.y] == null ? truelist[coord.y] = 1 : truelist[coord.y] += 1})

        // const dictMap = new Map(s.allCoords.map((coord) => [coord.y, 1]))
        return truelist
    }

    static removeRow = (s : State, row: number) : {x:number, y:number, color:string}[] => {
        const new_coords = s.allCoords.filter((coord) => {return coord.y != row})
        const new_A = new_coords.map((coords) => coords.y < row ? {x : coords.x ,y : coords.y += 1, color: coords.color} : coords)
        s.score += Math.floor(100 * (s.level * (s.time * 0.01)))
        return new_A
    }

    static addRow = (s : State) => {
        s.allCoords.map((coords) => {coords.y -= 1; return coords})
    }


}

class MoveLeft implements Action{
    apply = (s : State) => ({
        ...s,
        blockState: {
            ...s.blockState,
            x: (s.blockState.x - s.blockState.leftWidth < -1) || (Tick.collision(s,-1,0)) ? s.blockState.x : s.blockState.x - 1
        }
    })
}

class MoveRight implements Action{
    apply = (s : State) => ({
        ...s,
        blockState: {
            ...s.blockState,
            x: (s.blockState.x + s.blockState.rightWidth > 8) || (Tick.collision(s,1,0)) ? s.blockState.x : s.blockState.x + 1
        }
    })
}

class MoveDown implements Action{
    apply = (s : State) => {
        return (s.blockState.y + s.blockState.height >= 19) || (Tick.collision(s,0,1)) ? new BlockSave().apply(s) : {...s,
        blockState: {
            ...s.blockState,
            y: (s.blockState.y + s.blockState.height >= 19) || (Tick.collision(s,0,1)) ? s.blockState.y : s.blockState.y + 1
            }
        }
    }
}

class Rotate implements Action{
    apply = (s : State) => { 
        const blockRotation = getBlockRotation(s.blockState.type)
        const nextRotation = blockRotation[(s.blockState.rotation + 1) % blockRotation.length]
        const newCoords = nextRotation.map((coord) => ({x: coord.x + s.blockState.x, y: coord.y + s.blockState.y}))
        
        return {
        ...s,
        blockState: {
            ...s.blockState,
            rotation: Tick.overlap(s, newCoords) ? s.blockState.rotation : s.blockState.rotation + 1
        }
    }}
}

class BlockSave implements Action{
    apply = (s : State) => {
        //generate random number for empty block on extra difficulty row
        const rand = generateRandom(s.time) % 8

        s.allCoords = [...s.allCoords, ...s.blockState.blockCoords.map((coord) => ({
            x: coord.x,
            y: coord.y,
            color: s.blockState.color,
        }))];
        // s.blockState.blockCoords.map((coords) => {s.allCoords = {...s.allCoords, {x: coords.x, y: coord.y, color: s.blockState.color}}})
        //adds difficulty row to all coords
        // s.blockState.blockCoords.map((coord) => {s.allCoords.push({x:coord.x, y:coord.y, color: s.blockState.color})});
        console.log(s.totalPlaced+1, s.totalPlaced % Math.max(15-s.level , 2))

        //checks if row should be added on this block placement, interval between rows is affected by level, higher level = higher difficulty
        //because interval between rows being added is smaller. Minimum 2 block placements between rows being added
        s.totalPlaced % Math.max(15-s.level , 2) == 0 
        ? (Tick.addRow(s),
            Array.from(Array(10).keys()).map((num) => num != rand 
            ? s.allCoords = [...s.allCoords, {x:num, y:19, color: "grey"}]
            //s.allCoords.push({x:num, y:19, color: "grey"})
            : null))
        : null

        //

        return {
        ...s,
        totalPlaced : s.totalPlaced += 1,
        blockState: {...s.blockState,
            x:4,
            y:-1,
            rotation:0,
            type: s.nextBlock,
        },
        nextBlock : getRandBlock(generateRandom(s.time))
    }}
}

class ResetBoard implements Action{
    apply(s: State): State {
        return {
            ...s,
            allCoords : [],
            blockState: {...initialBlockState,
                type : getRandBlock(generateRandom(s.time)),},
            score : 0,
            level : 1,
            time : 0,
            gameEnd : false,
            nextBlock : getRandBlock(generateRandom(s.time+1)),
            holdBlock : getRandBlock(generateRandom(s.time+2)),

        }
    }
}

class HoldBlock implements Action{
    apply(s: State): State {

        const new_coords = getBlockRotation(s.holdBlock)[0].map((coord) => (
            {x: coord.x + s.blockState.x, y: coord.y + s.blockState.y}
            ))

        return Tick.overlap(s, new_coords) ? s 
        : {...s,
            blockState: {...s.blockState,
            type : s.holdBlock,
        },
        holdBlock : s.blockState.type,
            
        }
    }
}

class IncreaseLevel implements Action{
    apply(s: State): State {
        return {...s,
            level : s.level += 1,
        }
    }
}

class AlterBoard implements Action{
    constructor(public readonly row : number){}
    apply(s: State): State {
        const new_coords = Tick.removeRow(s, this.row)
        return {...s,
            allCoords : new_coords,
        }
    }
}


class GameEnd implements Action{
    apply(s: State): State {
        return {...s,
            gameEnd : true,
        }
    }
}

const reduce = (s: State, a: Action): State => a.apply(s);