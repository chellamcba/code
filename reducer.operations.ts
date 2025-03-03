import {ActionReducer, Action, State} from '@ngrx/store';
import {Operation} from "./operation.model";

export const ADD_OPERATION = 'Add an operation';
export const REMOVE_OPERATION = 'Remove an operation';
export const INCREMENT_OPERATION = 'Increment an operation';
export const DECREMENT_OPERATION = 'Decrement an operation';



const initialState:State = [];
/*
  Reducer in NgRx is a pure function responsible for handling state 
  in an Angular application. It takes the current state and an action as 
  input and returns a new state based on the action's type. 
  Reducers determine how the application's state changes in response to 
  actions. They must be pure functions, meaning they always produce the 
  same output for the same input and have no side effects.
  This function is part of the state management solution that is offered.
*/

export const operationsReducer: ActionReducer = (state = initialState, action: Action) => {
  switch (action.type) {
    case ADD_OPERATION:
      const operation:Operation = action.payload;
      return [ ...state, operation ];

    case INCREMENT_OPERATION:
      const operation = ++action.payload.amount;
      return state.map(item => {
        return item.id === action.payload.id ? Object.assign({}, item, operation) : item;
      });

    case DECREMENT_OPERATION:
      const operation = --action.payload.amount;
      return state.map(item => {
        return item.id === action.payload.id ? Object.assign({}, item, operation) : item;
      });

    case REMOVE_OPERATION:
      return state.filter(operation => {
        return operation.id !== action.payload.id;
      });


    default:
      return state;
  }

};
