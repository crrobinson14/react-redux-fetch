// @flow

import React, { Component } from 'react';
import { connect as reduxConnect } from 'react-redux';
import { bindActionCreators } from 'redux';
import isFunction from 'lodash/isFunction';
import isObject from 'lodash/isObject';
import merge from 'lodash/merge';
import each from 'lodash/each';
import reduce from 'lodash/reduce';
// import reactReduxFetchActions from '../actions';
import { getModel } from '../reducers/selectors';
// import container from '../container';
import capitalizeFirstLetter from '../utils/capitalizeFirstLetter';
import buildActionsFromMappings, {
  ensureResourceIsObject,
  validateResourceObject,
} from '../utils/buildActionsFromMappings';
import helpers from '../utils/helpers';

// const defaultRequestType = 'get';

type Props = {
  dispatch(): void,
  fetchData: Object,
};

type FuncOrObj = Function | Object;
type OptionalFuncOrObj = Function | Object | null;

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

function connect(
  mapPropsToRequestsToProps: FuncOrObj,
  componentMapStateToProps?: OptionalFuncOrObj = null,
  componentMapDispatchToProps?: OptionalFuncOrObj = null,
) {
  return function wrapWithReactReduxFetch(WrappedComponent: ReactClass<*>) {
    class ReactReduxFetch extends Component {
      /**
       * @param {Object} fetchData The complete react-redux-fetch state leaf
       * @param {Array} mappings Array of objects with shape:
       *                {resource: ..., method: ..., request: ...}
       * @return {Object} all the resources the WrappedComponent requested
       */
      getFilteredFetchData = (fetchData, mappings) => {
        const data = {};

        each(mappings, (mapping) => {
          const resource = ensureResourceIsObject(mapping);
          validateResourceObject(resource);
          const resourceName = resource.name;

          data[`${resourceName}Fetch`] = fetchData[resourceName] || {};
        });

        return data;
      };

      props: Props;

      /**
       * @param {Function} dispatch Redux dispatch function
       * @param {Array} mappings Array of objects with shape:
       *                {resource: ..., method: ..., request: ...}
       * @return {Object} functions for the WrappedComponent e.g.: 'dispatchUserFetch()'
       **/
      actionsFromProps = (dispatch, mappings: Array<*>) =>
        reduce(
          buildActionsFromMappings(mappings),
          (actions, actionCreator, key) =>
            Object.assign({}, actions, {
              [`dispatch${capitalizeFirstLetter(key)}`]: (...args) => {
                const action = actionCreator(...args);
                if (action) {
                  dispatch(action);
                }
              },
            }),
          {},
        );

      /**
       * If the value passed to connect() is a function,
       *    execute the function and pass the props + context
       * @param {Object} props React props
       * @param {Object} context React context
       * @return {Array} an array with request configurations
       **/
      buildMappings = (props: Props = this.props, context: Object = this.context): Array<*> =>
        (isFunction(mapPropsToRequestsToProps)
          ? // $FlowFixMe
            mapPropsToRequestsToProps(props, context || {})
          : // $FlowFixMe
            mapPropsToRequestsToProps);

      render() {
        const { fetchData, ...other } = this.props;

        const mappings = this.buildMappings(this.props, this.context);
        const actions = this.actionsFromProps(this.props.dispatch, mappings);
        const data = this.getFilteredFetchData(fetchData, mappings);

        return <WrappedComponent {...other} {...actions} {...data} />;
      }
    }

    ReactReduxFetch.displayName = `ReactReduxFetch.connect(${getDisplayName(WrappedComponent)})`;

    // ReactReduxFetch.propTypes = {
    //   dispatch: PropTypes.func.isRequired,
    //   fetchData: PropTypes.object.isRequired,
    // };

    const mapStateToProps = (state, props) =>
      merge(
        { fetchData: getModel(state) },
        helpers.ensureObject(componentMapStateToProps, [state, props]),
      );

    let mapDispatchToProps;

    if (isFunction(componentMapDispatchToProps)) {
      // $FlowFixMe
      mapDispatchToProps = dispatch => merge({ dispatch }, componentMapDispatchToProps(dispatch));
    } else if (isObject(componentMapDispatchToProps)) {
      mapDispatchToProps = dispatch =>
        merge({ dispatch }, bindActionCreators(componentMapDispatchToProps, dispatch));
    }

    return reduxConnect(mapStateToProps, mapDispatchToProps)(ReactReduxFetch);
  };
}

// function factory(defaults = {}, options = {}) {
function factory() {
  function connectImpl(
    map: FuncOrObj,
    mapStateToProps?: OptionalFuncOrObj,
    mapDispatchToProps?: OptionalFuncOrObj,
  ) {
    return connect(map, mapStateToProps, mapDispatchToProps);
  }

  return connectImpl;
}

export default factory(
  {
    // TODO add defaults
  },
);
