
class Evaluator{


  constructor(graph){
    this.graph = graph || cytoscape();
  }

  getModes(filter){
    const modez = {};
    modez[structs.INFINITE_LOOP] = this.isInfiniteLoop.bind(this);
    modez[structs.DOES_NOT_CONVERGE] = this.isNotConverging.bind(this);
    modez[structs.SIMPLE] = this.isSimple.bind(this);
    modez[structs.IF_THEN] = this.isIfThen.bind(this);
    modez[structs.IF_THEN_ELSE] = this.isIfThenElse.bind(this);
    modez[structs.DO_WHILE_LOOP] = this.isDoWhileLoop.bind(this);
    modez[structs.WHILE_LOOP] = this.isWhileLoop.bind(this);
    modez[structs.END_STATE] = this.isEndState.bind(this);

    return modez;
  }
	
  interpret(state, mode=DEFAULT_MODE){

    let result = 0;
    const meta = {};

    const useModez = this.getModes();

    for(let modez in useModez){
      if(modez & mode){
        const { found, meta : newMeta } = useModez[modez](state);

        if(found){
          result += parseInt(modez);
          Object.assign(meta, newMeta);
        }
      }
    }

    return { result, meta };

  }

  isInfiniteLoop(state){

    const defaultResult = {
      found : false,
      meta : {}
    };

    const { hasTransitions, transitions } = getStateTransitions(state, this.graph);

    if(!hasTransitions || transitions.length == 1){
      return defaultResult;
    }
  
    const endStates = getEndStates(this.graph);
    const successorsA = getStateSuccessors(transitions[0], this.graph, "nodes");
    const successorsB = getStateSuccessors(transitions[1], this.graph, "nodes");

    if(!endStates.anySame(successorsA) && !endStates.anySame(successorsB)){
      defaultResult["found"] = true;
    }

    return defaultResult;

  }

  isNotConverging(state){
    const defaultResult = {
      found : false,
      meta : {}
    }

    const { hasTransitions, transitions } = getStateTransitions(state, this.graph);

    if(!hasTransitions && transitions.length == 1){
      return defaultResult;
    }
    const transitionASources = Array.from(getSourcesToState(transitions[0], this.graph), s => toEdgeId(s, transitions[0]));
    const transitionBSources = Array.from(getSourcesToState(transitions[1], this.graph), s => toEdgeId(s, transitions[1]));

    const isTransitionANeeded = isMaybeNeeded(transitionASources, state, this.graph);
    const isTransitionBNeeded = isMaybeNeeded(transitionBSources, state, this.graph);
    const areBothNotNeeded = (!isTransitionANeeded && !isTransitionBNeeded);
    if(areBothNotNeeded){
      defaultResult["found"] = true;
    }

    return defaultResult;


  }

  isSimple(state){
    
    const defaultResult = {
      found : false,
      meta : {}
    };

    const { hasTransitions, transitions } = getStateTransitions(state, this.graph);
    const { found : hasDoWhileLoop } = this.isDoWhileLoop(state);

    if(hasTransitions && !hasDoWhileLoop && transitions.length == 1){
      defaultResult["found"] = true;
    }

    return defaultResult;

  }

  isIfThen(state){

    const defaultResult = { 
      found : false, 
      meta : {
        ifThenConvergedState: null 
      }
    };
    
    const { hasTransitions, transitions } = getStateTransitions(state, this.graph);

    if(!hasTransitions || transitions.length != 2){
      return defaultResult;
    }
		
    const edgeId = (st, t) => `[id = "${st}->${t}"]`

    const convergedState = findConvergence(state, this.graph);

    if(convergedState){
      defaultResult["found"] = true;
      defaultResult["meta"]["ifThenConvergedState"] = convergedState == transitions[0] ? transitions[0] : transitions[1];
    }

    return defaultResult;

  }

  isIfThenElse(state){

    const defaultResult = { 
      found : false, 
      meta : {
        ifThenElseConvergedState: null 
      }
    };
  
    const { hasTransitions, transitions } = getStateTransitions(state, this.graph);

    if(!hasTransitions || transitions.length != 2){
      return defaultResult;
    }

    const edgeId = (st, t) => `[id = "${st}->${t}"]`
    const cutTransitionA = this.graph.$(edgeId(state, transitions[0])).remove();
    const cutTransitionB = this.graph.$(edgeId(state, transitions[1])).remove();
    const successorsA = this.graph.$(toId(transitions[0])).successors().edges();
    const successorsB = this.graph.$(toId(transitions[1])).successors().edges();

    const diff = successorsA.diff(successorsB);
		
    if(diff.left.size() && diff.right.size()){
      const lastEdgeA = diff.left.slice(-1).map((n) => n.target().map(getEleId)[0]);
      const lastEdgeB = diff.right.slice(-1).map((n) => n.target().map(getEleId)[0]);
    
      if(lastEdgeA[0] == lastEdgeB[0]){
        defaultResult["found"] = true;
        defaultResult["meta"]["ifThenElseConvergedState"] = lastEdgeA[0];
      }
    }

    cutTransitionA.restore();
    cutTransitionB.restore();
  
    return defaultResult;

  }

