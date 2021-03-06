import React from 'react';
import ReactDOM from 'react-dom';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import moment from 'moment';

var DateInput = createReactClass({
  displayName: 'DateInput',

  propTypes: {
    prefixCls: PropTypes.string,
    timePicker: PropTypes.object,
    value: PropTypes.object,
    disabledTime: PropTypes.any,
    format: PropTypes.string,
    locale: PropTypes.object,
    disabledDate: PropTypes.func,
    onChange: PropTypes.func,
    onClear: PropTypes.func,
    placeholder: PropTypes.string,
    onSelect: PropTypes.func,
    selectedValue: PropTypes.object,
    clearIcon: PropTypes.node
  },

  getInitialState: function getInitialState() {
    var selectedValue = this.props.selectedValue;
    return {
      str: selectedValue && selectedValue.format(this.props.format) || '',
      invalid: false
    };
  },
  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
    this.cachedSelectionStart = this.dateInputInstance.selectionStart;
    this.cachedSelectionEnd = this.dateInputInstance.selectionEnd;
    // when popup show, click body will call this, bug!
    var selectedValue = nextProps.selectedValue;
    this.setState({
      str: selectedValue && selectedValue.format(nextProps.format) || '',
      invalid: false
    });
  },
  componentDidUpdate: function componentDidUpdate() {
    if (!this.state.invalid) {
      this.dateInputInstance.setSelectionRange(this.cachedSelectionStart, this.cachedSelectionEnd);
    }
  },
  onInputChange: function onInputChange(event) {
    var reg = /\d{2}-\d{2}-\d{4}/
    var str = event.target.value;
    var isBuddha = new Date().getFullYear() + (543/2)
    var mo = moment()
    if (reg.test(str) && mo.locale() === 'th') {
      var year = Number(str.split('-')[2])
      year = year > isBuddha ? year - 543 : year
      str = str.split('-')[0] + '-' + str.split('-')[1] + '-' + year
    }
    this.setState({
      str: str
    });
    var value = void 0;
    var _props = this.props,
        disabledDate = _props.disabledDate,
        format = _props.format,
        onChange = _props.onChange;

    if (str) {
      var parsed = moment(str, format, true);
      if (!parsed.isValid()) {
        this.setState({
          invalid: true
        });
        return;
      }
      value = this.props.value.clone();
      value.year(parsed.year()).month(parsed.month()).date(parsed.date()).hour(parsed.hour()).minute(parsed.minute()).second(parsed.second());
      if (value && (!disabledDate || !disabledDate(value))) {
        var originalValue = this.props.selectedValue;
        if (originalValue && value) {
          if (!originalValue.isSame(value)) {
            onChange(value);
          }
        } else if (originalValue !== value) {
          onChange(value);
        }
      } else {
        this.setState({
          invalid: true
        });
        return;
      }
    } else {
      onChange(null);
    }
    this.setState({
      invalid: false
    });
  },
  onClear: function onClear() {
    this.setState({
      str: ''
    });
    this.props.onClear(null);
  },
  getRootDOMNode: function getRootDOMNode() {
    return ReactDOM.findDOMNode(this);
  },
  focus: function focus() {
    if (this.dateInputInstance) {
      this.dateInputInstance.focus();
    }
  },
  saveDateInput: function saveDateInput(dateInput) {
    this.dateInputInstance = dateInput;
  },
  render: function render() {
    var props = this.props;
    var _state = this.state,
        invalid = _state.invalid;
    var bh = props.value.buddha();
    // var str = props.value.locale() === 'th' && _state.str.length >= 10 ? bh.day + '-' + bh.month + '-' + bh.year : _state.str;
    
    var str = _state.str;
    if (props.value.locale() === 'th') {
      if (_state.str.length >= 10) {
        var year = Number(str.split('-')[2])
        var isBuddha = Number(new Date().getFullYear() + (543/2))
        if(year < isBuddha) {
          // str = bh.day + '-' + bh.month + '-' + bh.year
          str = str.split('-')[0] + '-' + str.split('-')[1] + '-' + (Number(str.split('-')[2]) + 543)
        }
      }
    }

    var locale = props.locale,
        prefixCls = props.prefixCls,
        placeholder = props.placeholder,
        clearIcon = props.clearIcon;

    var invalidClass = invalid ? prefixCls + '-input-invalid' : '';

    return React.createElement('div', { className: prefixCls + '-input-wrap' }, React.createElement('div', { className: prefixCls + '-date-input-wrap' }, React.createElement('input', {
      ref: this.saveDateInput,
      className: prefixCls + '-input ' + invalidClass,
      value: str,
      disabled: props.disabled,
      placeholder: placeholder,
      onChange: this.onInputChange
    })), props.showClear ? React.createElement('a', {
      role: 'button',
      title: locale.clear,
      onClick: this.onClear
    }, clearIcon || React.createElement('span', { className: prefixCls + '-clear-btn' })) : null);
  }
});

export default DateInput;