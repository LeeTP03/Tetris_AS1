import {State, getRandBlock} from "./main.ts"
export {Tick, MoveLeft, MoveRight, MoveDown, Rotate, NextBlock, BlockSave, reduce}
export type {Action}

interface Action {
    apply(s: State): State;
  }

class Tick implements Action{
    constructor(public readonly elapsed: number){}

    apply = (s : State) => ({
        ...s,
        time: this.elapsed,
        blockState: {
            ...s.blockState,
            y: s.blockState.y + s.blockState.height >= 20 ? s.blockState.y : s.blockState.y + 1
        }
    })

    static collision = (s : State) => {
        for (let i = 0; i < s.allBlocks.length; i++) {
            if (s.blockState.x == s.allBlocks[i].x && s.blockState.y + s.blockState.height == s.allBlocks[i].y) {
                return true
            }
        }
        return false
    }

    static boardOut = (s : State) => {
        return s.blockState.y - s.blockState.height < -1
    }

}

class MoveLeft implements Action{
    apply = (s : State) => ({
        ...s,
        blockState: {
            ...s.blockState,
            x: s.blockState.x - s.blockState.leftWidth < -1 ? s.blockState.x : s.blockState.x - 1
        }
    })
}

class MoveRight implements Action{
    apply = (s : State) => ({
        ...s,
        blockState: {
            ...s.blockState,
            x: s.blockState.x + s.blockState.rightWidth > 8 ? s.blockState.x : s.blockState.x + 1
        }
    })
}

class MoveDown implements Action{
    apply = (s : State) => ({
        ...s,
        blockState: {
            ...s.blockState,
            y: s.blockState.y + s.blockState.height >= 19 ? s.blockState.y : s.blockState.y + 1
        }
    })
}

class Rotate implements Action{
    apply = (s : State) => ({
        ...s,
        blockState: {
            ...s.blockState,
            rotation: s.blockState.rotation + 1
        }
    })
}

class NextBlock implements Action{
    apply = (s : State) => ({
        ...s,
        blockState: {...s.blockState,
            x:4,
            y:-1,
            rotation:0,
            type: s.nextBlock,
        },
        nextBlock : getRandBlock()
    })
}

class BlockSave implements Action{
    apply = (s : State) => {
        s.allBlocks.push(s.blockState)
        return {
        ...s,
        blockState: {...s.blockState,
            x:4,
            y:-1,
            rotation:0,
            type: s.nextBlock,
        },
        nextBlock : getRandBlock()
    }}
}

const reduce = (s: State, a: Action): State => a.apply(s);