  isWhileLoop(state){

    const defaultResult = {
      found : false, 
      meta: {
        whileNonLoopState : null,
        whileLoopState : null,
        whileStart : null,
      }
    };

    const { hasTransitions, transitions } = getStateTransitions(state, this.graph);
    const hasLoop = isInsideLoop(state, this.graph);


    if(!hasTransitions || !hasLoop || transitions.length == 1){
      return defaultResult;
    }

    const sourcesToState =  getSourcesToState(state, this.graph);


    const transitionASources = Array.from(getSourcesToState(transitions[0], this.graph), s => toEdgeId(s, transitions[0]));
    const transitionBSources = Array.from(getSourcesToState(transitions[1], this.graph), s => toEdgeId(s, transitions[1]));
    const isTransitionANeeded = isMaybeNeeded(transitionASources, state, this.graph);
    const isTransitionBNeeded = isMaybeNeeded(transitionBSources, state, this.graph);
    const areBothNotNeeded = (!isTransitionANeeded && !isTransitionBNeeded);

    if(!areBothNotNeeded){
      const neededTransition = isTransitionANeeded ? transitions[0] : transitions[1];
      const notNeededTransition = isTransitionANeeded ? transitions[1] : transitions[0];

      const hasOwnState = (n) => n.target().map(getEleId)[0] == state;
      const hasNeededTransition = (n) => n.target().map(getEleId)[0] == neededTransition;
      const filterDirectOnly = (n) => hasOwnState(n) || hasNeededTransition(n)

      for(let st of sourcesToState){
        const shortestPath = getShortestPath(notNeededTransition, st, this.graph);

        const isDirectPath = !shortestPath.some(filterDirectOnly);

        if(isDirectPath){

          defaultResult["found"] = true;
          defaultResult["meta"]["whileNonLoopState"] = neededTransition;
          defaultResult["meta"]["whileLoopState"] = notNeededTransition;
          defaultResult["meta"]["whileStart"] = state;
          break;
        }
      }
    }
    return defaultResult;

  }

  isDoWhileLoop(state){

    let defaultResult = {
      found : false, 
      meta : {
        doWhileEndStates : {},
        doWhileStart : null
      }
    };

    const { hasTransitions, transitions } = getStateTransitions(state, this.graph);
    const hasLoop = isInsideLoop(state, this.graph);

    if(!hasTransitions || !hasLoop){
      return defaultResult;
    }

    const endStates = getEndStates(this.graph);
    const sourcesToState =  getSourcesToState(state, this.graph);

    if(sourcesToState.length == 1){
      return defaultResult;
    }
    for(let st of sourcesToState){
      const sources = this.graph.$(`[source = "${st}"]`).edges();

      if(sources.size() > 1){
        const edgesId =  sources.map((n) => n.id());
        const isNeeded = isMaybeNeeded(edgesId, state, this.graph);

        if(isNeeded){

          defaultResult["found"] = true;

          const endLoopState = sources.map((n) => n.target().map(getEleId)[0]);
          const sourceTransitionA = getTargetFromEdgeId(edgesId[0]);
          const sourceTransitionB = getTargetFromEdgeId(edgesId[1]);

          const loopState = sourceTransitionA == state ? sourceTransitionA : sourceTransitionB;
          const nonLoopState = loopState == state ? sourceTransitionA : sourceTransitionB;

          defaultResult["meta"]["doWhileEndStates"][st] = { loopState, nonLoopState };
          defaultResult["meta"]["doWhileStart"] = state;

        }
      }
    }

    return defaultResult;

  }

  isEndState(state){

    const defaultResult = {
      found : false,
      meta : {}
    };

    const { hasTransitions } = getStateTransitions(state, this.graph);

    if(!hasTransitions) {
      defaultResult["found"] = true;
    }

    return defaultResult;
  }

}


const { structs } = require("./structs.js");

const {
  isMaybeNeeded,
  getEleId,
  getNodeData,
  toId,
  toEdgeId,
  getTargetFromEdgeId,
  getEndStates,
  getStateSuccessors,
  getStateTransitions,
  getSourcesToState,
  getShortestPath,
  getDiffOnSuccessorsAndPredecessors,
  findConvergence,
  isInsideLoop
} = require("./graph.js");

const DEFAULT_MODE = Object.values(structs).reduce((sum, m) => sum+m);

module.exports = {
  Evaluator,
};



