import _extends from 'babel-runtime/helpers/extends';
import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import moment from 'moment';
import classnames from 'classnames';
import KeyCode from 'rc-util/es/KeyCode';
import CalendarPart from './range-calendar/CalendarPart';
import TodayButton from './calendar/TodayButton';
import OkButton from './calendar/OkButton';
import TimePickerButton from './calendar/TimePickerButton';
import CommonMixin from './mixin/CommonMixin';
import { syncTime, getTodayTime, isAllowedDate } from './util';
import { goTime, goStartMonth, goEndMonth, includesTime } from './util/toTime';

function noop() {}

function isEmptyArray(arr) {
  return Array.isArray(arr) && (arr.length === 0 || arr.every(function (i) {
    return !i;
  }));
}

function isArraysEqual(a, b) {
  if (a === b) return true;
  if (a === null || typeof a === 'undefined' || b === null || typeof b === 'undefined') {
    return false;
  }
  if (a.length !== b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function getValueFromSelectedValue(selectedValue) {
  var start = selectedValue[0],
      end = selectedValue[1];

  var newEnd = end && end.isSame(start, 'month') ? end.clone().add(1, 'month') : end;
  return [start, newEnd];
}

function normalizeAnchor(props, init) {
  var selectedValue = props.selectedValue || init && props.defaultSelectedValue;
  var value = props.value || init && props.defaultValue;
  var normalizedValue = value ? getValueFromSelectedValue(value) : getValueFromSelectedValue(selectedValue);
  return !isEmptyArray(normalizedValue) ? normalizedValue : init && [moment(), moment().add(1, 'months')];
}

function generateOptions(length, extraOptionGen) {
  var arr = extraOptionGen ? extraOptionGen().concat() : [];
  for (var value = 0; value < length; value++) {
    if (arr.indexOf(value) === -1) {
      arr.push(value);
    }
  }
  return arr;
}

function onInputSelect(direction, value) {
  if (!value) {
    return;
  }
  var originalValue = this.state.selectedValue;
  var selectedValue = originalValue.concat();
  var index = direction === 'left' ? 0 : 1;
  selectedValue[index] = value;
  if (selectedValue[0] && this.compare(selectedValue[0], selectedValue[1]) > 0) {
    selectedValue[1 - index] = this.state.showTimePicker ? selectedValue[index] : undefined;
  }
  this.props.onInputSelect(selectedValue);
  this.fireSelectValueChange(selectedValue);
}

var RangeCalendar = createReactClass({
  displayName: 'RangeCalendar',

  propTypes: {
    prefixCls: PropTypes.string,
    dateInputPlaceholder: PropTypes.any,
    defaultValue: PropTypes.any,
    value: PropTypes.any,
    hoverValue: PropTypes.any,
    mode: PropTypes.arrayOf(PropTypes.oneOf(['date', 'month', 'year', 'decade'])),
    showDateInput: PropTypes.bool,
    timePicker: PropTypes.any,
    showOk: PropTypes.bool,
    showToday: PropTypes.bool,
    defaultSelectedValue: PropTypes.array,
    selectedValue: PropTypes.array,
    onOk: PropTypes.func,
    showClear: PropTypes.bool,
    locale: PropTypes.object,
    onChange: PropTypes.func,
    onSelect: PropTypes.func,
    onValueChange: PropTypes.func,
    onHoverChange: PropTypes.func,
    onPanelChange: PropTypes.func,
    format: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    onClear: PropTypes.func,
    type: PropTypes.any,
    disabledDate: PropTypes.func,
    disabledTime: PropTypes.func,
    clearIcon: PropTypes.node
  },

  mixins: [CommonMixin],

  getDefaultProps: function getDefaultProps() {
    return {
      type: 'both',
      defaultSelectedValue: [],
      onValueChange: noop,
      onHoverChange: noop,
      onPanelChange: noop,
      disabledTime: noop,
      onInputSelect: noop,
      showToday: true,
      showDateInput: true
    };
  },
  getInitialState: function getInitialState() {
    var props = this.props;
    var selectedValue = props.selectedValue || props.defaultSelectedValue;
    var value = normalizeAnchor(props, 1);
    return {
      selectedValue: selectedValue,
      prevSelectedValue: selectedValue,
      firstSelectedValue: null,
      hoverValue: props.hoverValue || [],
      value: value,
      showTimePicker: false,
      mode: props.mode || ['date', 'date']
    };
  },
  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
    var state = this.state;

    var newState = {};
    if ('value' in nextProps) {
      newState.value = normalizeAnchor(nextProps, 0);
      this.setState(newState);
    }
    if ('hoverValue' in nextProps && !isArraysEqual(state.hoverValue, nextProps.hoverValue)) {
      this.setState({ hoverValue: nextProps.hoverValue });
    }
    if ('selectedValue' in nextProps) {
      newState.selectedValue = nextProps.selectedValue;
      newState.prevSelectedValue = nextProps.selectedValue;
      this.setState(newState);
    }
    if ('mode' in nextProps && !isArraysEqual(state.mode, nextProps.mode)) {
      this.setState({ mode: nextProps.mode });
    }
  },
  onDatePanelEnter: function onDatePanelEnter() {
    if (this.hasSelectedValue()) {
      this.fireHoverValueChange(this.state.selectedValue.concat());
    }
  },
  onDatePanelLeave: function onDatePanelLeave() {
    if (this.hasSelectedValue()) {
      this.fireHoverValueChange([]);
    }
  },
  onSelect: function onSelect(value) {
    var type = this.props.type;
    var _state = this.state,
        selectedValue = _state.selectedValue,
        prevSelectedValue = _state.prevSelectedValue,
        firstSelectedValue = _state.firstSelectedValue;

    var nextSelectedValue = void 0;
    if (type === 'both') {
      if (!firstSelectedValue) {
        syncTime(prevSelectedValue[0], value);
        nextSelectedValue = [value];
      } else if (this.compare(firstSelectedValue, value) < 0) {
        syncTime(prevSelectedValue[1], value);
        nextSelectedValue = [firstSelectedValue, value];
      } else {
        syncTime(prevSelectedValue[0], value);
        syncTime(prevSelectedValue[1], firstSelectedValue);
        nextSelectedValue = [value, firstSelectedValue];
      }
    } else if (type === 'start') {
      syncTime(prevSelectedValue[0], value);
      var endValue = selectedValue[1];
      nextSelectedValue = endValue && this.compare(endValue, value) > 0 ? [value, endValue] : [value];
    } else {
      // type === 'end'
      var startValue = selectedValue[0];
      if (startValue && this.compare(startValue, value) <= 0) {
        syncTime(prevSelectedValue[1], value);
        nextSelectedValue = [startValue, value];
      } else {
        syncTime(prevSelectedValue[0], value);
        nextSelectedValue = [value];
      }
    }

    this.fireSelectValueChange(nextSelectedValue);
  },
  onKeyDown: function onKeyDown(event) {
    var _this = this;

    if (event.target.nodeName.toLowerCase() === 'input') {
      return;
    }

    var keyCode = event.keyCode;

    var ctrlKey = event.ctrlKey || event.metaKey;

    var _state2 = this.state,
        selectedValue = _state2.selectedValue,
        hoverValue = _state2.hoverValue,
        firstSelectedValue = _state2.firstSelectedValue,
        value = _state2.value;
    var _props = this.props,
        onKeyDown = _props.onKeyDown,
        disabledDate = _props.disabledDate;

    // Update last time of the picker

    var updateHoverPoint = function updateHoverPoint(func) {
      // Change hover to make focus in UI
      var currentHoverTime = void 0;
      var nextHoverTime = void 0;
      var nextHoverValue = void 0;

      if (!firstSelectedValue) {
        currentHoverTime = hoverValue[0] || selectedValue[0] || value[0] || moment();
        nextHoverTime = func(currentHoverTime);
        nextHoverValue = [nextHoverTime];
        _this.fireHoverValueChange(nextHoverValue);
      } else {
        if (hoverValue.length === 1) {
          currentHoverTime = hoverValue[0].clone();
          nextHoverTime = func(currentHoverTime);
          nextHoverValue = _this.onDayHover(nextHoverTime);
        } else {
          currentHoverTime = hoverValue[0].isSame(firstSelectedValue, 'day') ? hoverValue[1] : hoverValue[0];
          nextHoverTime = func(currentHoverTime);
          nextHoverValue = _this.onDayHover(nextHoverTime);
        }
      }

      // Find origin hover time on value index
      if (nextHoverValue.length >= 2) {
        var miss = nextHoverValue.some(function (ht) {
          return !includesTime(value, ht, 'month');
        });
        if (miss) {
          var newValue = nextHoverValue.slice().sort(function (t1, t2) {
            return t1.valueOf() - t2.valueOf();
          });
          if (newValue[0].isSame(newValue[1], 'month')) {
            newValue[1] = newValue[0].clone().add(1, 'month');
          }
          _this.fireValueChange(newValue);
        }
      } else if (nextHoverValue.length === 1) {
        // If only one value, let's keep the origin panel
        var oriValueIndex = value.findIndex(function (time) {
          return time.isSame(currentHoverTime, 'month');
        });
        if (oriValueIndex === -1) oriValueIndex = 0;

        if (value.every(function (time) {
          return !time.isSame(nextHoverTime, 'month');
        })) {
          var _newValue = value.slice();
          _newValue[oriValueIndex] = nextHoverTime.clone();
          _this.fireValueChange(_newValue);
        }
      }

      event.preventDefault();

      return nextHoverTime;
    };

    switch (keyCode) {
      case KeyCode.DOWN:
        updateHoverPoint(function (time) {
          return goTime(time, 1, 'weeks');
        });
        return;
      case KeyCode.UP:
        updateHoverPoint(function (time) {
          return goTime(time, -1, 'weeks');
        });
        return;
      case KeyCode.LEFT:
        if (ctrlKey) {
          updateHoverPoint(function (time) {
            return goTime(time, -1, 'years');
          });
        } else {
          updateHoverPoint(function (time) {
            return goTime(time, -1, 'days');
          });
        }
        return;
      case KeyCode.RIGHT:
        if (ctrlKey) {
          updateHoverPoint(function (time) {
            return goTime(time, 1, 'years');
          });
        } else {
          updateHoverPoint(function (time) {
            return goTime(time, 1, 'days');
          });
        }
        return;
      case KeyCode.HOME:
        updateHoverPoint(function (time) {
          return goStartMonth(time);
        });
        return;
      case KeyCode.END:
        updateHoverPoint(function (time) {
          return goEndMonth(time);
        });
        return;
      case KeyCode.PAGE_DOWN:
        updateHoverPoint(function (time) {
          return goTime(time, 1, 'month');
        });
        return;
      case KeyCode.PAGE_UP:
        updateHoverPoint(function (time) {
          return goTime(time, -1, 'month');
        });
        return;
      case KeyCode.ENTER:
        {
          var lastValue = void 0;
          if (hoverValue.length === 0) {
            lastValue = updateHoverPoint(function (time) {
              return time;
            });
          } else if (hoverValue.length === 1) {
            lastValue = hoverValue[0];
          } else {
            lastValue = hoverValue[0].isSame(firstSelectedValue, 'day') ? hoverValue[1] : hoverValue[0];
          }
          if (lastValue && (!disabledDate || !disabledDate(lastValue))) {
            this.onSelect(lastValue);
          }
          event.preventDefault();
          return;
        }
      default:
        if (onKeyDown) {
          onKeyDown(event);
        }
    }
  },
  onDayHover: function onDayHover(value) {
    var hoverValue = [];
    var _state3 = this.state,
        selectedValue = _state3.selectedValue,
        firstSelectedValue = _state3.firstSelectedValue;
    var type = this.props.type;

    if (type === 'start' && selectedValue[1]) {
      hoverValue = this.compare(value, selectedValue[1]) < 0 ? [value, selectedValue[1]] : [value];
    } else if (type === 'end' && selectedValue[0]) {
      hoverValue = this.compare(value, selectedValue[0]) > 0 ? [selectedValue[0], value] : [];
    } else {
      if (!firstSelectedValue) {
        if (this.state.hoverValue.length) {
          this.setState({ hoverValue: [] });
        }
        return hoverValue;
      }
      hoverValue = this.compare(value, firstSelectedValue) < 0 ? [value, firstSelectedValue] : [firstSelectedValue, value];
    }
    this.fireHoverValueChange(hoverValue);

    return hoverValue;
  },
  onToday: function onToday() {
    var startValue = getTodayTime(this.state.value[0]);
    var endValue = startValue.clone().add(1, 'months');
    this.setState({ value: [startValue, endValue] });
  },
  onOpenTimePicker: function onOpenTimePicker() {
    this.setState({
      showTimePicker: true
    });
  },
  onCloseTimePicker: function onCloseTimePicker() {
    this.setState({
      showTimePicker: false
    });
  },
  onOk: function onOk() {
    var selectedValue = this.state.selectedValue;

    if (this.isAllowedDateAndTime(selectedValue)) {
      this.props.onOk(this.state.selectedValue);
    }
  },
  onStartInputSelect: function onStartInputSelect() {
    for (var _len = arguments.length, oargs = Array(_len), _key = 0; _key < _len; _key++) {
      oargs[_key] = arguments[_key];
    }

    var args = ['left'].concat(oargs);
    return onInputSelect.apply(this, args);
  },
  onEndInputSelect: function onEndInputSelect() {
    for (var _len2 = arguments.length, oargs = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      oargs[_key2] = arguments[_key2];
    }

    var args = ['right'].concat(oargs);
    return onInputSelect.apply(this, args);
  },
  onStartValueChange: function onStartValueChange(leftValue) {
    var value = [].concat(this.state.value);
    value[0] = leftValue;
    return this.fireValueChange(value);
  },
  onEndValueChange: function onEndValueChange(rightValue) {
    var value = [].concat(this.state.value);
    value[1] = rightValue;
    return this.fireValueChange(value);
  },
  onStartPanelChange: function onStartPanelChange(value, mode) {
    var props = this.props,
        state = this.state;

    var newMode = [mode, state.mode[1]];
    if (!('mode' in props)) {
      this.setState({
        mode: newMode
      });
    }
    var newValue = [value || state.value[0], state.value[1]];
    props.onPanelChange(newValue, newMode);
  },
  onEndPanelChange: function onEndPanelChange(value, mode) {
    var props = this.props,
        state = this.state;

    var newMode = [state.mode[0], mode];
    if (!('mode' in props)) {
      this.setState({
        mode: newMode
      });
    }
    var newValue = [state.value[0], value || state.value[1]];
    props.onPanelChange(newValue, newMode);
  },
  getStartValue: function getStartValue() {
    var value = this.state.value[0];
    var selectedValue = this.state.selectedValue;
    // keep selectedTime when select date
    if (selectedValue[0] && this.props.timePicker) {
      value = value.clone();
      syncTime(selectedValue[0], value);
    }
    if (this.state.showTimePicker && selectedValue[0]) {
      return selectedValue[0];
    }
    return value;
  },
  getEndValue: function getEndValue() {
    var _state4 = this.state,
        value = _state4.value,
        selectedValue = _state4.selectedValue,
        showTimePicker = _state4.showTimePicker;

    var endValue = value[1] ? value[1].clone() : value[0].clone().add(1, 'month');
    // keep selectedTime when select date
    if (selectedValue[1] && this.props.timePicker) {
      syncTime(selectedValue[1], endValue);
    }
    if (showTimePicker) {
      return selectedValue[1] ? selectedValue[1] : this.getStartValue();
    }
    return endValue;
  },

  // get disabled hours for second picker
  getEndDisableTime: function getEndDisableTime() {
    var _state5 = this.state,
        selectedValue = _state5.selectedValue,
        value = _state5.value;
    var disabledTime = this.props.disabledTime;

    var userSettingDisabledTime = disabledTime(selectedValue, 'end') || {};
    var startValue = selectedValue && selectedValue[0] || value[0].clone();
    // if startTime and endTime is same day..
    // the second time picker will not able to pick time before first time picker
    if (!selectedValue[1] || startValue.isSame(selectedValue[1], 'day')) {
      var hours = startValue.hour();
      var minutes = startValue.minute();
      var second = startValue.second();
      var _disabledHours = userSettingDisabledTime.disabledHours,
          _disabledMinutes = userSettingDisabledTime.disabledMinutes,
          _disabledSeconds = userSettingDisabledTime.disabledSeconds;

      var oldDisabledMinutes = _disabledMinutes ? _disabledMinutes() : [];
      var olddisabledSeconds = _disabledSeconds ? _disabledSeconds() : [];
      _disabledHours = generateOptions(hours, _disabledHours);
      _disabledMinutes = generateOptions(minutes, _disabledMinutes);
      _disabledSeconds = generateOptions(second, _disabledSeconds);
      return {
        disabledHours: function disabledHours() {
          return _disabledHours;
        },
        disabledMinutes: function disabledMinutes(hour) {
          if (hour === hours) {
            return _disabledMinutes;
          }
          return oldDisabledMinutes;
        },
        disabledSeconds: function disabledSeconds(hour, minute) {
          if (hour === hours && minute === minutes) {
            return _disabledSeconds;
          }
          return olddisabledSeconds;
        }
      };
    }
    return userSettingDisabledTime;
  },
  isAllowedDateAndTime: function isAllowedDateAndTime(selectedValue) {
    return isAllowedDate(selectedValue[0], this.props.disabledDate, this.disabledStartTime) && isAllowedDate(selectedValue[1], this.props.disabledDate, this.disabledEndTime);
  },
  isMonthYearPanelShow: function isMonthYearPanelShow(mode) {
    return ['month', 'year', 'decade'].indexOf(mode) > -1;
  },
  hasSelectedValue: function hasSelectedValue() {
    var selectedValue = this.state.selectedValue;

    return !!selectedValue[1] && !!selectedValue[0];
  },
  compare: function compare(v1, v2) {
    if (this.props.timePicker) {
      return v1.diff(v2);
    }
    return v1.diff(v2, 'days');
  },
  fireSelectValueChange: function fireSelectValueChange(selectedValue, direct) {
    var timePicker = this.props.timePicker;
    var prevSelectedValue = this.state.prevSelectedValue;

    if (timePicker && timePicker.props.defaultValue) {
      var timePickerDefaultValue = timePicker.props.defaultValue;
      if (!prevSelectedValue[0] && selectedValue[0]) {
        syncTime(timePickerDefaultValue[0], selectedValue[0]);
      }
      if (!prevSelectedValue[1] && selectedValue[1]) {
        syncTime(timePickerDefaultValue[1], selectedValue[1]);
      }
    }

    if (!('selectedValue' in this.props)) {
      this.setState({
        selectedValue: selectedValue
      });
    }

    // 尚未选择过时间，直接输入的话
    if (!this.state.selectedValue[0] || !this.state.selectedValue[1]) {
      var startValue = selectedValue[0] || moment();
      var endValue = selectedValue[1] || startValue.clone().add(1, 'months');
      this.setState({
        selectedValue: selectedValue,
        value: getValueFromSelectedValue([startValue, endValue])
      });
    }

    if (selectedValue[0] && !selectedValue[1]) {
      this.setState({ firstSelectedValue: selectedValue[0] });
      this.fireHoverValueChange(selectedValue.concat());
    }
    this.props.onChange(selectedValue);
    if (direct || selectedValue[0] && selectedValue[1]) {
      this.setState({
        prevSelectedValue: selectedValue,
        firstSelectedValue: null
      });
      this.fireHoverValueChange([]);
      this.props.onSelect(selectedValue);
    }
  },
  fireValueChange: function fireValueChange(value) {
    var props = this.props;
    if (!('value' in props)) {
      this.setState({
        value: value
      });
    }
    props.onValueChange(value);
  },
  fireHoverValueChange: function fireHoverValueChange(hoverValue) {
    var props = this.props;
    if (!('hoverValue' in props)) {
      this.setState({ hoverValue: hoverValue });
    }
    props.onHoverChange(hoverValue);
  },
  clear: function clear() {
    this.fireSelectValueChange([], true);
    this.props.onClear();
  },
  disabledStartTime: function disabledStartTime(time) {
    return this.props.disabledTime(time, 'start');
  },
  disabledEndTime: function disabledEndTime(time) {
    return this.props.disabledTime(time, 'end');
  },
  disabledStartMonth: function disabledStartMonth(month) {
    var value = this.state.value;

    return month.isSameOrAfter(value[1], 'month');
  },
  disabledEndMonth: function disabledEndMonth(month) {
    var value = this.state.value;

    return month.isSameOrBefore(value[0], 'month');
  },
  render: function render() {
    var _className, _classnames;

    var props = this.props,
        state = this.state;
    var prefixCls = props.prefixCls,
        dateInputPlaceholder = props.dateInputPlaceholder,
        timePicker = props.timePicker,
        showOk = props.showOk,
        locale = props.locale,
        showClear = props.showClear,
        showToday = props.showToday,
        type = props.type,
        clearIcon = props.clearIcon;
    var hoverValue = state.hoverValue,
        selectedValue = state.selectedValue,
        mode = state.mode,
        showTimePicker = state.showTimePicker;

    var className = (_className = {}, _className[props.className] = !!props.className, _className[prefixCls] = 1, _className[prefixCls + '-hidden'] = !props.visible, _className[prefixCls + '-range'] = 1, _className[prefixCls + '-show-time-picker'] = showTimePicker, _className[prefixCls + '-week-number'] = props.showWeekNumber, _className);
    var classes = classnames(className);
    var newProps = {
      selectedValue: state.selectedValue,
      onSelect: this.onSelect,
      onDayHover: type === 'start' && selectedValue[1] || type === 'end' && selectedValue[0] || !!hoverValue.length ? this.onDayHover : undefined
    };

    var placeholder1 = void 0;
    var placeholder2 = void 0;

    if (dateInputPlaceholder) {
      if (Array.isArray(dateInputPlaceholder)) {
        placeholder1 = dateInputPlaceholder[0];
        placeholder2 = dateInputPlaceholder[1];
      } else {
        placeholder1 = placeholder2 = dateInputPlaceholder;
      }
    }
    var showOkButton = showOk === true || showOk !== false && !!timePicker;
    var cls = classnames((_classnames = {}, _classnames[prefixCls + '-footer'] = true, _classnames[prefixCls + '-range-bottom'] = true, _classnames[prefixCls + '-footer-show-ok'] = showOkButton, _classnames));

    var startValue = this.getStartValue();
    var endValue = this.getEndValue();
    var todayTime = getTodayTime(startValue);
    var thisMonth = todayTime.month();
    var thisYear = todayTime.year();
    var isTodayInView = startValue.year() === thisYear && startValue.month() === thisMonth || endValue.year() === thisYear && endValue.month() === thisMonth;
    var nextMonthOfStart = startValue.clone().add(1, 'months');
    var isClosestMonths = nextMonthOfStart.year() === endValue.year() && nextMonthOfStart.month() === endValue.month();

    // console.warn('Render:', selectedValue.map(t => t.format('YYYY-MM-DD')).join(', '));
    // console.log('start:', startValue.format('YYYY-MM-DD'));
    // console.log('end:', endValue.format('YYYY-MM-DD'));

    return React.createElement('div', {
      ref: this.saveRoot,
      className: classes,
      style: props.style,
      tabIndex: '0',
      onKeyDown: this.onKeyDown
    }, props.renderSidebar(), React.createElement('div', { className: prefixCls + '-panel' }, showClear && selectedValue[0] && selectedValue[1] ? React.createElement('a', {
      role: 'button',
      title: locale.clear,
      onClick: this.clear
    }, clearIcon || React.createElement('span', { className: prefixCls + '-clear-btn' })) : null, React.createElement('div', {
      className: prefixCls + '-date-panel',
      onMouseLeave: type !== 'both' ? this.onDatePanelLeave : undefined,
      onMouseEnter: type !== 'both' ? this.onDatePanelEnter : undefined
    }, React.createElement(CalendarPart, _extends({}, props, newProps, {
      hoverValue: hoverValue,
      direction: 'left',
      disabledTime: this.disabledStartTime,
      disabledMonth: this.disabledStartMonth,
      format: this.getFormat(),
      value: startValue,
      mode: mode[0],
      placeholder: placeholder1,
      onInputSelect: this.onStartInputSelect,
      onValueChange: this.onStartValueChange,
      onPanelChange: this.onStartPanelChange,
      showDateInput: this.props.showDateInput,
      timePicker: timePicker,
      showTimePicker: showTimePicker,
      enablePrev: true,
      enableNext: !isClosestMonths || this.isMonthYearPanelShow(mode[1]),
      clearIcon: clearIcon
    })), React.createElement('span', { className: prefixCls + '-range-middle' }, '~'), React.createElement(CalendarPart, _extends({}, props, newProps, {
      hoverValue: hoverValue,
      direction: 'right',
      format: this.getFormat(),
      timePickerDisabledTime: this.getEndDisableTime(),
      placeholder: placeholder2,
      value: endValue,
      mode: mode[1],
      onInputSelect: this.onEndInputSelect,
      onValueChange: this.onEndValueChange,
      onPanelChange: this.onEndPanelChange,
      showDateInput: this.props.showDateInput,
      timePicker: timePicker,
      showTimePicker: showTimePicker,
      disabledTime: this.disabledEndTime,
      disabledMonth: this.disabledEndMonth,
      enablePrev: !isClosestMonths || this.isMonthYearPanelShow(mode[0]),
      enableNext: true,
      clearIcon: clearIcon
    }))), React.createElement('div', { className: cls }, props.renderFooter(), showToday || props.timePicker || showOkButton ? React.createElement('div', { className: prefixCls + '-footer-btn' }, showToday ? React.createElement(TodayButton, _extends({}, props, {
      disabled: isTodayInView,
      value: state.value[0],
      onToday: this.onToday,
      text: locale.backToToday
    })) : null, props.timePicker ? React.createElement(TimePickerButton, _extends({}, props, {
      showTimePicker: showTimePicker,
      onOpenTimePicker: this.onOpenTimePicker,
      onCloseTimePicker: this.onCloseTimePicker,
      timePickerDisabled: !this.hasSelectedValue() || hoverValue.length
    })) : null, showOkButton ? React.createElement(OkButton, _extends({}, props, {
      onOk: this.onOk,
      okDisabled: !this.isAllowedDateAndTime(selectedValue) || !this.hasSelectedValue() || hoverValue.length
    })) : null) : null)));
  }
});

export default RangeCalendar;